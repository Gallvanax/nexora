import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env, isS3Configured } from "@/lib/env";
import { AppError } from "@/lib/errors";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 Mo

const ALLOWED_MIME_TYPES = new Map<string, string[]>([
  ["image/png", [".png"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/webp", [".webp"]],
  ["application/pdf", [".pdf"]],
  ["text/plain", [".txt", ".md", ".log"]],
  ["text/csv", [".csv"]],
  ["application/json", [".json"]],
]);

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

function getS3Client(): S3Client {
  return new S3Client({
    region: env.s3Region,
    ...(env.s3Endpoint ? { endpoint: env.s3Endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: env.s3AccessKeyId,
      secretAccessKey: env.s3SecretAccessKey,
    },
  });
}

function checkMagicBytes(mimeType: string, buffer: Buffer): boolean {
  if (buffer.length < 4) return mimeType.startsWith("text/") || mimeType === "application/json";

  if (mimeType === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 4).toString("ascii") === "%PDF";
  }
  // Plain text / CSV / JSON must not contain NUL bytes
  return !buffer.includes(0x00);
}

export function sanitizeFilename(name: string): string {
  const base = path
    .basename(name)
    .replace(/[^\w.\-() ]+/g, "_")
    .trim();
  return (base || "fichier").slice(0, 120);
}

export function validateUploadedFile(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): { safeName: string; extension: string } {
  if (buffer.byteLength === 0) {
    throw new AppError("Le fichier est vide.", 400, "EMPTY_FILE");
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new AppError("Fichier trop volumineux (max 10 Mo).", 413, "FILE_TOO_LARGE");
  }

  const normalizedMime = mimeType.toLowerCase().split(";")[0].trim();
  const allowedExts = ALLOWED_MIME_TYPES.get(normalizedMime);
  if (!allowedExts) {
    throw new AppError(
      "Type de fichier non autorisé. Formats acceptés : PNG, JPG, WEBP, PDF, TXT, CSV, JSON.",
      415,
      "UNSUPPORTED_MEDIA_TYPE"
    );
  }

  const safeName = sanitizeFilename(fileName);
  const ext = path.extname(safeName).toLowerCase();
  if (!allowedExts.includes(ext)) {
    throw new AppError(
      "L'extension du fichier ne correspond pas au type MIME déclaré.",
      400,
      "EXTENSION_MISMATCH"
    );
  }

  if (!checkMagicBytes(normalizedMime, buffer)) {
    throw new AppError(
      "Le contenu binaire du fichier ne correspond pas à son format déclaré.",
      400,
      "INVALID_FILE_SIGNATURE"
    );
  }

  return { safeName, extension: ext };
}

export async function savePrivateFile(
  buffer: Buffer,
  mimeType: string,
  extension: string
): Promise<string> {
  const storageKey = `att_${crypto.randomUUID()}${extension}`;

  if (isS3Configured()) {
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: env.s3Bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return storageKey;
  }

  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const targetPath = path.resolve(LOCAL_UPLOAD_DIR, storageKey);
  if (!targetPath.startsWith(path.resolve(LOCAL_UPLOAD_DIR))) {
    throw new AppError("Chemin de stockage invalide.", 400);
  }
  await fs.writeFile(targetPath, buffer);
  return storageKey;
}

export async function readPrivateFile(storageKey: string): Promise<Buffer> {
  if (!/^att_[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(storageKey)) {
    throw new AppError("Clé de stockage invalide.", 400);
  }

  if (isS3Configured()) {
    const s3 = getS3Client();
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: env.s3Bucket,
        Key: storageKey,
      })
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new AppError("Fichier introuvable sur S3.", 404);
    return Buffer.from(bytes);
  }

  const targetPath = path.resolve(LOCAL_UPLOAD_DIR, storageKey);
  if (!targetPath.startsWith(path.resolve(LOCAL_UPLOAD_DIR))) {
    throw new AppError("Chemin non autorisé.", 403);
  }
  return fs.readFile(targetPath);
}

export async function deletePrivateFile(storageKey: string): Promise<void> {
  if (!/^att_[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(storageKey)) return;

  if (isS3Configured()) {
    const s3 = getS3Client();
    await s3
      .send(
        new DeleteObjectCommand({
          Bucket: env.s3Bucket,
          Key: storageKey,
        })
      )
      .catch(() => undefined);
    return;
  }

  const targetPath = path.resolve(LOCAL_UPLOAD_DIR, storageKey);
  if (targetPath.startsWith(path.resolve(LOCAL_UPLOAD_DIR))) {
    await fs.unlink(targetPath).catch(() => undefined);
  }
}
