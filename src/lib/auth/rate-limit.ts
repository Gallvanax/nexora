import { prisma } from "@/lib/db/prisma";
import { RateLimitError } from "@/lib/errors";

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs: number;
  blockMs?: number;
}

const memoryFallback = new Map<string, { count: number; resetAt: number; blockedUntil?: number }>();

export async function enforceRateLimit({
  key,
  limit,
  windowMs,
  blockMs,
}: RateLimitConfig): Promise<{ remaining: number; resetAt: Date }> {
  const now = new Date();
  const nowMs = now.getTime();

  try {
    const existing = await prisma.rateLimitEntry.findUnique({ where: { key } });

    if (existing?.blockedUntil && existing.blockedUntil.getTime() > nowMs) {
      const retryAfter = Math.ceil((existing.blockedUntil.getTime() - nowMs) / 1000);
      throw new RateLimitError(retryAfter);
    }

    if (!existing || existing.resetAt.getTime() <= nowMs) {
      const resetAt = new Date(nowMs + windowMs);
      await prisma.rateLimitEntry.upsert({
        where: { key },
        create: { key, count: 1, resetAt, blockedUntil: null },
        update: { count: 1, resetAt, blockedUntil: null },
      });
      return { remaining: Math.max(0, limit - 1), resetAt };
    }

    const nextCount = existing.count + 1;
    if (nextCount > limit) {
      const until = new Date(nowMs + (blockMs ?? windowMs));
      await prisma.rateLimitEntry.update({
        where: { key },
        data: { count: nextCount, blockedUntil: until },
      });
      const retryAfter = Math.ceil((until.getTime() - nowMs) / 1000);
      throw new RateLimitError(retryAfter);
    }

    await prisma.rateLimitEntry.update({
      where: { key },
      data: { count: nextCount },
    });

    return { remaining: Math.max(0, limit - nextCount), resetAt: existing.resetAt };
  } catch (err) {
    if (err instanceof RateLimitError) throw err;

    // Fallback in-memory limit if DB is temporarily unreachable
    const item = memoryFallback.get(key);
    if (item?.blockedUntil && item.blockedUntil > nowMs) {
      throw new RateLimitError(Math.ceil((item.blockedUntil - nowMs) / 1000));
    }
    if (!item || item.resetAt <= nowMs) {
      const resetAt = nowMs + windowMs;
      memoryFallback.set(key, { count: 1, resetAt });
      return { remaining: Math.max(0, limit - 1), resetAt: new Date(resetAt) };
    }
    item.count += 1;
    if (item.count > limit) {
      item.blockedUntil = nowMs + (blockMs ?? windowMs);
      throw new RateLimitError(Math.ceil((item.blockedUntil - nowMs) / 1000));
    }
    return { remaining: Math.max(0, limit - item.count), resetAt: new Date(item.resetAt) };
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  memoryFallback.delete(key);
  try {
    await prisma.rateLimitEntry.deleteMany({ where: { key } });
  } catch {
    // Ignore cleanup errors
  }
}

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "127.0.0.1";
}
