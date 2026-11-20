import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { requireApiUser } from "@/lib/auth/session";

function maskIp(ip: string | null): string {
  if (!ip) return "Inconnue";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip.slice(0, 14) + "…";
}

export async function GET() {
  try {
    const ctx = await requireApiUser();
    const sessions = await prisma.session.findMany({
      where: {
        userId: ctx.user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent ?? "Navigateur Web",
        ipAddress: maskIp(s.ipAddress),
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: s.id === ctx.session.id,
      })),
    });
  } catch (error) {
    return handleApiError(error, "auth.sessions.list.error");
  }
}
