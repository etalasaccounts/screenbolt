import { eq, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { videos } from "@/lib/db/schema";
import { getUserSubscription } from "@/lib/db/subscriptions";
import { ValidationError } from "@/lib/shared/errors";

export type PlanLimits = {
  maxVideos: number | null;
  maxDurationSeconds: number | null;
  addAudio: boolean;
  fullEditing: boolean;
};

export const PLAN_LIMITS: Record<"free" | "pro" | "business", PlanLimits> = {
  free: {
    maxVideos: 15,
    maxDurationSeconds: 300,
    addAudio: false,
    fullEditing: false,
  },
  pro: {
    maxVideos: null,
    maxDurationSeconds: 1800,
    addAudio: true,
    fullEditing: true,
  },
  business: {
    maxVideos: null,
    maxDurationSeconds: null,
    addAudio: true,
    fullEditing: true,
  },
};

export async function getUserPlan(userId: string): Promise<"free" | "pro" | "business"> {
  const sub = await getUserSubscription(userId);
  if (!sub) return "free";
  if (sub.status !== "active") return "free";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return "free";
  return sub.plan;
}

export function getPlanLimits(plan: "free" | "pro" | "business"): PlanLimits {
  return PLAN_LIMITS[plan];
}

export async function assertVideoQuota(userId: string): Promise<void> {
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);
  if (limits.maxVideos === null) return;

  const [row] = await db
    .select({ total: count() })
    .from(videos)
    .where(eq(videos.userId, userId));

  if ((row?.total ?? 0) >= limits.maxVideos) {
    throw new ValidationError(
      `Free plan allows a maximum of ${limits.maxVideos} videos. Upgrade to Pro or Business to record more.`,
    );
  }
}

export async function assertDurationAllowed(
  userId: string,
  durationSeconds: number,
): Promise<void> {
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);
  if (limits.maxDurationSeconds === null) return;

  if (durationSeconds > limits.maxDurationSeconds) {
    const minutes = limits.maxDurationSeconds / 60;
    throw new ValidationError(
      `Your plan allows recordings up to ${minutes} minutes. Upgrade to record longer videos.`,
    );
  }
}
