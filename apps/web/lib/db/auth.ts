/**
 * Authentication database operations.
 *
 * Provides core functions for user lookup, creation, and OAuth management.
 * Follows Drizzle ORM patterns consistent with the rest of the app.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { User } from "@/lib/db/schema";

/**
 * Find a user by email address.
 *
 * @param email - The email to search for (will be normalized to lowercase)
 * @returns The user if found, null otherwise
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
  return user ?? null;
}

/**
 * Find a user by their ID.
 *
 * @param userId - The user ID to search for
 * @returns The user if found, null otherwise
 */
export async function findUserById(userId: string): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return user ?? null;
}

/**
 * Create a new user with a password.
 *
 * @param email - The user's email (will be normalized to lowercase)
 * @param hashedPassword - The password hash (should be hashed before calling)
 * @param name - The user's display name
 * @returns The created user object
 */
export async function createUserWithPassword(
  email: string,
  hashedPassword: string,
  name: string,
): Promise<User & { email: string }> {
  const [user] = await db
    .insert(users)
    .values({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
    })
    .returning();

  // The email column is nullable for OAuth accounts, but this insert always
  // writes one, so the returned row is guaranteed to carry it.
  return user as User & { email: string };
}

/**
 * Update user's Google OAuth tokens.
 *
 * When refreshToken is null, the googleRefreshToken column is not updated,
 * preserving any previously stored value. This matches the original semantics
 * where Drizzle skips undefined values in .set(), allowing reconnect without
 * destroying the stored refresh token.
 */
export async function updateGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresIn?: number,
): Promise<void> {
  const updateData: Record<string, unknown> = {
    googleAccessToken: accessToken,
  };
  if (refreshToken !== null) {
    updateData.googleRefreshToken = refreshToken;
  }
  if (expiresIn) {
    updateData.googleTokenExpiry = new Date(Date.now() + expiresIn * 1000);
  }
  updateData.updatedAt = new Date();

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));
}

/**
 * Clear user's Google OAuth tokens (disconnect).
 */
export async function clearGoogleTokens(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Update user's Dropbox OAuth tokens.
 *
 * When refreshToken is null, the dropboxRefreshToken column is not updated,
 * preserving any previously stored value. This allows reconnect without
 * destroying the stored refresh token.
 */
export async function updateDropboxTokens(
  userId: string,
  accessToken: string,
  refreshToken?: string | null,
  expiresIn?: number,
): Promise<void> {
  const updateData: Record<string, unknown> = {
    dropboxAccessToken: accessToken,
  };
  if (refreshToken !== undefined && refreshToken !== null) {
    updateData.dropboxRefreshToken = refreshToken;
  }
  if (expiresIn) {
    updateData.dropboxTokenExpiry = new Date(Date.now() + expiresIn * 1000);
  }
  updateData.updatedAt = new Date();

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));
}

/**
 * Clear user's Dropbox OAuth tokens (disconnect).
 */
export async function clearDropboxTokens(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      dropboxAccessToken: null,
      dropboxRefreshToken: null,
      dropboxTokenExpiry: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Update user profile information.
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; email?: string },
): Promise<User> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.email !== undefined) updateData.email = data.email.toLowerCase();

  const [user] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning();

  return user;
}
