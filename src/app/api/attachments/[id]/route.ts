import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ForbiddenError, handleApiError, NotFoundError } from "@/lib/errors";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireProjectAccess, requireTaskAccess } from "@/lib/permissions/rbac";
import { deletePrivateFile, readPrivateFile } from "@/services/storage";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireApiUser();
    const { id } = await context.params;

    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      throw new NotFoundError("Pièce jointe introuvable.");
    }

    if (attachment.taskId) {
      await requireTaskAccess(ctx.user.id, attachment.taskId, "VIEWER");
    } else if (attachment.projectId) {
      await requireProjectAccess(ctx.user.id, attachment.projectId, "VIEWER");
    } else if (attachment.uploaderId !== ctx.user.id) {
      throw new ForbiddenError();
    }

    const bytes = await readPrivateFile(attachment.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${attachment.originalName.replaceAll('"', "")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, "attachments.download.error");
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const { id } = await context.params;

    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      throw new NotFoundError("Pièce jointe introuvable.");
    }

    if (attachment.taskId) {
      await requireTaskAccess(ctx.user.id, attachment.taskId, "MEMBER");
    } else if (attachment.projectId) {
      await requireProjectAccess(ctx.user.id, attachment.projectId, "MEMBER");
    } else if (attachment.uploaderId !== ctx.user.id) {
      throw new ForbiddenError();
    }

    await prisma.attachment.delete({ where: { id } });
    await deletePrivateFile(attachment.storageKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "attachments.delete.error");
  }
}
