import { getCurrentUser } from "@/lib/auth/server-auth";
import { BillingService } from "@/lib/services/billing.service";
import { ok, fail, handleApiError } from "@/lib/shared/api-response";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const result = await BillingService.cancelSubscription(user.id);
    if (!result.cancelled) return fail("No active subscription to cancel", "NOT_FOUND", 404);

    return ok(result);
  } catch (error) {
    return handleApiError(error, "POST /api/billing/cancel");
  }
}
