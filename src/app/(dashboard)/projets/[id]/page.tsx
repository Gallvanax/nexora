import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { requireProjectAccess } from "@/lib/permissions/rbac";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePageUser();
  const { id } = await params;

  let access;
  try {
    access = await requireProjectAccess(ctx.user.id, id, "VIEWER");
  } catch {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      workspace: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
      },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
          subtasks: { select: { id: true, isCompleted: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      },
      attachments: {
        include: { uploader: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!project) notFound();
  const myMember = project.members.find((m) => m.userId === ctx.user.id);

  return (
    <ProjectDetailClient
      initialProject={{
        id: project.id,
        workspaceId: project.workspaceId,
        name: project.name,
        description: project.description,
        color: project.color,
        status: project.status,
        deadline: project.deadline?.toISOString() ?? null,
        isFavorite: myMember?.isFavorite ?? false,
        myRole: access.role,
        members: project.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          user: m.user,
        })),
        workspaceMembers: project.workspace.members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
        })),
        tasks: project.tasks.map((t) => ({
          id: t.id,
          code: t.code,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate?.toISOString() ?? null,
          assignee: t.assignee,
          subtasks: t.subtasks,
          _count: t._count,
        })),
        attachments: project.attachments.map((a) => ({
          id: a.id,
          originalName: a.originalName,
          sizeBytes: a.sizeBytes,
          createdAt: a.createdAt.toISOString(),
          uploader: a.uploader,
        })),
        activities: project.activities.map((a) => ({
          id: a.id,
          action: a.action,
          createdAt: a.createdAt.toISOString(),
          actor: a.actor,
        })),
      }}
    />
  );
}
