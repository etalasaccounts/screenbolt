/**
 * User database operations.
 *
 * Provides functions for user lookups and profile/token updates.
 * Follows Drizzle ORM patterns consistent with the rest of the app.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers } from "@/lib/db/schema";
import type { User } from "@/lib/db/schema";

/**
 * Get a user by ID with profile and token fields.
 * Does NOT provision a workspace if missing — that's the caller's job.
 *
 * @param userId - The user ID
 * @returns User object with selected fields, or null if not found
 */
export async function getUserById(
  userId: string,
): Promise<{
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  avatarUrl: string | null;
  activeWorkspaceId: string | null;
  createdAt: Date;
  password: string | null;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiry: Date | null;
  dropboxAccessToken: string | null;
  dropboxRefreshToken: string | null;
  dropboxTokenExpiry: Date | null;
  updatedAt: Date;
} | null> {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      avatarUrl: users.avatarUrl,
      activeWorkspaceId: users.activeWorkspaceId,
      createdAt: users.createdAt,
      password: users.password,
      googleAccessToken: users.googleAccessToken,
      googleRefreshToken: users.googleRefreshToken,
      googleTokenExpiry: users.googleTokenExpiry,
      dropboxAccessToken: users.dropboxAccessToken,
      dropboxRefreshToken: users.dropboxRefreshToken,
      dropboxTokenExpiry: users.dropboxTokenExpiry,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

/**
 * Get a user by email address for authentication purposes.
 *
 * @param email - The email to search for (will be normalized to lowercase)
 * @returns User object, or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  return user ?? null;
}

/**
 * Get a user's Google access token.
 *
 * @param userId - The user ID
 * @returns Google access token, or null if not connected
 */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const [result] = await db
    .select({ token: users.googleAccessToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result?.token ?? null;
}

/**
 * Get a user's Dropbox access token.
 *
 * @param userId - The user ID
 * @returns Dropbox access token, or null if not connected
 */
export async function getDropboxAccessToken(userId: string): Promise<string | null> {
  const [result] = await db
    .select({ token: users.dropboxAccessToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result?.token ?? null;
}

/**
 * Create a user with password and provision a "Personal" workspace in one transaction.
 * Returns the created user with the assigned activeWorkspaceId.
 *
 * @param email - The user's email (will be normalized to lowercase)
 * @param hashedPassword - The password hash (should be hashed before calling)
 * @param name - The user's display name
 * @returns User fields with activeWorkspaceId set
 */
export async function createUserWithWorkspace(
  email: string,
  hashedPassword: string,
  name: string,
): Promise<{ id: string; name: string | null; email: string | null; activeWorkspaceId: string }> {
  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
      })
      .returning({ id: users.id, name: users.name, email: users.email });

    const [workspace] = await tx
      .insert(workspaces)
      .values({ name: "Personal", userId: user.id })
      .returning({ id: workspaces.id });

    await tx.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: user.id, role: "owner" });

    await tx
      .update(users)
      .set({ activeWorkspaceId: workspace.id })
      .where(eq(users.id, user.id));

    return { ...user, activeWorkspaceId: workspace.id };
  });

  return result;
}

/**
 * Get a user's Google OAuth tokens for refresh/upload operations.
 * Returns the stored access token, refresh token, and expiry date.
 *
 * @param userId - The user ID
 * @returns Object with accessToken, refreshToken, and expiry, or null if not found
 */
export async function getGoogleTokens(
  userId: string,
): Promise<{ accessToken: string | null; refreshToken: string | null; expiry: Date | null } | null> {
  const [user] = await db
    .select({
      accessToken: users.googleAccessToken,
      refreshToken: users.googleRefreshToken,
      expiry: users.googleTokenExpiry,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

/**
 * Save refreshed Google OAuth tokens for a user.
 * Updates the access token and expiry date.
 *
 * @param userId - The user ID
 * @param tokens - Object with accessToken and expiresIn (seconds)
 */
export async function saveGoogleTokens(
  userId: string,
  tokens: { accessToken: string; expiresIn: number },
): Promise<void> {
  await db
    .update(users)
    .set({
      googleAccessToken: tokens.accessToken,
      googleTokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
    })
    .where(eq(users.id, userId));
}

/**
 * Get a user's Dropbox OAuth tokens for refresh/upload operations.
 * Returns the stored access token, refresh token, and expiry date.
 *
 * @param userId - The user ID
 * @returns Object with accessToken, refreshToken, and expiry, or null if not found
 */
export async function getDropboxTokens(
  userId: string,
): Promise<{ accessToken: string | null; refreshToken: string | null; expiry: Date | null } | null> {
  const [user] = await db
    .select({
      accessToken: users.dropboxAccessToken,
      refreshToken: users.dropboxRefreshToken,
      expiry: users.dropboxTokenExpiry,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

/**
 * Save refreshed Dropbox OAuth tokens for a user.
 * Updates the access token and expiry date.
 *
 * @param userId - The user ID
 * @param tokens - Object with accessToken and expiresIn (seconds)
 */
export async function saveDropboxTokens(
  userId: string,
  tokens: { accessToken: string; expiresIn: number },
): Promise<void> {
  await db
    .update(users)
    .set({
      dropboxAccessToken: tokens.accessToken,
      dropboxTokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
    })
    .where(eq(users.id, userId));
}
