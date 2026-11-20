import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { ProjectsClient } from "@/components/projects/projects-client";

export default async function ProjectsPage() {
  const ctx = await requirePageUser();

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: ctx.user.id },
    include: { workspace: { select: { id: true, name: true } } },
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  const projects = await prisma.project.findMany({
    where: { workspaceId: { in: workspaceIds } },
    include: {
      workspace: { select: { name: true } },
      members: true,
      tasks: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const formatted = projects.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "DONE").length;
    const myMember = p.members.find((m) => m.userId === ctx.user.id);
    return {
      id: p.id,
      workspaceId: p.workspaceId,
      workspaceName: p.workspace.name,
      name: p.name,
      description: p.description,
      color: p.color,
      icon: p.icon,
      status: p.status,
      deadline: p.deadline?.toISOString() ?? null,
      isFavorite: myMember?.isFavorite ?? false,
      memberCount: p.members.length,
      taskStats: {
        total,
        done,
        inProgress: p.tasks.filter((t) => t.status === "IN_PROGRESS").length,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      },
    };
  });

  return (
    <Suspense fallback={<div className="h-64 rounded-2xl nexora-card animate-pulse" />}>
      <ProjectsClient
        initialProjects={formatted}
        initialView={ctx.preferences.defaultProjectView}
        workspaces={memberships.map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
        }))}
      />
    </Suspense>
  );
}
