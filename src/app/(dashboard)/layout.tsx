import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

async function AuthenticatedLayoutInner({ children }: { children: React.ReactNode }) {
  const ctx = await requirePageUser();

  const [memberships, unreadNotifications] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      include: {
        workspace: { select: { id: true, name: true } },
      },
      orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
    }),
    prisma.notification.count({
      where: { userId: ctx.user.id, isRead: false },
    }),
  ]);

  return (
    <DashboardShell
      user={{
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        avatarUrl: ctx.user.avatarUrl,
        emailVerified: ctx.user.emailVerified?.toISOString() ?? null,
      }}
      workspaces={memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        role: m.role,
      }))}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </DashboardShell>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
          Chargement de votre espace NEXORA…
        </div>
      }
    >
      <AuthenticatedLayoutInner>{children}</AuthenticatedLayoutInner>
    </Suspense>
  );
}
