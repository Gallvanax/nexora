import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AppError, ForbiddenError, handleApiError, NotFoundError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/permissions/rbac";
import { updateMemberRoleSchema } from "@/lib/validations/workspace";
import { recordActivity } from "@/services/activity";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id, memberId } = await context.params;
    await requireWorkspaceAccess(ctx.user.id, id, "ADMIN");

    const target = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
    });
    if (!target) {
      throw new NotFoundError("Membre introuvable.");
    }
    if (target.role === "OWNER") {
      throw new ForbiddenError("Le rôle du propriétaire principal ne peut pas être modifié.");
    }

    const body = await request.json();
    const { role } = updateMemberRoleSchema.parse(body);

    const updated = await prisma.workspaceMember.update({
      where: { id: target.id },
      data: { role },
    });

    await recordActivity({
      workspaceId: id,
      actorId: ctx.user.id,
      action: "workspace.member_role_updated",
      entityType: "WORKSPACE",
      entityId: target.id,
      details: { role },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    return handleApiError(error, "workspaces.member.patch.error");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id, memberId } = await context.params;

    const actor = await requireWorkspaceAccess(ctx.user.id, id, "VIEWER");
    const target = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
    });

    if (!target) {
      throw new NotFoundError("Membre introuvable.");
    }

    if (target.role === "OWNER") {
      throw new AppError("Le propriétaire ne peut pas quitter ou être retiré de l'espace.", 400);
    }

    const isSelf = target.userId === ctx.user.id;
    const canRemoveOthers = actor.role === "OWNER" || actor.role === "ADMIN";
    if (!isSelf && !canRemoveOthers) {
      throw new ForbiddenError("Permissions insuffisantes pour retirer ce membre.");
    }

    await prisma.workspaceMember.delete({ where: { id: target.id } });

    await recordActivity({
      workspaceId: id,
      actorId: ctx.user.id,
      action: "workspace.member_removed",
      entityType: "WORKSPACE",
      entityId: target.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "workspaces.member.delete.error");
  }
}
