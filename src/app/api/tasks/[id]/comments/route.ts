import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireTaskAccess } from "@/lib/permissions/rbac";
import { createCommentSchema } from "@/lib/validations/task";
import { createNotification, recordActivity } from "@/services/activity";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    const access = await requireTaskAccess(ctx.user.id, id, "MEMBER");

    const body = await request.json();
    const { content } = createCommentSchema.parse(body);

    const comment = await prisma.comment.create({
      data: {
        taskId: id,
        authorId: ctx.user.id,
        content,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const recipientIds = new Set<string>();
    if (access.task.creatorId !== ctx.user.id) recipientIds.add(access.task.creatorId);
    if (access.task.assigneeId && access.task.assigneeId !== ctx.user.id) {
      recipientIds.add(access.task.assigneeId);
    }

    await Promise.all([
      ...Array.from(recipientIds).map((uid) =>
        createNotification({
          userId: uid,
          type: "NEW_COMMENT",
          title: `Nouveau commentaire sur ${access.task.title}`,
          message: `${ctx.user.name} a commenté : « ${content.slice(0, 90)}${content.length > 90 ? "…" : ""} »`,
          link: `/projets/${access.project.id}`,
        })
      ),
      recordActivity({
        workspaceId: access.project.workspaceId,
        projectId: access.project.id,
        taskId: id,
        actorId: ctx.user.id,
        action: "comment.created",
        entityType: "COMMENT",
        entityId: comment.id,
      }),
    ]);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "comments.create.error");
  }
}
