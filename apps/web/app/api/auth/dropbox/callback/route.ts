import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { AuthService } from "@/lib/services/auth.service";
import { validateOAuthState } from "@/lib/auth/oauth";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const storedState = request.cookies.get("dropbox_oauth_state")?.value ?? null;

    if (!code || !validateOAuthState(state, storedState)) {
      return NextResponse.redirect(new URL("/account?error=dropbox-oauth", request.url));
    }

    const redirectUri = `${origin}/api/auth/dropbox/callback`;

    await AuthService.connectDropbox(user.id, code, redirectUri);

    return NextResponse.redirect(new URL("/account?connected=dropbox", request.url));
  } catch (error) {
    console.error("Dropbox callback error:", error);
    return NextResponse.redirect(new URL("/account?error=dropbox-oauth", request.url));
  }
}
