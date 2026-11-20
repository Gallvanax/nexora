import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { GoalsClient } from "@/components/goals/goals-client";

export default async function GoalsPage() {
  const ctx = await requirePageUser();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: ctx.user.id },
    select: { workspaceId: true },
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  const [goals, projects] = await Promise.all([
    prisma.goal.findMany({
      where: { workspaceId: { in: workspaceIds } },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { workspaceId: { in: workspaceIds }, status: { not: "ARCHIVED" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <GoalsClient
      projects={projects}
      initialGoals={goals.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        currentValue: g.currentValue,
        targetValue: g.targetValue,
        unit: g.unit,
        dueDate: g.dueDate?.toISOString() ?? null,
        status: g.status,
        project: g.project,
      }))}
    />
  );
}
