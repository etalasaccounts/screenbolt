import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { BillingService } from "@/lib/services/billing.service";
import { ok, fail, handleApiError } from "@/lib/shared/api-response";

const bodySchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return fail("orderId is required", "VALIDATION_ERROR", 400);

    const result = await BillingService.verifyAndActivate(parsed.data.orderId);
    return ok(result);
  } catch (error) {
    return handleApiError(error, "POST /api/billing/verify");
  }
}
