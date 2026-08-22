import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { AuthService } from "@/lib/services/auth.service";
import { generateOAuthState } from "@/lib/auth/oauth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    if (!AuthService.isGoogleDriveConfigured()) {
      return NextResponse.redirect(new URL("/account?error=drive-not-configured", request.url));
    }

    const state = generateOAuthState();
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const authUrl = AuthService.getGoogleAuthUrl(redirectUri, state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set("drive_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("GET /api/auth/google error:", error);
    return NextResponse.redirect(new URL("/account?error=drive-oauth", new URL(request.url).origin));
  }
}
