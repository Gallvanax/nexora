import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { AppError, ForbiddenError, handleApiError, NotFoundError } from "@/lib/errors";
import { hashToken } from "@/lib/auth/crypto";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { recordActivity } from "@/services/activity";

export async function GET() {
  try {
    const ctx = await requireApiUser();
    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        email: ctx.user.email,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: {
        workspace: { select: { id: true, name: true, description: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    return handleApiError(error, "invitations.list.error");
  }
}

const respondSchema = z.object({
  invitationId: z.string().min(1).optional(),
  token: z.string().min(10).optional(),
  decision: z.enum(["accept", "decline"]),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = respondSchema.parse(body);

    const invitation = parsed.token
      ? await prisma.workspaceInvitation.findUnique({
          where: { tokenHash: hashToken(parsed.token) },
        })
      : parsed.invitationId
        ? await prisma.workspaceInvitation.findUnique({
            where: { id: parsed.invitationId },
          })
        : null;

    if (!invitation) {
      throw new NotFoundError("Invitation introuvable.");
    }
    if (invitation.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
      throw new ForbiddenError("Cette invitation ne correspond pas à votre adresse e-mail.");
    }
    if (invitation.status !== "PENDING" || invitation.expiresAt.getTime() <= Date.now()) {
      throw new AppError("Cette invitation n'est plus valide.", 400, "INVITATION_EXPIRED");
    }

    if (parsed.decision === "decline") {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "DECLINED" },
      });
      return NextResponse.json({ status: "DECLINED" });
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.workspaceInvitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" },
        });

        await tx.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: invitation.workspaceId,
              userId: ctx.user.id,
            },
          },
          create: {
            workspaceId: invitation.workspaceId,
            userId: ctx.user.id,
            role: invitation.role,
          },
          update: {
            role: invitation.role,
          },
        });
      },
      { maxWait: 10_000, timeout: 25_000 }
    );

    await recordActivity({
      workspaceId: invitation.workspaceId,
      actorId: ctx.user.id,
      action: "workspace.invitation_accepted",
      entityType: "WORKSPACE",
      entityId: invitation.workspaceId,
    });

    return NextResponse.json({ status: "ACCEPTED", workspaceId: invitation.workspaceId });
  } catch (error) {
    return handleApiError(error, "invitations.respond.error");
  }
}
