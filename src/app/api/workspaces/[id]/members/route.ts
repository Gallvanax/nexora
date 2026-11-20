import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { AppError, ConflictError, handleApiError } from "@/lib/errors";
import { generateSecureToken, hashToken } from "@/lib/auth/crypto";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/permissions/rbac";
import { inviteMemberSchema } from "@/lib/validations/workspace";
import { createNotification, recordActivity } from "@/services/activity";
import { buildInvitationEmail, sendTransactionalEmail } from "@/services/email";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireApiUser();
    const { id } = await context.params;
    await requireWorkspaceAccess(ctx.user.id, id, "VIEWER");

    const [members, invitations] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: { workspaceId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              jobTitle: true,
            },
          },
        },
        orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
      }),
      prisma.workspaceInvitation.findMany({
        where: { workspaceId: id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({ members, invitations });
  } catch (error) {
    return handleApiError(error, "workspaces.members.list.error");
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;

    const membership = await requireWorkspaceAccess(ctx.user.id, id, "ADMIN");

    const body = await request.json();
    const parsed = inviteMemberSchema.parse({ ...body, workspaceId: id });

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: { id: true, name: true },
    });

    if (existingUser) {
      const alreadyMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId: id, userId: existingUser.id },
        },
      });
      if (alreadyMember) {
        throw new ConflictError("Cet utilisateur est déjà membre de cet espace.");
      }
    }

    const existingPending = await prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId: id,
        email: parsed.email,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });
    if (existingPending) {
      throw new ConflictError("Une invitation est déjà en attente pour cette adresse e-mail.");
    }

    const rawToken = generateSecureToken(24);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId: id,
        email: parsed.email,
        role: parsed.role,
        tokenHash,
        invitedById: ctx.user.id,
        expiresAt,
      },
    });

    if (existingUser) {
      await createNotification({
        userId: existingUser.id,
        type: "WORKSPACE_INVITATION",
        title: `Invitation dans ${membership.workspace.name}`,
        message: `${ctx.user.name} vous invite à rejoindre l'espace "${membership.workspace.name}".`,
        link: "/equipe",
        metadata: { invitationId: invitation.id, workspaceId: id },
      });
    }

    const acceptUrl = `${env.appUrl}/equipe?invite=${encodeURIComponent(rawToken)}`;
    const mailPayload = buildInvitationEmail(membership.workspace.name, ctx.user.name, acceptUrl);
    const emailResult = await sendTransactionalEmail({
      to: parsed.email,
      ...mailPayload,
    });

    await recordActivity({
      workspaceId: id,
      actorId: ctx.user.id,
      action: "workspace.member_invited",
      entityType: "WORKSPACE",
      entityId: invitation.id,
      details: { email: parsed.email, role: parsed.role },
    });

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
        emailResult,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AppError) return handleApiError(error);
    return handleApiError(error, "workspaces.invite.error");
  }
}
