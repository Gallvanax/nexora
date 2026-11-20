import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { TasksClient } from "@/components/tasks/tasks-client";

export default async function TasksPage() {
  const ctx = await requirePageUser();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: ctx.user.id },
    select: { workspaceId: true },
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  const [projects, tasks, wsMembers] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId: { in: workspaceIds }, status: { not: "ARCHIVED" } },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { project: { workspaceId: { in: workspaceIds } } },
      include: {
        project: { select: { name: true, color: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: { in: workspaceIds } },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const uniqueMembers = Array.from(
    new Map(wsMembers.map((m) => [m.user.id, { userId: m.user.id, name: m.user.name }])).values()
  );

  return (
    <Suspense fallback={<div className="h-64 rounded-2xl nexora-card animate-pulse" />}>
      <TasksClient
        currentUserId={ctx.user.id}
        projects={projects}
        members={uniqueMembers}
        initialTasks={tasks.map((t) => ({
          id: t.id,
          code: t.code,
          projectId: t.projectId,
          projectName: t.project.name,
          projectColor: t.project.color,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate?.toISOString() ?? null,
          assigneeId: t.assigneeId,
          assigneeName: t.assignee?.name ?? null,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </Suspense>
  );
}
