import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AppError, handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireTaskAccess } from "@/lib/permissions/rbac";
import { bulkTasksSchema } from "@/lib/validations/task";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = bulkTasksSchema.parse(body);

    // Enforce server-side authorization on every selected task
    await Promise.all(
      parsed.taskIds.map((taskId) => requireTaskAccess(ctx.user.id, taskId, "MEMBER"))
    );

    if (parsed.action === "DELETE") {
      await prisma.task.deleteMany({
        where: { id: { in: parsed.taskIds } },
      });
      return NextResponse.json({ ok: true, count: parsed.taskIds.length });
    }

    if (parsed.action === "STATUS") {
      if (!parsed.status) throw new AppError("Statut requis.", 400);
      await prisma.task.updateMany({
        where: { id: { in: parsed.taskIds } },
        data: {
          status: parsed.status,
          completedAt: parsed.status === "DONE" ? new Date() : null,
        },
      });
      return NextResponse.json({ ok: true, count: parsed.taskIds.length });
    }

    if (parsed.action === "PRIORITY") {
      if (!parsed.priority) throw new AppError("Priorité requise.", 400);
      await prisma.task.updateMany({
        where: { id: { in: parsed.taskIds } },
        data: { priority: parsed.priority },
      });
      return NextResponse.json({ ok: true, count: parsed.taskIds.length });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "tasks.bulk.error");
  }
}
