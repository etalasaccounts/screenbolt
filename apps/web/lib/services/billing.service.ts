import { getUserPlan, getPlanLimits, type PlanLimits } from "@/lib/billing/plans";
import { createSnapToken } from "@/lib/billing/midtrans";

const PLAN_PRICES: Record<"pro" | "business", number> = {
  pro: 50000,
  business: 100000,
};

const PLAN_LABELS: Record<"pro" | "business", string> = {
  pro: "Screenbolt Pro",
  business: "Screenbolt Business",
};

export class BillingService {
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
}
