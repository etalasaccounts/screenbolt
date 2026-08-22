import { createHash, randomBytes, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deviceTokens } from "@/lib/db/schema";

export const PAIRING_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Generate an opaque bearer token for a paired device. */
export function generateDeviceToken(): string {
  return `sbt_${randomBytes(32).toString("base64url")}`;
}

/** Generate the pairing code the extension registers locally. */
export function generatePairingCode(): string {
  return randomUUID();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Mint + persist a device token scoped to a user + workspace. */
export async function createDeviceToken(userId: string, workspaceId: string, label?: string) {
  const token = generateDeviceToken();
  const [row] = await db
    .insert(deviceTokens)
    .values({
      userId,
      workspaceId,
      tokenHash: sha256(token),
      label: label ?? "Chrome extension",
    })
    .returning();
  return { token, row };
}

export async function listDeviceTokens(userId: string) {
  return db.query.deviceTokens.findMany({
    where: eq(deviceTokens.userId, userId),
    orderBy: (tokens, { desc }) => [desc(tokens.createdAt)],
  });
}

export async function revokeDeviceToken(id: string, userId: string) {
  const [row] = await db
    .update(deviceTokens)
    .set({ revokedAt: new Date() })
    .where(eq(deviceTokens.id, id))
    .returning();
  return row && row.userId === userId ? row : null;
}

/** Resolve a bearer token to its device-token row (if valid and unrevoked). */
export async function findValidDeviceToken(token: string) {
  const [row] = await db
    .select()
    .from(deviceTokens)
    .where(eq(deviceTokens.tokenHash, sha256(token)))
    .limit(1);

  if (!row || row.revokedAt) return null;
  return row;
}

export async function touchDeviceToken(id: string) {
  await db.update(deviceTokens).set({ lastUsedAt: new Date() }).where(eq(deviceTokens.id, id));
}
