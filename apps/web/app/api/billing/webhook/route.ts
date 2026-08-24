import { NextRequest } from "next/server";
import { z } from "zod";
import { BillingService } from "@/lib/services/billing.service";
import { ok, fail, handleApiError } from "@/lib/shared/api-response";

const bodySchema = z.object({
  order_id: z.string(),
  transaction_status: z.string(),
  status_code: z.string(),
  gross_amount: z.string(),
  signature_key: z.string(),
  transaction_id: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return fail("Invalid payload", "VALIDATION_ERROR", 400);

    const { valid } = await BillingService.handleWebhookNotification(parsed.data);
    if (!valid) return fail("Invalid signature", "FORBIDDEN", 403);

    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error, "POST /api/billing/webhook");
  }
}
