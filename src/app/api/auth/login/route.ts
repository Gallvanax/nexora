import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashPassword, verifyPassword } from "@/lib/auth/crypto";
import { enforceRateLimit, extractClientIp, resetRateLimit } from "@/lib/auth/rate-limit";
import { assertSameOrigin, createUserSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations/auth";

let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("NexoraDummyTimingGuard#2026");
  }
  return dummyHashPromise;
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ip = extractClientIp(request.headers);

    const body = await request.json();
    const parsed = loginSchema.parse(body);

    const rateKey = `login:${ip}:${parsed.email}`;
    await enforceRateLimit({
      key: rateKey,
      limit: 8,
      windowMs: 15 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    });

    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        passwordHash: true,
      },
    });

    const candidateHash = user?.passwordHash ?? (await getDummyHash());
    const valid = await verifyPassword(candidateHash, parsed.password);

    if (!user || !user.passwordHash || !valid) {
      logger.warn("auth.login.failed", { ip });
      throw new UnauthorizedError(
        "Identifiants incorrects. Vérifiez votre e-mail et mot de passe."
      );
    }

    await resetRateLimit(rateKey);
    await createUserSession(user.id);

    logger.info("auth.login.success", { userId: user.id });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    return handleApiError(error, "auth.login.error");
  }
}
