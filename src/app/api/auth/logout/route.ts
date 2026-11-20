import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin, destroyCurrentSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await destroyCurrentSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "auth.logout.error");
  }
}
