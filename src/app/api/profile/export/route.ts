import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { requireApiUser } from "@/lib/auth/session";

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? "");
  const safe = /^[=+\-@]/.test(str) ? `'${str}` : str; // Neutralize CSV formula injection
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiUser();
    const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    const [projects, tasks, events, goals] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId: { in: workspaceIds } },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          deadline: true,
          createdAt: true,
        },
      }),
      prisma.task.findMany({
        where: { project: { workspaceId: { in: workspaceIds } } },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          loggedMinutes: true,
          createdAt: true,
          project: { select: { name: true } },
        },
      }),
      prisma.event.findMany({
        where: { workspaceId: { in: workspaceIds } },
        select: {
          id: true,
          title: true,
          startAt: true,
          endAt: true,
          timezone: true,
        },
      }),
      prisma.goal.findMany({
        where: { workspaceId: { in: workspaceIds } },
        select: {
          id: true,
          title: true,
          currentValue: true,
          targetValue: true,
          unit: true,
          status: true,
        },
      }),
    ]);

    if (format === "csv") {
      const header = [
        "Code",
        "Projet",
        "Titre",
        "Statut",
        "Priorité",
        "Échéance",
        "Minutes suivies",
        "Créée le",
      ]
        .map(escapeCsvCell)
        .join(",");

      const rows = tasks.map((t) =>
        [
          t.code,
          t.project.name,
          t.title,
          t.status,
          t.priority,
          t.dueDate?.toISOString() ?? "",
          t.loggedMinutes,
          t.createdAt.toISOString(),
        ]
          .map(escapeCsvCell)
          .join(",")
      );

      const csvContent = `\uFEFF${[header, ...rows].join("\n")}`;
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="nexora-export.csv"',
          "Cache-Control": "no-store",
        },
      });
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        jobTitle: ctx.user.jobTitle,
      },
      preferences: ctx.preferences,
      projects,
      tasks,
      events,
      goals,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="nexora-export.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, "profile.export.error");
  }
}
