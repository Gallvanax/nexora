import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiUser();
    const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: ctx.user.id,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      prisma.notification.count({
        where: { userId: ctx.user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return handleApiError(error, "notifications.list.error");
  }
}

const patchSchema = z.object({
  id: z.string().min(1).optional(),
  markAllRead: z.boolean().optional(),
  isRead: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = patchSchema.parse(body);

    if (parsed.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: ctx.user.id, isRead: false },
        data: { isRead: true },
      });
    } else if (parsed.id) {
      await prisma.notification.updateMany({
        where: { id: parsed.id, userId: ctx.user.id },
        data: { isRead: parsed.isRead ?? true },
      });
    }

    const unreadCount = await prisma.notification.count({
      where: { userId: ctx.user.id, isRead: false },
    });

    return NextResponse.json({ ok: true, unreadCount });
  } catch (error) {
    return handleApiError(error, "notifications.patch.error");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      await prisma.notification.deleteMany({
        where: { id, userId: ctx.user.id },
      });
    } else {
      await prisma.notification.deleteMany({
        where: { userId: ctx.user.id, isRead: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "notifications.delete.error");
  }
}
