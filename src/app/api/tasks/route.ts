import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireProjectAccess, requireWorkspaceAccess } from "@/lib/permissions/rbac";
import { createTaskSchema } from "@/lib/validations/task";
import { createNotification, recordActivity } from "@/services/activity";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiUser();
    const params = request.nextUrl.searchParams;
    const workspaceId = params.get("workspaceId");
    const projectId = params.get("projectId");
    const status = params.get("status");
    const priority = params.get("priority");
    const assigneeId = params.get("assigneeId");
    const search = params.get("search")?.trim() ?? "";
    const sortBy = params.get("sortBy") || "createdAt";
    const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(params.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") || "50")));

    if (projectId) {
      await requireProjectAccess(ctx.user.id, projectId, "VIEWER");
    } else if (workspaceId) {
      await requireWorkspaceAccess(ctx.user.id, workspaceId, "VIEWER");
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      select: { workspaceId: true },
    });
    const allowedWorkspaceIds = memberships.map((m) => m.workspaceId);

    const where: Prisma.TaskWhereInput = {
      project: {
        workspaceId: workspaceId ? workspaceId : { in: allowedWorkspaceIds },
      },
      ...(projectId ? { projectId } : {}),
      ...(status && ["TODO", "IN_PROGRESS", "ON_HOLD", "DONE"].includes(status)
        ? { status: status as TaskStatus }
        : {}),
      ...(priority && ["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority)
        ? { priority: priority as TaskPriority }
        : {}),
      ...(assigneeId === "me" ? { assigneeId: ctx.user.id } : assigneeId ? { assigneeId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.TaskOrderByWithRelationInput[] =
      sortBy === "dueDate"
        ? [{ dueDate: sortDir }, { position: "asc" }]
        : sortBy === "priority"
          ? [{ priority: sortDir }, { position: "asc" }]
          : sortBy === "position"
            ? [{ position: "asc" }, { createdAt: "desc" }]
            : [{ createdAt: sortDir }];

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, color: true, workspaceId: true } },
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          creator: { select: { id: true, name: true } },
          subtasks: { orderBy: { position: "asc" } },
          labels: { include: { label: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, "tasks.list.error");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = createTaskSchema.parse(body);

    const access = await requireProjectAccess(ctx.user.id, parsed.projectId, "MEMBER");

    const countInProject = await prisma.task.count({
      where: { projectId: parsed.projectId },
    });
    const code = `NX-${countInProject + 1}`;

    if (parsed.assigneeId) {
      const validAssignee = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: access.project.workspaceId,
            userId: parsed.assigneeId,
          },
        },
      });
      if (!validAssignee) {
        return NextResponse.json(
          { error: "Le responsable choisi n'appartient pas à cet espace." },
          { status: 400 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        code,
        projectId: parsed.projectId,
        creatorId: ctx.user.id,
        assigneeId: parsed.assigneeId ?? null,
        title: parsed.title,
        description: parsed.description ?? null,
        status: parsed.status,
        priority: parsed.priority,
        position: countInProject,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        recurrence: parsed.recurrence,
        estimatedMinutes: parsed.estimatedMinutes ?? null,
        completedAt: parsed.status === "DONE" ? new Date() : null,
        ...(parsed.labelIds?.length
          ? {
              labels: {
                create: parsed.labelIds.map((labelId) => ({ labelId })),
              },
            }
          : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true, workspaceId: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        subtasks: true,
        labels: { include: { label: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    if (task.assigneeId && task.assigneeId !== ctx.user.id) {
      await createNotification({
        userId: task.assigneeId,
        type: "TASK_ASSIGNED",
        title: `Nouvelle tâche : ${task.code}`,
        message: `${ctx.user.name} vous a attribué « ${task.title} » dans ${access.project.name}.`,
        link: `/projets/${access.project.id}`,
      });
    }

    await recordActivity({
      workspaceId: access.project.workspaceId,
      projectId: access.project.id,
      taskId: task.id,
      actorId: ctx.user.id,
      action: "task.created",
      entityType: "TASK",
      entityId: task.id,
      details: { code: task.code, title: task.title, status: task.status },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "tasks.create.error");
  }
}
