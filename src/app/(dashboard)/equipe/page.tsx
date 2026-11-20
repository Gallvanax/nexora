import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { TeamClient } from "@/components/team/team-client";

export default async function TeamPage() {
  const ctx = await requirePageUser();

  const [memberships, receivedInvites] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      include: {
        workspace: { select: { id: true, name: true, description: true } },
      },
      orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
    }),
    prisma.workspaceInvitation.findMany({
      where: {
        email: ctx.user.email,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: {
        workspace: { select: { id: true, name: true, description: true } },
        invitedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <TeamClient
      currentUserId={ctx.user.id}
      initialWorkspaces={memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        description: m.workspace.description,
        role: m.role,
      }))}
      initialReceivedInvites={receivedInvites.map((inv) => ({
        id: inv.id,
        role: inv.role,
        workspace: inv.workspace,
        invitedBy: inv.invitedBy,
      }))}
    />
  );
}
