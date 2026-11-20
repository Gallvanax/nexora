import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;

    const deleted = await prisma.session.deleteMany({
      where: {
        id,
        userId: ctx.user.id,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundError("Session introuvable.");
    }

    return NextResponse.json({ ok: true, revokedCurrent: id === ctx.session.id });
  } catch (error) {
    return handleApiError(error, "auth.sessions.delete.error");
  }
}
