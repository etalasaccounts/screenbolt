import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing.service";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await BillingService.runDailyExpiry();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GET /api/billing/cron error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
