import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { getUserDefaultWorkspace, requireWorkspaceAccess } from "@/lib/permissions/rbac";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiUser();
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (workspaceId) {
      await requireWorkspaceAccess(ctx.user.id, workspaceId, "VIEWER");
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      select: { workspaceId: true },
    });

    const labels = await prisma.label.findMany({
      where: {
        workspaceId: workspaceId ? workspaceId : { in: memberships.map((m) => m.workspaceId) },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ labels });
  } catch (error) {
    return handleApiError(error, "labels.list.error");
  }
}

const createLabelSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(32),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#7C3AED"),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = createLabelSchema.parse(body);

    let workspaceId = parsed.workspaceId;
    if (workspaceId) {
      await requireWorkspaceAccess(ctx.user.id, workspaceId, "MEMBER");
    } else {
      const def = await getUserDefaultWorkspace(ctx.user.id);
      if (!def) return NextResponse.json({ error: "Espace requis." }, { status: 400 });
      await requireWorkspaceAccess(ctx.user.id, def.workspaceId, "MEMBER");
      workspaceId = def.workspaceId;
    }

    const label = await prisma.label.upsert({
      where: {
        workspaceId_name: { workspaceId, name: parsed.name },
      },
      create: {
        workspaceId,
        name: parsed.name,
        color: parsed.color,
      },
      update: {
        color: parsed.color,
      },
    });

    return NextResponse.json({ label }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "labels.create.error");
  }
}
