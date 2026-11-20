import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { AppError, handleApiError, UnauthorizedError } from "@/lib/errors";
import { verifyPassword } from "@/lib/auth/crypto";
import { assertSameOrigin, destroyCurrentSession, requireApiUser } from "@/lib/auth/session";
import { updatePreferencesSchema, updateProfileSchema } from "@/lib/validations/auth";

export async function GET() {
  try {
    const ctx = await requireApiUser();
    return NextResponse.json({
      user: ctx.user,
      preferences: ctx.preferences,
    });
  } catch (error) {
    return handleApiError(error, "profile.get.error");
  }
}

const patchBodySchema = z.object({
  profile: updateProfileSchema.optional(),
  preferences: updatePreferencesSchema.optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = patchBodySchema.parse(body);

    const updated = await prisma.$transaction(
      async (tx) => {
        let user = ctx.user;
        if (parsed.profile) {
          user = await tx.user.update({
            where: { id: ctx.user.id },
            data: {
              name: parsed.profile.name,
              jobTitle: parsed.profile.jobTitle ?? null,
              bio: parsed.profile.bio ?? null,
              avatarUrl: parsed.profile.avatarUrl ?? null,
            },
            select: {
              id: true,
              name: true,
              email: true,
              emailVerified: true,
              avatarUrl: true,
              jobTitle: true,
              bio: true,
              createdAt: true,
            },
          });
        }

        let preferences = ctx.preferences;
        if (parsed.preferences) {
          const upserted = await tx.userPreference.upsert({
            where: { userId: ctx.user.id },
            create: {
              userId: ctx.user.id,
              ...parsed.preferences,
            },
            update: parsed.preferences,
          });
          preferences = {
            theme: upserted.theme,
            language: upserted.language,
            timezone: upserted.timezone,
            defaultProjectView: upserted.defaultProjectView,
            emailNotifications: upserted.emailNotifications,
            dueSoonReminders: upserted.dueSoonReminders,
            mentionAlerts: upserted.mentionAlerts,
            projectUpdates: upserted.projectUpdates,
          };
        }

        return { user, preferences };
      },
      { maxWait: 10_000, timeout: 25_000 }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, "profile.patch.error");
  }
}

const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmation: z.literal("SUPPRIMER"),
});

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = deleteAccountSchema.parse(body);

    const userRecord = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { passwordHash: true },
    });

    if (userRecord?.passwordHash) {
      if (!parsed.password) {
        throw new AppError("Mot de passe requis pour supprimer le compte.", 400);
      }
      const ok = await verifyPassword(userRecord.passwordHash, parsed.password);
      if (!ok) {
        throw new UnauthorizedError("Mot de passe incorrect.");
      }
    }

    await prisma.$transaction(
      async (tx) => {
        // Delete workspaces solely owned by this user so FK Restrict does not block deletion
        const ownedWorkspaces = await tx.workspace.findMany({
          where: { ownerId: ctx.user.id },
          include: { members: true },
        });

        for (const ws of ownedWorkspaces) {
          const anotherAdmin = ws.members.find(
            (m) => m.userId !== ctx.user.id && (m.role === "ADMIN" || m.role === "MEMBER")
          );
          if (anotherAdmin) {
            await tx.workspace.update({
              where: { id: ws.id },
              data: { ownerId: anotherAdmin.userId },
            });
            await tx.workspaceMember.update({
              where: { id: anotherAdmin.id },
              data: { role: "OWNER" },
            });
          } else {
            await tx.workspace.delete({ where: { id: ws.id } });
          }
        }

        // Reassign any remaining projects owned by user in shared workspaces or delete user-owned projects
        await tx.project.deleteMany({
          where: { ownerId: ctx.user.id },
        });

        await tx.task.deleteMany({
          where: { creatorId: ctx.user.id },
        });

        await tx.user.delete({
          where: { id: ctx.user.id },
        });
      },
      { maxWait: 10_000, timeout: 25_000 }
    );

    await destroyCurrentSession();
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError(error, "profile.delete.error");
  }
}
