import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env, isGoogleOAuthConfigured } from "@/lib/env";
import { generateSecureToken } from "@/lib/auth/crypto";

export async function GET() {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "La connexion Google OAuth n'est pas configurée (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants).",
        code: "OAUTH_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const state = generateSecureToken(24);
  const codeVerifier = generateSecureToken(32);
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  const cookieStore = await cookies();
  cookieStore.set("nexora_oauth_state", JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    secure: env.appUrl.toLowerCase().startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: `${env.appUrl}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
