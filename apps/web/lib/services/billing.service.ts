import { getUserPlan, getPlanLimits, type PlanLimits } from "@/lib/billing/plans";

export class BillingService {
  static async getUserPlanWithLimits(
    userId: string,
  ): Promise<{ plan: "free" | "pro" | "business"; limits: PlanLimits }> {
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan);
    return { plan, limits };
  }
}
