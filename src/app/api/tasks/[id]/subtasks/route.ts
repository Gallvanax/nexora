import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireTaskAccess } from "@/lib/permissions/rbac";
import { createSubtaskSchema } from "@/lib/validations/task";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    await requireTaskAccess(ctx.user.id, id, "MEMBER");

    const body = await request.json();
    const parsed = createSubtaskSchema.parse(body);

    const count = await prisma.subtask.count({ where: { taskId: id } });
    const subtask = await prisma.subtask.create({
      data: {
        taskId: id,
        title: parsed.title,
        position: count,
      },
    });

    return NextResponse.json({ subtask }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "subtasks.create.error");
  }
}
