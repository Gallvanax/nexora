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
import { createEventSchema } from "@/lib/validations/calendar";
import { recordActivity } from "@/services/activity";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiUser();
    const params = request.nextUrl.searchParams;
    const workspaceId = params.get("workspaceId");
    const projectId = params.get("projectId");
    const start = params.get("start");
    const end = params.get("end");

    if (projectId) {
      await requireProjectAccess(ctx.user.id, projectId, "VIEWER");
    } else if (workspaceId) {
      await requireWorkspaceAccess(ctx.user.id, workspaceId, "VIEWER");
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      select: { workspaceId: true },
    });
    const allowedWorkspaceIds = memberships.map((m) => m.workspaceId);

    const rangeFilter =
      start && end
        ? {
            startAt: { lte: new Date(end) },
            endAt: { gte: new Date(start) },
          }
        : {};

    const dueRangeFilter =
      start && end
        ? {
            dueDate: {
              gte: new Date(start),
              lte: new Date(end),
            },
          }
        : { dueDate: { not: null } };

    const [events, dueTasks] = await Promise.all([
      prisma.event.findMany({
        where: {
          workspaceId: workspaceId ? workspaceId : { in: allowedWorkspaceIds },
          ...(projectId ? { projectId } : {}),
          ...rangeFilter,
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: { startAt: "asc" },
      }),
      prisma.task.findMany({
        where: {
          project: {
            workspaceId: workspaceId ? workspaceId : { in: allowedWorkspaceIds },
            ...(projectId ? { id: projectId } : {}),
          },
          ...dueRangeFilter,
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    return NextResponse.json({ events, dueTasks });
  } catch (error) {
    return handleApiError(error, "events.list.error");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const body = await request.json();
    const parsed = createEventSchema.parse(body);

    let workspaceId = parsed.workspaceId;
    if (parsed.projectId) {
      const proj = await requireProjectAccess(ctx.user.id, parsed.projectId, "MEMBER");
      workspaceId = proj.project.workspaceId;
    } else if (workspaceId) {
      await requireWorkspaceAccess(ctx.user.id, workspaceId, "MEMBER");
    } else {
      const def = await getUserDefaultWorkspace(ctx.user.id);
      if (!def) {
        return NextResponse.json({ error: "Aucun espace de travail." }, { status: 400 });
      }
      await requireWorkspaceAccess(ctx.user.id, def.workspaceId, "MEMBER");
      workspaceId = def.workspaceId;
    }

    const event = await prisma.event.create({
      data: {
        workspaceId: workspaceId!,
        projectId: parsed.projectId ?? null,
        creatorId: ctx.user.id,
        title: parsed.title,
        description: parsed.description ?? null,
        startAt: new Date(parsed.startAt),
        endAt: new Date(parsed.endAt),
        allDay: parsed.allDay,
        timezone: parsed.timezone,
        recurrence: parsed.recurrence,
        color: parsed.color,
        location: parsed.location ?? null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    await recordActivity({
      workspaceId: event.workspaceId,
      projectId: event.projectId,
      actorId: ctx.user.id,
      action: "event.created",
      entityType: "EVENT",
      entityId: event.id,
      details: { title: event.title },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "events.create.error");
  }
}
