import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { ConflictError, handleApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { slugify } from "@/lib/utils";
import { generateSecureToken, hashPassword, hashToken } from "@/lib/auth/crypto";
import { enforceRateLimit, extractClientIp } from "@/lib/auth/rate-limit";
import { assertSameOrigin, createUserSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validations/auth";
import { buildVerificationEmail, sendTransactionalEmail } from "@/services/email";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ip = extractClientIp(request.headers);

    await enforceRateLimit({
      key: `register:${ip}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const parsed = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError("Un compte existe déjà avec cette adresse e-mail.");
    }

    const passwordHash = await hashPassword(parsed.password);
    const workspaceName = parsed.workspaceName || `Espace de ${parsed.name.split(" ")[0]}`;
    const baseSlug = slugify(workspaceName) || "espace-nexora";
    const uniqueSlug = `${baseSlug}-${generateSecureToken(4)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 6)}`;

    const rawVerifyToken = generateSecureToken(32);
    const verifyTokenHash = hashToken(rawVerifyToken);

    const createdUser = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            name: parsed.name,
            email: parsed.email,
            passwordHash,
            preferences: {
              create: {
                theme: "DARK",
                language: "fr",
                timezone: "Europe/Paris",
                defaultProjectView: "GRID",
              },
            },
            verificationTokens: {
              create: {
                email: parsed.email,
                tokenHash: verifyTokenHash,
                type: "EMAIL_VERIFY",
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            },
            notifications: {
              create: {
                type: "SYSTEM",
                title: "Bienvenue sur NEXORA",
                message:
                  "Votre espace de travail est prêt. Créez votre premier projet en moins de trois minutes.",
                link: "/projets",
              },
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
          },
        });

        const workspace = await tx.workspace.create({
          data: {
            name: workspaceName,
            slug: uniqueSlug,
            description: "Votre espace de travail principal NEXORA",
            ownerId: user.id,
            members: {
              create: {
                userId: user.id,
                role: "OWNER",
              },
            },
            labels: {
              createMany: {
                data: [
                  { name: "Urgent", color: "#EF4444" },
                  { name: "Produit", color: "#7C3AED" },
                  { name: "Design", color: "#22D3EE" },
                  { name: "Technique", color: "#3B82F6" },
                ],
              },
            },
          },
        });

        return { user, workspaceId: workspace.id, workspaceName: workspace.name };
      },
      { maxWait: 10_000, timeout: 25_000 }
    );

    await prisma.activityLog
      .create({
        data: {
          workspaceId: createdUser.workspaceId,
          actorId: createdUser.user.id,
          action: "workspace.created",
          entityType: "WORKSPACE",
          entityId: createdUser.workspaceId,
          details: { name: createdUser.workspaceName },
        },
      })
      .catch(() => undefined);

    await createUserSession(createdUser.user.id);

    const verifyUrl = `${env.appUrl}/verifier-email?token=${encodeURIComponent(rawVerifyToken)}`;
    const emailPayload = buildVerificationEmail(createdUser.user.name, verifyUrl);
    const emailResult = await sendTransactionalEmail({
      to: createdUser.user.email,
      ...emailPayload,
    });

    logger.info("auth.register.success", { userId: createdUser.user.id });

    return NextResponse.json(
      {
        user: createdUser.user,
        workspaceId: createdUser.workspaceId,
        emailVerification: {
          delivered: emailResult.delivered,
          mode: emailResult.mode,
          ...(emailResult.previewUrl ? { previewUrl: emailResult.previewUrl } : {}),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "auth.register.error");
  }
}
