import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/permissions/rbac";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id, invitationId } = await context.params;
    await requireWorkspaceAccess(ctx.user.id, id, "ADMIN");

    const updated = await prisma.workspaceInvitation.updateMany({
      where: {
        id: invitationId,
        workspaceId: id,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

    if (updated.count === 0) {
      throw new NotFoundError("Invitation introuvable.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "workspaces.invitation.revoke.error");
  }
}
