import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { requireApiUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/permissions/rbac";
import { computeAnalyticsSummary } from "@/services/analytics";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiUser();
    const params = request.nextUrl.searchParams;
    const rangeParam = params.get("range") || "30d";
    const workspaceId = params.get("workspaceId");
    const daysWindow = rangeParam === "7d" ? 7 : rangeParam === "90d" ? 90 : 30;

    if (workspaceId) {
      await requireWorkspaceAccess(ctx.user.id, workspaceId, "VIEWER");
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      select: { workspaceId: true },
    });
    const allowedWorkspaceIds = memberships.map((m) => m.workspaceId);

    const targetWorkspaceIds = workspaceId ? [workspaceId] : allowedWorkspaceIds;

    const [activeProjectsCount, tasks] = await Promise.all([
      prisma.project.count({
        where: {
          workspaceId: { in: targetWorkspaceIds },
          status: "ACTIVE",
        },
      }),
      prisma.task.findMany({
        where: {
          project: {
            workspaceId: { in: targetWorkspaceIds },
          },
        },
        select: {
          id: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          projectId: true,
          project: {
            select: { name: true, color: true },
          },
        },
      }),
    ]);

    const summary = computeAnalyticsSummary(
      tasks.map((t) => ({
        id: t.id,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
        projectId: t.projectId,
        projectName: t.project.name,
        projectColor: t.project.color,
      })),
      daysWindow
    );

    return NextResponse.json({
      range: rangeParam,
      activeProjectsCount,
      ...summary,
    });
  } catch (error) {
    return handleApiError(error, "analytics.get.error");
  }
}
