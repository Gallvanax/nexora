import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { requireApiUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiUser();
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q) {
      return NextResponse.json({ projects: [], tasks: [], events: [], goals: [] });
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    const [projects, tasks, events, goals] = await Promise.all([
      prisma.project.findMany({
        where: {
          workspaceId: { in: workspaceIds },
          name: { contains: q, mode: "insensitive" },
        },
        select: { id: true, name: true, color: true, status: true },
        take: 6,
      }),
      prisma.task.findMany({
        where: {
          project: { workspaceId: { in: workspaceIds } },
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          projectId: true,
          project: { select: { name: true } },
        },
        take: 8,
      }),
      prisma.event.findMany({
        where: {
          workspaceId: { in: workspaceIds },
          title: { contains: q, mode: "insensitive" },
        },
        select: { id: true, title: true, startAt: true },
        take: 5,
      }),
      prisma.goal.findMany({
        where: {
          workspaceId: { in: workspaceIds },
          title: { contains: q, mode: "insensitive" },
        },
        select: { id: true, title: true, currentValue: true, targetValue: true, unit: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({ projects, tasks, events, goals });
  } catch (error) {
    return handleApiError(error, "search.get.error");
  }
}
