import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireProjectAccess } from "@/lib/permissions/rbac";
import { updateProjectSchema } from "@/lib/validations/project";
import { createNotification, recordActivity } from "@/services/activity";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireApiUser();
    const { id } = await context.params;
    const access = await requireProjectAccess(ctx.user.id, id, "VIEWER");

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              },
            },
          },
        },
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, jobTitle: true },
            },
          },
          orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } },
            subtasks: { orderBy: { position: "asc" } },
            labels: { include: { label: true } },
            _count: { select: { comments: true, attachments: true } },
          },
          orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        },
        attachments: {
          include: {
            uploader: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: {
            actor: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    const totalTasks = project.tasks.length;
    const doneTasks = project.tasks.filter((t) => t.status === "DONE").length;
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const myMember = project.members.find((m) => m.userId === ctx.user.id);

    return NextResponse.json({
      project: {
        ...project,
        myRole: access.role,
        isFavorite: myMember?.isFavorite ?? false,
        progress,
      },
    });
  } catch (error) {
    return handleApiError(error, "projects.get.error");
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateProjectSchema.parse(body);

    const isOnlyFavoriteToggle =
      parsed.isFavorite !== undefined && Object.keys(parsed).every((k) => k === "isFavorite");

    const access = await requireProjectAccess(
      ctx.user.id,
      id,
      isOnlyFavoriteToggle ? "VIEWER" : "MEMBER"
    );

    if (parsed.isFavorite !== undefined) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: id, userId: ctx.user.id } },
        create: {
          projectId: id,
          userId: ctx.user.id,
          role: access.role,
          isFavorite: parsed.isFavorite,
        },
        update: {
          isFavorite: parsed.isFavorite,
        },
      });
    }

    const hasProjectChanges =
      parsed.name !== undefined ||
      parsed.description !== undefined ||
      parsed.color !== undefined ||
      parsed.icon !== undefined ||
      parsed.status !== undefined ||
      parsed.deadline !== undefined;

    let updated = access.project;
    if (hasProjectChanges) {
      updated = await prisma.project.update({
        where: { id },
        data: {
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.description !== undefined ? { description: parsed.description } : {}),
          ...(parsed.color !== undefined ? { color: parsed.color } : {}),
          ...(parsed.icon !== undefined ? { icon: parsed.icon } : {}),
          ...(parsed.status !== undefined ? { status: parsed.status } : {}),
          ...(parsed.deadline !== undefined
            ? { deadline: parsed.deadline ? new Date(parsed.deadline) : null }
            : {}),
        },
        include: {
          members: { where: { userId: ctx.user.id } },
          workspace: { include: { members: { where: { userId: ctx.user.id } } } },
        },
      });

      await recordActivity({
        workspaceId: updated.workspaceId,
        projectId: updated.id,
        actorId: ctx.user.id,
        action:
          parsed.status === "ARCHIVED"
            ? "project.archived"
            : parsed.status === "ACTIVE" && access.project.status === "ARCHIVED"
              ? "project.restored"
              : "project.updated",
        entityType: "PROJECT",
        entityId: updated.id,
        details: { name: updated.name, status: updated.status },
      });

      const members = await prisma.projectMember.findMany({
        where: { projectId: id, userId: { not: ctx.user.id } },
        select: { userId: true },
      });
      await Promise.all(
        members.map((m) =>
          createNotification({
            userId: m.userId,
            type: "PROJECT_UPDATED",
            title: `Projet mis à jour : ${updated.name}`,
            message: `${ctx.user.name} a mis à jour le projet "${updated.name}".`,
            link: `/projets/${updated.id}`,
          })
        )
      );
    }

    return NextResponse.json({ project: updated });
  } catch (error) {
    return handleApiError(error, "projects.patch.error");
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    const access = await requireProjectAccess(ctx.user.id, id, "ADMIN");

    await prisma.project.delete({ where: { id } });

    await recordActivity({
      workspaceId: access.project.workspaceId,
      actorId: ctx.user.id,
      action: "project.deleted",
      entityType: "PROJECT",
      entityId: id,
      details: { name: access.project.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "projects.delete.error");
  }
}
