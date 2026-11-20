import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { getUserDefaultWorkspace, requireWorkspaceAccess } from "@/lib/permissions/rbac";
import { createProjectSchema } from "@/lib/validations/project";
import { recordActivity } from "@/services/activity";
import { getProjectTemplate } from "@/services/project-templates";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiUser();
    const params = request.nextUrl.searchParams;
    const workspaceId = params.get("workspaceId");
    const status = params.get("status");
    const search = params.get("search")?.trim() ?? "";
    const favoriteOnly = params.get("favorite") === "true";
    const page = Math.max(1, Number(params.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, Number(params.get("limit") || "24")));

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      select: { workspaceId: true },
    });
    const allowedWorkspaceIds = memberships.map((m) => m.workspaceId);

    if (workspaceId) {
      await requireWorkspaceAccess(ctx.user.id, workspaceId, "VIEWER");
    }

    const where = {
      workspaceId: workspaceId ? workspaceId : { in: allowedWorkspaceIds },
      ...(status && ["ACTIVE", "ARCHIVED", "COMPLETED"].includes(status)
        ? { status: status as "ACTIVE" | "ARCHIVED" | "COMPLETED" }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(favoriteOnly
        ? {
            members: {
              some: { userId: ctx.user.id, isFavorite: true },
            },
          }
        : {}),
    };

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          workspace: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true, avatarUrl: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
          tasks: {
            select: { id: true, status: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const formatted = projects.map((project) => {
      const totalTasks = project.tasks.length;
      const doneTasks = project.tasks.filter((t) => t.status === "DONE").length;
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      const myMember = project.members.find((m) => m.userId === ctx.user.id);

      return {
        id: project.id,
        workspaceId: project.workspaceId,
        workspaceName: project.workspace.name,
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon,
        status: project.status,
        deadline: project.deadline,
        templateKey: project.templateKey,
        owner: project.owner,
        isFavorite: myMember?.isFavorite ?? false,
        memberCount: project.members.length,
        members: project.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          user: m.user,
        })),
        taskStats: {
          total: totalTasks,
          done: doneTasks,
          inProgress: project.tasks.filter((t) => t.status === "IN_PROGRESS").length,
          progress,
        },
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    });

    return NextResponse.json({
      projects: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, "projects.list.error");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = createProjectSchema.parse(body);

    let targetWorkspaceId = parsed.workspaceId;
    if (targetWorkspaceId) {
      await requireWorkspaceAccess(ctx.user.id, targetWorkspaceId, "MEMBER");
    } else {
      const defaultWs = await getUserDefaultWorkspace(ctx.user.id);
      if (!defaultWs) {
        return NextResponse.json({ error: "Aucun espace de travail disponible." }, { status: 400 });
      }
      await requireWorkspaceAccess(ctx.user.id, defaultWs.workspaceId, "MEMBER");
      targetWorkspaceId = defaultWs.workspaceId;
    }

    const template = getProjectTemplate(parsed.templateKey);

    const project = await prisma.$transaction(
      async (tx) => {
        const created = await tx.project.create({
          data: {
            workspaceId: targetWorkspaceId!,
            ownerId: ctx.user.id,
            name: parsed.name,
            description: parsed.description ?? template?.description ?? null,
            color: parsed.color ?? template?.color ?? "#7C3AED",
            icon: parsed.icon ?? template?.icon ?? "folder-kanban",
            deadline: parsed.deadline ? new Date(parsed.deadline) : null,
            templateKey: parsed.templateKey ?? "blank",
            members: {
              create: {
                userId: ctx.user.id,
                role: "OWNER",
                isFavorite: false,
              },
            },
          },
        });

        if (template && template.tasks.length > 0) {
          for (let i = 0; i < template.tasks.length; i++) {
            const item = template.tasks[i];
            await tx.task.create({
              data: {
                code: `NX-${i + 1}`,
                projectId: created.id,
                creatorId: ctx.user.id,
                assigneeId: ctx.user.id,
                title: item.title,
                description: item.description,
                status: item.status,
                priority: item.priority,
                position: i,
                completedAt: item.status === "DONE" ? new Date() : null,
                ...(item.subtasks?.length
                  ? {
                      subtasks: {
                        create: item.subtasks.map((title, idx) => ({
                          title,
                          position: idx,
                        })),
                      },
                    }
                  : {}),
              },
            });
          }
        }

        return created;
      },
      { maxWait: 10_000, timeout: 25_000 }
    );

    await recordActivity({
      workspaceId: project.workspaceId,
      projectId: project.id,
      actorId: ctx.user.id,
      action: "project.created",
      entityType: "PROJECT",
      entityId: project.id,
      details: { name: project.name, template: project.templateKey },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "projects.create.error");
  }
}
