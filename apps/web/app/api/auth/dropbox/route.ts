import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { AuthService } from "@/lib/services/auth.service";
import { generateOAuthState } from "@/lib/auth/oauth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    if (!AuthService.isDropboxConfigured()) {
      return NextResponse.redirect(new URL("/account?error=dropbox-not-configured", request.url));
    }

    const state = generateOAuthState();
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/auth/dropbox/callback`;

    const authUrl = AuthService.getDropboxAuthUrl(redirectUri, state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set("dropbox_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("GET /api/auth/dropbox error:", error);
    return NextResponse.redirect(new URL("/account?error=dropbox-oauth", new URL(request.url).origin));
  }
}
