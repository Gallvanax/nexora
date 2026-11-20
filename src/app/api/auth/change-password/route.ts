import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AppError, handleApiError, UnauthorizedError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/crypto";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { changePasswordSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      throw new AppError(
        "Ce compte utilise une connexion externe sans mot de passe local.",
        400,
        "NO_LOCAL_PASSWORD"
      );
    }

    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) {
      throw new UnauthorizedError("Le mot de passe actuel est incorrect.");
    }

    const nextHash = await hashPassword(newPassword);

    await prisma.$transaction(
      async (tx) => {
        await tx.user.update({
          where: { id: ctx.user.id },
          data: { passwordHash: nextHash },
        });

        // Keep current session, revoke all other sessions
        await tx.session.deleteMany({
          where: {
            userId: ctx.user.id,
            id: { not: ctx.session.id },
          },
        });
      },
      { maxWait: 10_000, timeout: 25_000 }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "auth.change_password.error");
  }
}
