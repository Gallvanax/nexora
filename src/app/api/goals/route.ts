import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import {
  getUserDefaultWorkspace,
  requireProjectAccess,
  requireWorkspaceAccess,
} from "@/lib/permissions/rbac";
import { createGoalSchema } from "@/lib/validations/goal";
import { recordActivity } from "@/services/activity";

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
    const allowedIds = memberships.map((m) => m.workspaceId);

    const goals = await prisma.goal.findMany({
      where: {
        workspaceId: workspaceId ? workspaceId : { in: allowedIds },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ goals });
  } catch (error) {
    return handleApiError(error, "goals.list.error");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = createGoalSchema.parse(body);

    let workspaceId = parsed.workspaceId;
    if (parsed.projectId) {
      const p = await requireProjectAccess(ctx.user.id, parsed.projectId, "MEMBER");
      workspaceId = p.project.workspaceId;
    } else if (workspaceId) {
      await requireWorkspaceAccess(ctx.user.id, workspaceId, "MEMBER");
    } else {
      const def = await getUserDefaultWorkspace(ctx.user.id);
      if (!def) return NextResponse.json({ error: "Espace introuvable." }, { status: 400 });
      await requireWorkspaceAccess(ctx.user.id, def.workspaceId, "MEMBER");
      workspaceId = def.workspaceId;
    }

    const computedStatus = parsed.currentValue >= parsed.targetValue ? "COMPLETED" : parsed.status;

    const goal = await prisma.goal.create({
      data: {
        workspaceId: workspaceId!,
        projectId: parsed.projectId ?? null,
        ownerId: ctx.user.id,
        title: parsed.title,
        description: parsed.description ?? null,
        targetValue: parsed.targetValue,
        currentValue: parsed.currentValue,
        unit: parsed.unit,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        status: computedStatus,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await recordActivity({
      workspaceId: goal.workspaceId,
      projectId: goal.projectId,
      actorId: ctx.user.id,
      action: "goal.created",
      entityType: "GOAL",
      entityId: goal.id,
      details: { title: goal.title },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "goals.create.error");
  }
}
