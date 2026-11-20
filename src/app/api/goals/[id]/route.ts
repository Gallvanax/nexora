import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireGoalAccess } from "@/lib/permissions/rbac";
import { updateGoalSchema } from "@/lib/validations/goal";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    const { goal } = await requireGoalAccess(ctx.user.id, id, "MEMBER");

    const body = await request.json();
    const parsed = updateGoalSchema.parse(body);

    const nextCurrent = parsed.currentValue ?? goal.currentValue;
    const nextTarget = parsed.targetValue ?? goal.targetValue;
    const autoCompleted = nextCurrent >= nextTarget ? "COMPLETED" : parsed.status;

    const updated = await prisma.goal.update({
      where: { id },
      data: {
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.projectId !== undefined ? { projectId: parsed.projectId } : {}),
        ...(parsed.targetValue !== undefined ? { targetValue: parsed.targetValue } : {}),
        ...(parsed.currentValue !== undefined ? { currentValue: parsed.currentValue } : {}),
        ...(parsed.unit !== undefined ? { unit: parsed.unit } : {}),
        ...(parsed.dueDate !== undefined
          ? { dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null }
          : {}),
        ...(autoCompleted !== undefined ? { status: autoCompleted } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ goal: updated });
  } catch (error) {
    return handleApiError(error, "goals.patch.error");
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    await requireGoalAccess(ctx.user.id, id, "MEMBER");

    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "goals.delete.error");
  }
}
