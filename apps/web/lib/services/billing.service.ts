import { getUserPlan, getPlanLimits, type PlanLimits } from "@/lib/billing/plans";
import { createSnapToken, verifyWebhookSignature, getTransactionStatus, isSuccessfulTransaction } from "@/lib/billing/midtrans";
import { getUserSubscription, upsertSubscription, expireSubscriptions, cancelSubscriptionAtPeriodEnd } from "@/lib/db/subscriptions";

const PLAN_PRICES: Record<"pro" | "business", number> = {
  pro: 50000,
  business: 100000,
};

const PLAN_LABELS: Record<"pro" | "business", string> = {
  pro: "Screenbolt Pro",
  business: "Screenbolt Business",
};

export class BillingService {
  static getUserSubscription(
    userId: string,
  ): ReturnType<typeof getUserSubscription> {
    return getUserSubscription(userId);
  }

  static async getUserPlanWithLimits(
    userId: string,
  ): Promise<{ plan: "free" | "pro" | "business"; limits: PlanLimits }> {
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan);
    return { plan, limits };
  }

  static async createCheckoutToken(
    userId: string,
    userEmail: string,
    userName: string,
    plan: "pro" | "business",
  ): Promise<{ snapToken: string; redirectUrl: string; orderId: string }> {
    const uid = userId.replace(/-/g, ""); // 32 hex chars, no hyphens
    const rand = Math.random().toString(36).slice(2, 6);
    const orderId = `sb-${plan}-${uid}-${rand}`; // max 49 chars (business)
    const { token: snapToken, redirectUrl } = await createSnapToken({
      orderId,
      grossAmount: PLAN_PRICES[plan],
      customerName: userName,
      customerEmail: userEmail,
      planLabel: PLAN_LABELS[plan],
    });
    return { snapToken, redirectUrl, orderId };
  }

  /**
   * Process a Midtrans payment notification webhook.
   * Verifies signature, parses userId from orderId, and upserts subscription.
   * Returns false if signature is invalid.
   */
  static async handleWebhookNotification(payload: {
    order_id: string;
    transaction_status: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
    transaction_id: string;
    fraud_status?: string;
  }): Promise<{ valid: boolean }> {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY is not set");

    const { order_id, transaction_status, status_code, gross_amount, signature_key, transaction_id, fraud_status } = payload;

    const expected = verifyWebhookSignature(order_id, status_code, gross_amount, serverKey);
    if (expected !== signature_key) return { valid: false };

    // orderId format: sb-${plan}-${uuid32nohyphens}-${rand4}
    const parts = order_id.split("-");
    // parts[0]="sb", parts[1]=plan, parts[2]=uuid32, parts[3]=rand4
    const plan = parts[1] as "pro" | "business";
    const uid = parts[2]; // 32 hex chars
    // reinsert hyphens: 8-4-4-4-12
    const userId = `${uid.slice(0,8)}-${uid.slice(8,12)}-${uid.slice(12,16)}-${uid.slice(16,20)}-${uid.slice(20)}`;

    if (isSuccessfulTransaction(transaction_status, fraud_status)) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await upsertSubscription({
        userId,
        plan,
        status: "active",
        midtransOrderId: order_id,
        midtransTransactionId: transaction_id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    } else if (transaction_status === "expire" || transaction_status === "cancel") {
      await upsertSubscription({
        userId,
        plan: "free",
        status: "cancelled",
        midtransOrderId: order_id,
        midtransTransactionId: transaction_id,
      });
    }

    return { valid: true };
  }

  /**
   * Verify a transaction by orderId via Midtrans status API and activate subscription if settled.
   * Used after SNAP onSuccess callback when webhook cannot reach localhost in dev.
   */
  static async verifyAndActivate(
    orderId: string,
  ): Promise<{ activated: boolean; status: string }> {
    const txn = await getTransactionStatus(orderId);
    const { transaction_status, transaction_id } = txn;

    if (!isSuccessfulTransaction(transaction_status, txn.fraud_status)) {
      return { activated: false, status: transaction_status };
    }

    // orderId format: sb-${plan}-${uuid32nohyphens}-${rand4}
    const parts = orderId.split("-");
    const plan = parts[1] as "pro" | "business";
    const uid = parts[2];
    const userId = `${uid.slice(0,8)}-${uid.slice(8,12)}-${uid.slice(12,16)}-${uid.slice(16,20)}-${uid.slice(20)}`;

    // Skip upsert if webhook already activated this exact order — avoids
    // a double-write race in prod where both this endpoint and the Midtrans
    // webhook fire within seconds of each other.
    const existing = await getUserSubscription(userId);
    if (existing?.status === "active" && existing.midtransOrderId === orderId) {
      return { activated: true, status: transaction_status };
    }

    const now = new Date();
    await upsertSubscription({
      userId,
      plan,
      status: "active",
      midtransOrderId: orderId,
      midtransTransactionId: transaction_id,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
    return { activated: true, status: transaction_status };
  }

  static async cancelSubscription(userId: string): Promise<{ cancelled: boolean; periodEnd: string | null }> {
    const row = await cancelSubscriptionAtPeriodEnd(userId);
    if (!row) return { cancelled: false, periodEnd: null };
    return { cancelled: true, periodEnd: row.currentPeriodEnd?.toISOString() ?? null };
  }

  static async runDailyExpiry(): Promise<void> {
    await expireSubscriptions();
  }
}
