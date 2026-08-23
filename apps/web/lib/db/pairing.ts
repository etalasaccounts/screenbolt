import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { pairingRequests } from "@/lib/db/schema";
import { PAIRING_TTL_MS } from "@/lib/db/devices";

export type PairingStatus = "pending" | "approved" | "expired";
export type PairingRow = typeof pairingRequests.$inferSelect;

/** Register a pending pairing request (called by the extension via init). */
export async function createPairingRequest(code: string) {
  const [row] = await db
    .insert(pairingRequests)
    .values({
      id: code,
      status: "pending",
      expiresAt: new Date(Date.now() + PAIRING_TTL_MS),
    })
    .returning();
  return row;
}

/** Expire any pending requests past their TTL, then return the request. */
export async function getPairingRequest(code: string) {
  await db
    .update(pairingRequests)
    .set({ status: "expired" })
    .where(and(eq(pairingRequests.status, "pending"), lt(pairingRequests.expiresAt, new Date())));

  const [row] = await db
    .select()
    .from(pairingRequests)
    .where(eq(pairingRequests.id, code))
    .limit(1);

  if (!row) return null;

  // A request whose TTL passed but that wasn't caught above (e.g. already
  // approved) is fine; report expired status for pending ones.
  if (row.status === "pending" && row.expiresAt.getTime() <= Date.now()) {
    return { ...row, status: "expired" as const };
  }
  return row;
}

/** Approve a pending request for a user/workspace. Returns true on success. */
export async function approvePairingRequest(code: string, userId: string, workspaceId: string) {
  const [row] = await db
    .update(pairingRequests)
    .set({ status: "approved", userId, workspaceId })
    .where(
      and(
        eq(pairingRequests.id, code),
        eq(pairingRequests.status, "pending"),
      ),
    )
    .returning();

  return row ?? null;
}

/** Store the raw token on an approved request for the one-time status handoff. */
export async function attachTokenToPairing(code: string, token: string) {
  const [row] = await db
    .update(pairingRequests)
    .set({ token })
    .where(and(eq(pairingRequests.id, code), eq(pairingRequests.status, "approved")))
    .returning();
  return row ?? null;
}

/**
 * Atomically retrieve + clear the raw token. The extension polls status; the
 * first poll that observes `approved` gets the token, subsequent polls (or
 * anyone else) see null. Uses SELECT ... FOR UPDATE so two racing polls
 * can't both read the same token.
 */
export async function takePairingToken(code: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ token: pairingRequests.token })
      .from(pairingRequests)
      .where(and(eq(pairingRequests.id, code), eq(pairingRequests.status, "approved")))
      .for("update")
      .limit(1);

    const token = row?.token ?? null;
    if (token) {
      await tx.update(pairingRequests).set({ token: null }).where(eq(pairingRequests.id, code));
    }
    return token;
  });
}
