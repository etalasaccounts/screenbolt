import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { BillingService } from "@/lib/services/billing.service";
import { ok, fail, handleApiError } from "@/lib/shared/api-response";

const bodySchema = z.object({
  plan: z.enum(["pro", "business"]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return fail("Invalid plan", "VALIDATION_ERROR", 400);

    const { plan } = parsed.data;
    const { snapToken, redirectUrl } = await BillingService.createCheckoutToken(
      user.id,
      user.email ?? "",
      user.name ?? user.email ?? "User",
      plan,
    );

    return ok({ snapToken, redirectUrl });
  } catch (error) {
    return handleApiError(error, "POST /api/billing/checkout");
  }
}
