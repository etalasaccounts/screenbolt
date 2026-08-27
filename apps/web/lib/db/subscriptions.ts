import { eq, and, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import type { Subscription } from "@/lib/db/schema";

export type UpsertSubscriptionData = {
  userId: string;
  plan: "free" | "pro" | "business";
  status: "active" | "cancelling" | "expired" | "cancelled";
  midtransOrderId?: string | null;
  midtransTransactionId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
};

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  return (
    (await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    })) ?? null
  );
}

export async function upsertSubscription(data: UpsertSubscriptionData): Promise<Subscription> {
  const existing = await getUserSubscription(data.userId);
  if (existing) {
    const [row] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.userId, data.userId))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(subscriptions)
    .values({ ...data })
    .returning();
  return row;
}

export async function expireSubscriptions(): Promise<void> {
  await db
    .update(subscriptions)
    .set({ status: "expired", plan: "free", updatedAt: new Date() })
    .where(
      and(
        or(eq(subscriptions.status, "active"), eq(subscriptions.status, "cancelling")),
        lt(subscriptions.currentPeriodEnd, new Date()),
      ),
    );
}

export async function cancelSubscriptionAtPeriodEnd(userId: string): Promise<Subscription | null> {
  const existing = await getUserSubscription(userId);
  if (!existing || existing.status !== "active") return null;
  const [row] = await db
    .update(subscriptions)
    .set({ status: "cancelling", updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId))
    .returning();
  return row ?? null;
}
