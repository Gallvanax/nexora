import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AppError, handleApiError } from "@/lib/errors";
import { hashPassword, hashToken } from "@/lib/auth/crypto";
import { assertSameOrigin } from "@/lib/auth/session";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const tokenHash = hashToken(token);
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.type !== "PASSWORD_RESET" ||
      record.usedAt !== null ||
      record.expiresAt.getTime() <= Date.now() ||
      !record.userId
    ) {
      throw new AppError(
        "Ce lien de réinitialisation est invalide ou a expiré.",
        400,
        "INVALID_RESET_TOKEN"
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(
      async (tx) => {
        await tx.verificationToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });

        await tx.user.update({
          where: { id: record.userId! },
          data: { passwordHash },
        });

        // Revoke all active sessions after password reset for security
        await tx.session.deleteMany({
          where: { userId: record.userId! },
        });
      },
      { maxWait: 10_000, timeout: 25_000 }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "auth.reset_password.error");
  }
}
