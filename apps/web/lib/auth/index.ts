import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { authSchema } from "@/lib/db/schema";
import { authConfig } from "@/lib/auth/config";
import { getUserByEmail } from "@/lib/db/users";
import { ensureActiveWorkspace } from "@/lib/db/workspaces";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const email = parsed.data.email.toLowerCase();
      const user = await getUserByEmail(email);

      if (!user || !user.password) return null;

      const valid = await bcrypt.compare(parsed.data.password, user.password);
      if (!valid) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
];

// Google OAuth is optional — only register it when credentials are present so
// the app still boots (credentials login works) without them configured.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, authSchema),
  trustHost: true,
  providers,
  events: {
    // For OAuth sign-ups the adapter creates the user without a workspace.
    // Provision a "Personal" workspace here so the shell works immediately.
    async createUser({ user }) {
      if (!user.id) return;
      try {
        await ensureActiveWorkspace(user.id);
      } catch (error) {
        console.error("Failed to provision Personal workspace:", error);
      }
    },
  },
});
