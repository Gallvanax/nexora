import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AppError, handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireEventAccess } from "@/lib/permissions/rbac";
import { updateEventSchema } from "@/lib/validations/calendar";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    const { event } = await requireEventAccess(ctx.user.id, id, "MEMBER");

    const body = await request.json();
    const parsed = updateEventSchema.parse(body);

    const nextStart = parsed.startAt ? new Date(parsed.startAt) : event.startAt;
    const nextEnd = parsed.endAt ? new Date(parsed.endAt) : event.endAt;
    if (nextEnd.getTime() < nextStart.getTime()) {
      throw new AppError("La date de fin doit être postérieure au début.", 400);
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.projectId !== undefined ? { projectId: parsed.projectId } : {}),
        ...(parsed.startAt !== undefined ? { startAt: nextStart } : {}),
        ...(parsed.endAt !== undefined ? { endAt: nextEnd } : {}),
        ...(parsed.allDay !== undefined ? { allDay: parsed.allDay } : {}),
        ...(parsed.timezone !== undefined ? { timezone: parsed.timezone } : {}),
        ...(parsed.recurrence !== undefined ? { recurrence: parsed.recurrence } : {}),
        ...(parsed.color !== undefined ? { color: parsed.color } : {}),
        ...(parsed.location !== undefined ? { location: parsed.location } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json({ event: updated });
  } catch (error) {
    return handleApiError(error, "events.patch.error");
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;
    await requireEventAccess(ctx.user.id, id, "MEMBER");

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "events.delete.error");
  }
}
