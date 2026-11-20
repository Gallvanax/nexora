import crypto from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id (const enum Algorithm.Argon2id = 2)
  memoryCost: 19456, // 19 MiB (OWASP minimum recommended for Argon2id)
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(
  storedHash: string | null | undefined,
  plainPassword: string
): Promise<boolean> {
  if (!storedHash) return false;
  try {
    return await verify(storedHash, plainPassword);
  } catch {
    return false;
  }
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
