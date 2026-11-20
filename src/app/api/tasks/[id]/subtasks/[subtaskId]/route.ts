import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireTaskAccess } from "@/lib/permissions/rbac";
import { updateSubtaskSchema } from "@/lib/validations/task";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id, subtaskId } = await context.params;
    await requireTaskAccess(ctx.user.id, id, "MEMBER");

    const existing = await prisma.subtask.findFirst({
      where: { id: subtaskId, taskId: id },
    });
    if (!existing) {
      throw new NotFoundError("Sous-tâche introuvable.");
    }

    const body = await request.json();
    const parsed = updateSubtaskSchema.parse(body);

    const subtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: parsed,
    });

    return NextResponse.json({ subtask });
  } catch (error) {
    return handleApiError(error, "subtasks.patch.error");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id, subtaskId } = await context.params;
    await requireTaskAccess(ctx.user.id, id, "MEMBER");

    const deleted = await prisma.subtask.deleteMany({
      where: { id: subtaskId, taskId: id },
    });
    if (deleted.count === 0) {
      throw new NotFoundError("Sous-tâche introuvable.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "subtasks.delete.error");
  }
}
