import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { computeAnalyticsSummary } from "@/services/analytics";
import { AnalyticsClient } from "@/components/dashboard/analytics-client";

export default async function AnalyticsPage() {
  const ctx = await requirePageUser();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: ctx.user.id },
    select: { workspaceId: true },
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  const [activeProjectsCount, tasks] = await Promise.all([
    prisma.project.count({
      where: { workspaceId: { in: workspaceIds }, status: "ACTIVE" },
    }),
    prisma.task.findMany({
      where: { project: { workspaceId: { in: workspaceIds } } },
      select: {
        id: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
        projectId: true,
        project: { select: { name: true, color: true } },
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
    30
  );

  return (
    <AnalyticsClient
      initialData={{
        range: "30d",
        activeProjectsCount,
        ...summary,
      }}
    />
  );
}
