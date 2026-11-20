import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isGoogleOAuthConfigured } from "@/lib/env";
import { handleApiError } from "@/lib/errors";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const ctx = await getCurrentSession();
    if (!ctx) {
      return NextResponse.json(
        {
          authenticated: false,
          googleConfigured: isGoogleOAuthConfigured(),
        },
        { status: 401 }
      );
    }

    const workspaces = await prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, description: true },
        },
      },
      orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
    });

    return NextResponse.json({
      authenticated: true,
      user: ctx.user,
      preferences: ctx.preferences,
      workspaces: workspaces.map((m) => ({
        ...m.workspace,
        role: m.role,
      })),
      googleConfigured: isGoogleOAuthConfigured(),
    });
  } catch (error) {
    return handleApiError(error, "auth.me.error");
  }
}
