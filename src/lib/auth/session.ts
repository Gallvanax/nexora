import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { generateSecureToken, hashToken } from "@/lib/auth/crypto";
import { extractClientIp } from "@/lib/auth/rate-limit";

export const SESSION_COOKIE_NAME = "nexora_session";
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 jours
const ACTIVITY_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export interface ActiveSessionContext {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: Date | null;
    avatarUrl: string | null;
    jobTitle: string | null;
    bio: string | null;
    createdAt: Date;
  };
  session: {
    id: string;
    expiresAt: Date;
    lastActiveAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  };
  preferences: {
    theme: "DARK" | "LIGHT" | "SYSTEM";
    language: string;
    timezone: string;
    defaultProjectView: "GRID" | "LIST" | "KANBAN";
    emailNotifications: boolean;
    dueSoonReminders: boolean;
    mentionAlerts: boolean;
    projectUpdates: boolean;
  };
}

export async function createUserSession(
  userId: string,
  meta?: { userAgent?: string | null; ipAddress?: string | null }
): Promise<{ sessionId: string; rawToken: string; expiresAt: Date }> {
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const reqHeaders = await headers();
  const userAgent = meta?.userAgent ?? reqHeaders.get("user-agent")?.slice(0, 255) ?? null;
  const ipAddress = meta?.ipAddress ?? extractClientIp(reqHeaders);
  const proto = reqHeaders.get("x-forwarded-proto");
  const isSecureCookie = proto === "https" || env.appUrl.toLowerCase().startsWith("https://");

  const created = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      userAgent,
      ipAddress,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return { sessionId: created.id, rawToken, expiresAt };
}

export const getCurrentSession = cache(async (): Promise<ActiveSessionContext | null> => {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken || rawToken.length < 20) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const record = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          avatarUrl: true,
          jobTitle: true,
          bio: true,
          createdAt: true,
          preferences: true,
        },
      },
    },
  });

  if (!record) return null;

  const now = new Date();
  if (record.expiresAt.getTime() <= now.getTime()) {
    await prisma.session.deleteMany({ where: { id: record.id } }).catch(() => undefined);
    return null;
  }

  if (now.getTime() - record.lastActiveAt.getTime() > ACTIVITY_REFRESH_MS) {
    await prisma.session
      .update({
        where: { id: record.id },
        data: { lastActiveAt: now },
      })
      .catch(() => undefined);
  }

  const prefs = record.user.preferences;
  return {
    user: {
      id: record.user.id,
      name: record.user.name,
      email: record.user.email,
      emailVerified: record.user.emailVerified,
      avatarUrl: record.user.avatarUrl,
      jobTitle: record.user.jobTitle,
      bio: record.user.bio,
      createdAt: record.user.createdAt,
    },
    session: {
      id: record.id,
      expiresAt: record.expiresAt,
      lastActiveAt: record.lastActiveAt,
      userAgent: record.userAgent,
      ipAddress: record.ipAddress,
    },
    preferences: {
      theme: prefs?.theme ?? "DARK",
      language: prefs?.language ?? "fr",
      timezone: prefs?.timezone ?? "Europe/Paris",
      defaultProjectView: prefs?.defaultProjectView ?? "GRID",
      emailNotifications: prefs?.emailNotifications ?? true,
      dueSoonReminders: prefs?.dueSoonReminders ?? true,
      mentionAlerts: prefs?.mentionAlerts ?? true,
      projectUpdates: prefs?.projectUpdates ?? true,
    },
  };
});

export async function requirePageUser(): Promise<ActiveSessionContext> {
  const ctx = await getCurrentSession();
  if (!ctx) {
    redirect("/connexion");
  }
  return ctx;
}

export async function requireApiUser(): Promise<ActiveSessionContext> {
  const ctx = await getCurrentSession();
  if (!ctx) {
    throw new UnauthorizedError();
  }
  return ctx;
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => undefined);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * CSRF protection for mutating API routes:
 * Validates Origin/Referer matches Host (or NEXT_PUBLIC_APP_URL) in browsers.
 */
export function assertSameOrigin(request: NextRequest | Request): void {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!origin && !referer) {
    // Non-browser API clients without Origin/Referer cannot be triggered via cross-site form/XHR,
    // because browsers always attach Origin on state-changing requests.
    return;
  }

  const allowedHosts = new Set<string>();
  if (host) allowedHosts.add(host.toLowerCase());
  try {
    allowedHosts.add(new URL(env.appUrl).host.toLowerCase());
  } catch {
    // Ignore malformed appUrl
  }

  const candidate = origin ?? referer!;
  try {
    const parsed = new URL(candidate);
    if (!allowedHosts.has(parsed.host.toLowerCase())) {
      throw new ForbiddenError("Requête cross-origin bloquée (protection CSRF).");
    }
  } catch (err) {
    if (err instanceof ForbiddenError) throw err;
    throw new ForbiddenError("En-tête d'origine invalide.");
  }
}
