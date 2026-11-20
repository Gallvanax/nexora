import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { AppError, handleApiError } from "@/lib/errors";
import { generateSecureToken, hashToken } from "@/lib/auth/crypto";
import { enforceRateLimit, extractClientIp } from "@/lib/auth/rate-limit";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { buildVerificationEmail, sendTransactionalEmail } from "@/services/email";

const verifyBodySchema = z.object({
  token: z.string().min(16, "Jeton de vérification invalide."),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const { token } = verifyBodySchema.parse(body);

    const tokenHash = hashToken(token);
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.type !== "EMAIL_VERIFY" ||
      record.usedAt !== null ||
      record.expiresAt.getTime() <= Date.now()
    ) {
      throw new AppError("Ce lien de vérification est invalide ou expiré.", 400, "INVALID_TOKEN");
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.verificationToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });

        if (record.userId) {
          await tx.user.update({
            where: { id: record.userId },
            data: { emailVerified: new Date() },
          });
        } else {
          await tx.user.updateMany({
            where: { email: record.email },
            data: { emailVerified: new Date() },
          });
        }
      },
      { maxWait: 10_000, timeout: 25_000 }
    );

    return NextResponse.json({ verified: true });
  } catch (error) {
    return handleApiError(error, "auth.verify_email.error");
  }
}

export async function PUT(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const ip = extractClientIp(request.headers);

    await enforceRateLimit({
      key: `verify-resend:${ctx.user.id}:${ip}`,
      limit: 4,
      windowMs: 15 * 60 * 1000,
    });

    if (ctx.user.emailVerified) {
      return NextResponse.json({ alreadyVerified: true });
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);

    await prisma.verificationToken.create({
      data: {
        userId: ctx.user.id,
        email: ctx.user.email,
        tokenHash,
        type: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${env.appUrl}/verifier-email?token=${encodeURIComponent(rawToken)}`;
    const emailPayload = buildVerificationEmail(ctx.user.name, verifyUrl);
    const emailResult = await sendTransactionalEmail({
      to: ctx.user.email,
      ...emailPayload,
    });

    return NextResponse.json({
      delivered: emailResult.delivered,
      mode: emailResult.mode,
      ...(emailResult.previewUrl ? { previewUrl: emailResult.previewUrl } : {}),
    });
  } catch (error) {
    return handleApiError(error, "auth.verify_resend.error");
  }
}
