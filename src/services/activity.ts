import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function recordActivity(input: {
  workspaceId: string;
  projectId?: string | null;
  taskId?: string | null;
  actorId?: string | null;
  action: string;
  entityType: "PROJECT" | "TASK" | "EVENT" | "GOAL" | "WORKSPACE" | "COMMENT" | "ATTACHMENT";
  entityId: string;
  details?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        taskId: input.taskId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details,
      },
    });
  } catch (error) {
    logger.warn("activity.record_failed", { error, action: input.action });
  }
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    logger.warn("notification.create_failed", { error, type: input.type });
  }
}
