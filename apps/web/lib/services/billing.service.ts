import { getUserPlan, getPlanLimits, type PlanLimits } from "@/lib/billing/plans";
import { createSnapToken, verifyWebhookSignature } from "@/lib/billing/midtrans";
import { getUserSubscription, upsertSubscription, expireSubscriptions } from "@/lib/db/subscriptions";

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
  ): Promise<{ snapToken: string; redirectUrl: string }> {
    const orderId = `screenbolt-${plan}-${userId}-${Date.now()}`;
    const { token: snapToken, redirectUrl } = await createSnapToken({
      orderId,
      grossAmount: PLAN_PRICES[plan],
      customerName: userName,
      customerEmail: userEmail,
      planLabel: PLAN_LABELS[plan],
    });
    return { snapToken, redirectUrl };
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
  }): Promise<{ valid: boolean }> {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY is not set");

    const { order_id, transaction_status, status_code, gross_amount, signature_key, transaction_id } = payload;

    const expected = verifyWebhookSignature(order_id, status_code, gross_amount, serverKey);
    if (expected !== signature_key) return { valid: false };

    // orderId format: screenbolt-${plan}-${userId}-${timestamp}
    // plan has no hyphens; timestamp is last segment; userId is everything in between
    const parts = order_id.split("-");
    // parts[0]="screenbolt", parts[1]=plan, parts[last]=timestamp, parts[2..last-1]=userId
    const plan = parts[1] as "pro" | "business";
    const userId = parts.slice(2, parts.length - 1).join("-");

    if (transaction_status === "settlement" || transaction_status === "capture") {
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

  static async runDailyExpiry(): Promise<void> {
    await expireSubscriptions();
  }
}
