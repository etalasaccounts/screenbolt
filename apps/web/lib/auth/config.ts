import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config (no adapter, no database). Shared between the
 * full server config (lib/auth.ts) and the middleware, so middleware never
 * pulls postgres/drizzle into the edge bundle.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublic =
        ["/", "/login", "/signup", "/terms", "/privacy"].includes(pathname) ||
        pathname.startsWith("/watch/") ||
        pathname.startsWith("/invite/");

      if (isPublic) return true;
      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
