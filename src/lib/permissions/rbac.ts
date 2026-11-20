import type { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { hasMinimumRole, maxRole, ROLE_RANK } from "@/lib/permissions/roles";

export { ROLE_RANK, hasMinimumRole, maxRole };

export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string,
  minRole: WorkspaceRole = "VIEWER"
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    include: {
      workspace: true,
    },
  });

  if (!membership) {
    // Do not distinguish "does not exist" vs "not a member" to prevent ID enumeration (IDOR).
    throw new NotFoundError("Espace de travail introuvable ou accès refusé.");
  }

  if (!hasMinimumRole(membership.role, minRole)) {
    throw new ForbiddenError(
      "Votre rôle dans cet espace de travail ne permet pas cette opération."
    );
  }

  return membership;
}

export async function requireProjectAccess(
  userId: string,
  projectId: string,
  minRole: WorkspaceRole = "VIEWER"
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { where: { userId } },
      workspace: {
        include: {
          members: { where: { userId } },
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundError("Projet introuvable ou accès refusé.");
  }

  const workspaceRole = project.workspace.members[0]?.role ?? null;
  const projectRole = project.members[0]?.role ?? null;

  // User must belong either to the project directly OR to its workspace.
  const effectiveRole = project.ownerId === userId ? "OWNER" : maxRole(workspaceRole, projectRole);

  if (!effectiveRole) {
    throw new NotFoundError("Projet introuvable ou accès refusé.");
  }

  if (!hasMinimumRole(effectiveRole, minRole)) {
    throw new ForbiddenError("Permissions insuffisantes sur ce projet.");
  }

  return {
    project,
    role: effectiveRole,
    workspaceRole,
    projectRole,
  };
}

export async function requireTaskAccess(
  userId: string,
  taskId: string,
  minRole: WorkspaceRole = "VIEWER"
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      creatorId: true,
      assigneeId: true,
      title: true,
      status: true,
      priority: true,
      project: {
        select: {
          id: true,
          workspaceId: true,
          name: true,
        },
      },
    },
  });

  if (!task) {
    throw new NotFoundError("Tâche introuvable ou accès refusé.");
  }

  const projectCtx = await requireProjectAccess(userId, task.projectId, minRole);
  return {
    task,
    ...projectCtx,
  };
}

export async function requireEventAccess(
  userId: string,
  eventId: string,
  minRole: WorkspaceRole = "VIEWER"
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new NotFoundError("Événement introuvable ou accès refusé.");
  }

  const membership = await requireWorkspaceAccess(userId, event.workspaceId, minRole);
  return { event, role: membership.role };
}

export async function requireGoalAccess(
  userId: string,
  goalId: string,
  minRole: WorkspaceRole = "VIEWER"
) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw new NotFoundError("Objectif introuvable ou accès refusé.");
  }

  const membership = await requireWorkspaceAccess(userId, goal.workspaceId, minRole);
  return { goal, role: membership.role };
}

export async function getUserDefaultWorkspace(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
    include: {
      workspace: true,
    },
  });
  return membership;
}
