import type { WorkspaceRole } from "@prisma/client";

export const ROLE_RANK: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasMinimumRole(role: WorkspaceRole, minRole: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export function maxRole(a?: WorkspaceRole | null, b?: WorkspaceRole | null): WorkspaceRole | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
}
