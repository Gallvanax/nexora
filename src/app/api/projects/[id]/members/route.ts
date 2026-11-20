import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { AppError, handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireProjectAccess } from "@/lib/permissions/rbac";
import { addProjectMemberSchema } from "@/lib/validations/project";
import { createNotification, recordActivity } from "@/services/activity";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    const access = await requireProjectAccess(ctx.user.id, id, "ADMIN");

    const body = await request.json();
    const parsed = addProjectMemberSchema.parse(body);

    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: access.project.workspaceId,
          userId: parsed.userId,
        },
      },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    if (!workspaceMember) {
      throw new AppError(
        "Cet utilisateur doit d'abord appartenir à l'espace de travail.",
        400,
        "NOT_WORKSPACE_MEMBER"
      );
    }

    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: id, userId: parsed.userId },
      },
      create: {
        projectId: id,
        userId: parsed.userId,
        role: parsed.role,
      },
      update: {
        role: parsed.role,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    if (parsed.userId !== ctx.user.id) {
      await createNotification({
        userId: parsed.userId,
        type: "PROJECT_UPDATED",
        title: `Ajouté au projet ${access.project.name}`,
        message: `${ctx.user.name} vous a donné accès au projet "${access.project.name}".`,
        link: `/projets/${id}`,
      });
    }

    await recordActivity({
      workspaceId: access.project.workspaceId,
      projectId: id,
      actorId: ctx.user.id,
      action: "project.member_updated",
      entityType: "PROJECT",
      entityId: id,
      details: { targetUserId: parsed.userId, role: parsed.role },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "projects.members.post.error");
  }
}

const removeSchema = z.object({ userId: z.string().min(1) });

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    const access = await requireProjectAccess(ctx.user.id, id, "ADMIN");

    const body = await request.json();
    const { userId } = removeSchema.parse(body);

    if (userId === access.project.ownerId) {
      throw new AppError("Le propriétaire du projet ne peut pas être retiré.", 400);
    }

    await prisma.projectMember.deleteMany({
      where: { projectId: id, userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "projects.members.delete.error");
  }
}
