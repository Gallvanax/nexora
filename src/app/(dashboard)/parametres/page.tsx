import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { SettingsClient } from "@/components/settings/settings-client";

function maskIp(ip: string | null): string {
  if (!ip) return "Inconnue";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip.slice(0, 14) + "…";
}

export default async function SettingsPage() {
  const ctx = await requirePageUser();

  const [userRecord, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { passwordHash: true },
    }),
    prisma.session.findMany({
      where: { userId: ctx.user.id, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: "desc" },
    }),
  ]);

  return (
    <SettingsClient
      initialUser={{
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        jobTitle: ctx.user.jobTitle,
        bio: ctx.user.bio,
        avatarUrl: ctx.user.avatarUrl,
      }}
      initialPreferences={ctx.preferences}
      hasLocalPassword={Boolean(userRecord?.passwordHash)}
      initialSessions={sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent ?? "Navigateur Web",
        ipAddress: maskIp(s.ipAddress),
        lastActiveAt: s.lastActiveAt.toISOString(),
        isCurrent: s.id === ctx.session.id,
      }))}
    />
  );
}
