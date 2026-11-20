import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AppError, handleApiError } from "@/lib/errors";
import { enforceRateLimit, extractClientIp } from "@/lib/auth/rate-limit";
import { assertSameOrigin, requireApiUser } from "@/lib/auth/session";
import { requireProjectAccess, requireTaskAccess } from "@/lib/permissions/rbac";
import { recordActivity } from "@/services/activity";
import { savePrivateFile, validateUploadedFile } from "@/services/storage";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ctx = await requireApiUser();
    const ip = extractClientIp(request.headers);

    await enforceRateLimit({
      key: `upload:${ctx.user.id}:${ip}`,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    const formData = await request.formData();
    const file = formData.get("file");
    const taskId = formData.get("taskId")?.toString().trim() || null;
    const projectIdInput = formData.get("projectId")?.toString().trim() || null;

    if (!(file instanceof File)) {
      throw new AppError("Aucun fichier reçu.", 400, "MISSING_FILE");
    }

    if (!taskId && !projectIdInput) {
      throw new AppError("Identifiant de projet ou de tâche requis.", 400);
    }

    let projectId = projectIdInput;
    let workspaceId = "";

    if (taskId) {
      const access = await requireTaskAccess(ctx.user.id, taskId, "MEMBER");
      projectId = access.project.id;
      workspaceId = access.project.workspaceId;
    } else if (projectId) {
      const access = await requireProjectAccess(ctx.user.id, projectId, "MEMBER");
      workspaceId = access.project.workspaceId;
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { safeName, extension } = validateUploadedFile(
      file.name,
      file.type || "application/octet-stream",
      buffer
    );

    const storageKey = await savePrivateFile(buffer, file.type, extension);

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        projectId,
        uploaderId: ctx.user.id,
        originalName: safeName,
        storageKey,
        mimeType: file.type,
        sizeBytes: buffer.byteLength,
      },
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    await recordActivity({
      workspaceId,
      projectId,
      taskId,
      actorId: ctx.user.id,
      action: "attachment.uploaded",
      entityType: "ATTACHMENT",
      entityId: attachment.id,
      details: { fileName: safeName, sizeBytes: buffer.byteLength },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "attachments.upload.error");
  }
}
