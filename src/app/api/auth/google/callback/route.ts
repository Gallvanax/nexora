import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env, isGoogleOAuthConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { slugify } from "@/lib/utils";
import { generateSecureToken, timingSafeEqualStrings } from "@/lib/auth/crypto";
import { createUserSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(new URL("/connexion?error=oauth_unconfigured", env.appUrl));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const storedRaw = cookieStore.get("nexora_oauth_state")?.value;
  cookieStore.delete("nexora_oauth_state");

  if (!code || !state || !storedRaw) {
    return NextResponse.redirect(new URL("/connexion?error=oauth_state", env.appUrl));
  }

  let parsedCookie: { state: string; codeVerifier: string };
  try {
    parsedCookie = JSON.parse(storedRaw);
  } catch {
    return NextResponse.redirect(new URL("/connexion?error=oauth_state", env.appUrl));
  }

  if (!timingSafeEqualStrings(state, parsedCookie.state)) {
    return NextResponse.redirect(new URL("/connexion?error=oauth_state", env.appUrl));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: `${env.appUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
        code_verifier: parsedCookie.codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error("Google token exchange failed");
    }

    const tokenJson = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw new Error("Google userinfo failed");
    }

    const profile = (await userInfoRes.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!profile.email || !profile.email_verified) {
      return NextResponse.redirect(new URL("/connexion?error=oauth_unverified", env.appUrl));
    }

    const normalizedEmail = profile.email.toLowerCase();

    const userId = await prisma.$transaction(
      async (tx) => {
        const existingAccount = await tx.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: profile.sub,
            },
          },
        });

        if (existingAccount) {
          return existingAccount.userId;
        }

        let user = await tx.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
          const displayName = profile.name?.trim() || normalizedEmail.split("@")[0];
          const slug = `${slugify(displayName) || "espace"}-${generateSecureToken(3)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 6)}`;
          user = await tx.user.create({
            data: {
              name: displayName,
              email: normalizedEmail,
              emailVerified: new Date(),
              avatarUrl: profile.picture ?? null,
              preferences: {
                create: { theme: "DARK", language: "fr", timezone: "Europe/Paris" },
              },
            },
          });

          await tx.workspace.create({
            data: {
              name: `Espace de ${displayName.split(" ")[0]}`,
              slug,
              ownerId: user.id,
              members: { create: { userId: user.id, role: "OWNER" } },
            },
          });
        }

        await tx.account.create({
          data: {
            userId: user.id,
            provider: "google",
            providerAccountId: profile.sub,
            accessToken: tokenJson.access_token,
            refreshToken: tokenJson.refresh_token ?? null,
            expiresAt: tokenJson.expires_in
              ? Math.floor(Date.now() / 1000) + tokenJson.expires_in
              : null,
          },
        });

        return user.id;
      },
      { maxWait: 10_000, timeout: 25_000 }
    );

    await createUserSession(userId);
    return NextResponse.redirect(new URL("/tableau-de-bord", env.appUrl));
  } catch (error) {
    logger.error("auth.google_callback.error", { error });
    return NextResponse.redirect(new URL("/connexion?error=oauth_failed", env.appUrl));
  }
}
