import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { CalendarClient } from "@/components/calendar/calendar-client";

export default async function CalendarPage() {
  const ctx = await requirePageUser();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: ctx.user.id },
    select: { workspaceId: true },
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  const [events, dueTasks, projects] = await Promise.all([
    prisma.event.findMany({
      where: { workspaceId: { in: workspaceIds } },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.task.findMany({
      where: {
        project: { workspaceId: { in: workspaceIds } },
        dueDate: { not: null },
      },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.project.findMany({
      where: { workspaceId: { in: workspaceIds }, status: { not: "ARCHIVED" } },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <CalendarClient
      defaultTimezone={ctx.preferences.timezone}
      projects={projects}
      initialEvents={events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt.toISOString(),
        allDay: e.allDay,
        timezone: e.timezone,
        recurrence: e.recurrence,
        color: e.color,
        location: e.location,
        projectId: e.projectId,
        project: e.project,
      }))}
      initialDueTasks={dueTasks.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate!.toISOString(),
        project: t.project,
      }))}
    />
  );
}
