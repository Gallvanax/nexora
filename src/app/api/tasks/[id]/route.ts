import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { RecurrenceType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireTaskAccess } from "@/lib/permissions/rbac";
import { updateTaskSchema } from "@/lib/validations/task";
import { createNotification, recordActivity } from "@/services/activity";

function computeNextRecurrenceDate(base: Date, recurrence: RecurrenceType): Date {
  const next = new Date(base);
  if (recurrence === "DAILY") next.setDate(next.getDate() + 1);
  if (recurrence === "WEEKLY") next.setDate(next.getDate() + 7);
  if (recurrence === "MONTHLY") next.setMonth(next.getMonth() + 1);
  return next;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireApiUser();
    const { id } = await context.params;
    await requireTaskAccess(ctx.user.id, id, "VIEWER");

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            workspaceId: true,
          },
        },
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        subtasks: { orderBy: { position: "asc" } },
        comments: {
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          include: {
            uploader: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        labels: { include: { label: true } },
        activities: {
          include: {
            actor: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error, "tasks.get.error");
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    const access = await requireTaskAccess(ctx.user.id, id, "MEMBER");

    const body = await request.json();
    const parsed = updateTaskSchema.parse(body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    }

    const nextStatus = parsed.status ?? existing.status;
    const completedAt =
      parsed.status === "DONE" && existing.status !== "DONE"
        ? new Date()
        : parsed.status && parsed.status !== "DONE"
          ? null
          : existing.completedAt;

    const needsTransaction =
      Boolean(parsed.labelIds) ||
      (parsed.status === "DONE" &&
        existing.status !== "DONE" &&
        (parsed.recurrence ?? existing.recurrence) !== "NONE");

    const updateData = {
      ...(parsed.title !== undefined ? { title: parsed.title } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.status !== undefined ? { status: parsed.status, completedAt } : {}),
      ...(parsed.priority !== undefined ? { priority: parsed.priority } : {}),
      ...(parsed.position !== undefined ? { position: parsed.position } : {}),
      ...(parsed.assigneeId !== undefined ? { assigneeId: parsed.assigneeId } : {}),
      ...(parsed.dueDate !== undefined
        ? { dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null }
        : {}),
      ...(parsed.recurrence !== undefined ? { recurrence: parsed.recurrence } : {}),
      ...(parsed.estimatedMinutes !== undefined
        ? { estimatedMinutes: parsed.estimatedMinutes }
        : {}),
      ...(parsed.loggedMinutes !== undefined ? { loggedMinutes: parsed.loggedMinutes } : {}),
    };

    const taskInclude = {
      project: { select: { id: true, name: true, color: true, workspaceId: true } },
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      subtasks: { orderBy: { position: "asc" as const } },
      labels: { include: { label: true } },
      _count: { select: { comments: true, attachments: true } },
    };

    const updated = needsTransaction
      ? await prisma.$transaction(
          async (tx) => {
            if (parsed.labelIds) {
              await tx.taskLabel.deleteMany({ where: { taskId: id } });
              if (parsed.labelIds.length > 0) {
                await tx.taskLabel.createMany({
                  data: parsed.labelIds.map((labelId) => ({ taskId: id, labelId })),
                });
              }
            }

            const task = await tx.task.update({
              where: { id },
              data: updateData,
              include: taskInclude,
            });

            if (
              parsed.status === "DONE" &&
              existing.status !== "DONE" &&
              task.recurrence !== "NONE"
            ) {
              const count = await tx.task.count({ where: { projectId: task.projectId } });
              const nextDue = computeNextRecurrenceDate(
                task.dueDate ?? new Date(),
                task.recurrence
              );
              await tx.task.create({
                data: {
                  code: `NX-${count + 1}`,
                  projectId: task.projectId,
                  creatorId: ctx.user.id,
                  assigneeId: task.assigneeId,
                  title: task.title,
                  description: task.description,
                  status: "TODO",
                  priority: task.priority,
                  position: count,
                  dueDate: nextDue,
                  recurrence: task.recurrence,
                  estimatedMinutes: task.estimatedMinutes,
                },
              });
            }

            return task;
          },
          { maxWait: 10_000, timeout: 25_000 }
        )
      : await prisma.task.update({
          where: { id },
          data: updateData,
          include: taskInclude,
        });

    if (parsed.status && parsed.status !== existing.status) {
      await recordActivity({
        workspaceId: access.project.workspaceId,
        projectId: access.project.id,
        taskId: id,
        actorId: ctx.user.id,
        action: "task.status_changed",
        entityType: "TASK",
        entityId: id,
        details: { from: existing.status, to: nextStatus },
      });

      if (nextStatus === "DONE" && existing.creatorId !== ctx.user.id) {
        await createNotification({
          userId: existing.creatorId,
          type: "TASK_COMPLETED",
          title: `Tâche terminée : ${updated.code}`,
          message: `${ctx.user.name} a terminé « ${updated.title} ».`,
          link: `/projets/${updated.projectId}`,
        });
      }
    } else {
      await recordActivity({
        workspaceId: access.project.workspaceId,
        projectId: access.project.id,
        taskId: id,
        actorId: ctx.user.id,
        action: "task.updated",
        entityType: "TASK",
        entityId: id,
        details: { title: updated.title },
      });
    }

    if (
      parsed.assigneeId &&
      parsed.assigneeId !== existing.assigneeId &&
      parsed.assigneeId !== ctx.user.id
    ) {
      await createNotification({
        userId: parsed.assigneeId,
        type: "TASK_ASSIGNED",
        title: `Tâche attribuée : ${updated.code}`,
        message: `${ctx.user.name} vous a attribué « ${updated.title} ».`,
        link: `/projets/${updated.projectId}`,
      });
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    return handleApiError(error, "tasks.patch.error");
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    const access = await requireTaskAccess(ctx.user.id, id, "MEMBER");

    await prisma.task.delete({ where: { id } });

    await recordActivity({
      workspaceId: access.project.workspaceId,
      projectId: access.project.id,
      actorId: ctx.user.id,
      action: "task.deleted",
      entityType: "TASK",
      entityId: id,
      details: { title: access.task.title },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "tasks.delete.error");
  }
}
