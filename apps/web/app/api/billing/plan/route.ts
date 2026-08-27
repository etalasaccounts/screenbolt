import { getCurrentUser } from "@/lib/auth/server-auth";
import { BillingService } from "@/lib/services/billing.service";
import { ok, fail } from "@/lib/shared/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const [{ plan, limits }, subscription] = await Promise.all([
      BillingService.getUserPlanWithLimits(user.id),
      BillingService.getUserSubscription(user.id),
    ]);

    return ok({
      plan,
      limits,
      subscription: subscription
        ? { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null }
        : null,
    });
  } catch (error) {
    console.error("GET /api/billing/plan error:", error);
    return fail("Internal server error", "INTERNAL_ERROR", 500);
  }
}
