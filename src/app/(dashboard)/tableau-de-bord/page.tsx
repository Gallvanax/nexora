import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { computeAnalyticsSummary } from "@/services/analytics";
import { OverviewClient } from "@/components/dashboard/overview-client";

export default async function DashboardOverviewPage() {
  const ctx = await requirePageUser();

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: ctx.user.id },
    select: { workspaceId: true },
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [projects, tasks, activities, eventsThisMonth] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId: { in: workspaceIds } },
      include: {
        members: { where: { userId: ctx.user.id } },
        tasks: { select: { status: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { project: { workspaceId: { in: workspaceIds } } },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    }),
    prisma.activityLog.findMany({
      where: { workspaceId: { in: workspaceIds } },
      include: {
        actor: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.event.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        startAt: { gte: monthStart, lte: monthEnd },
      },
      select: { startAt: true },
    }),
  ]);

  const analytics = computeAnalyticsSummary(
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
    30,
    now
  );

  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const totalAllTasks = tasks.length;
  const completedAllTasks = tasks.filter((t) => t.status === "DONE").length;
  const globalProgress =
    totalAllTasks > 0 ? Math.round((completedAllTasks / totalAllTasks) * 100) : 0;

  const calendarDaysSet = new Set<number>();
  for (const e of eventsThisMonth) calendarDaysSet.add(e.startAt.getDate());
  for (const t of tasks) {
    if (t.dueDate && t.dueDate >= monthStart && t.dueDate <= monthEnd) {
      calendarDaysSet.add(t.dueDate.getDate());
    }
  }

  const favoriteProjects = projects
    .filter((p) => p.members.some((m) => m.isFavorite))
    .slice(0, 5)
    .map((p) => {
      const total = p.tasks.length;
      const done = p.tasks.filter((t) => t.status === "DONE").length;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        totalTasks: total,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

  const priorityTasks = tasks
    .filter((t) => t.status !== "DONE")
    .slice(0, 6)
    .map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() ?? null,
      projectId: t.projectId,
      projectName: t.project.name,
      projectColor: t.project.color,
    }));

  const upcomingDeadlines = tasks
    .filter((t) => t.status !== "DONE" && t.dueDate && t.dueDate >= now)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      dueDate: t.dueDate!.toISOString(),
      projectId: t.projectId,
      projectName: t.project.name,
    }));

  return (
    <OverviewClient
      data={{
        userName: ctx.user.name,
        emailVerified: Boolean(ctx.user.emailVerified),
        stats: {
          activeProjects,
          inProgressTasks: tasks.filter((t) => t.status === "IN_PROGRESS").length,
          completedTasks: analytics.completedTasks,
          dueSoonCount: analytics.dueSoonCount,
          globalProgress,
        },
        analytics,
        priorityTasks,
        upcomingDeadlines,
        favoriteProjects,
        recentActivities: activities.map((a) => ({
          id: a.id,
          action: a.action,
          actorName: a.actor?.name ?? "Système",
          createdAt: a.createdAt.toISOString(),
          projectName: a.project?.name ?? null,
        })),
        calendarDaysWithItems: Array.from(calendarDaysSet),
      }}
    />
  );
}
