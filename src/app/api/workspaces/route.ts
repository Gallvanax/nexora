import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { generateSecureToken } from "@/lib/auth/crypto";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { createWorkspaceSchema } from "@/lib/validations/workspace";
import { recordActivity } from "@/services/activity";

export async function GET() {
  try {
    const ctx = await requireApiUser();
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true, projects: true },
            },
          },
        },
      },
      orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
    });

    return NextResponse.json({
      workspaces: memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        description: m.workspace.description,
        role: m.role,
        memberCount: m.workspace._count.members,
        projectCount: m.workspace._count.projects,
        createdAt: m.workspace.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error, "workspaces.list.error");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = createWorkspaceSchema.parse(body);

    const base = slugify(parsed.name) || "espace";
    const suffix = generateSecureToken(3)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 6);
    const slug = `${base}-${suffix}`;

    const workspace = await prisma.workspace.create({
      data: {
        name: parsed.name,
        slug,
        description: parsed.description ?? null,
        ownerId: ctx.user.id,
        members: {
          create: {
            userId: ctx.user.id,
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

    await recordActivity({
      workspaceId: workspace.id,
      actorId: ctx.user.id,
      action: "workspace.created",
      entityType: "WORKSPACE",
      entityId: workspace.id,
      details: { name: workspace.name },
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "workspaces.create.error");
  }
}
