import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { handleApiError } from "@/lib/errors";
import { generateSecureToken, hashToken } from "@/lib/auth/crypto";
import { enforceRateLimit, extractClientIp } from "@/lib/auth/rate-limit";
import { assertSameOrigin } from "@/lib/auth/session";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { buildPasswordResetEmail, sendTransactionalEmail } from "@/services/email";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ip = extractClientIp(request.headers);

    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    await enforceRateLimit({
      key: `forgot:${ip}:${email}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    let devPreviewUrl: string | undefined;
    if (user) {
      const rawToken = generateSecureToken(32);
      const tokenHash = hashToken(rawToken);

      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          email: user.email,
          tokenHash,
          type: "PASSWORD_RESET",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 heure
        },
      });

      const resetUrl = `${env.appUrl}/reinitialiser-mot-de-passe?token=${encodeURIComponent(rawToken)}`;
      const payload = buildPasswordResetEmail(user.name, resetUrl);
      const result = await sendTransactionalEmail({
        to: user.email,
        ...payload,
      });
      if (result.previewUrl) {
        devPreviewUrl = result.previewUrl;
      }
    }

    // Always return uniform response to prevent account enumeration
    return NextResponse.json({
      ok: true,
      message:
        "Si un compte correspond à cette adresse e-mail, un lien de réinitialisation a été généré.",
      ...(devPreviewUrl ? { devPreviewUrl } : {}),
    });
  } catch (error) {
    return handleApiError(error, "auth.forgot_password.error");
  }
}
