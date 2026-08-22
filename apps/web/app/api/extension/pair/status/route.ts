import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { DeviceService } from "@/lib/services/device.service";

const statusSchema = z.object({ code: z.string().uuid() });

/**
 * Extension pairing — status poll. Unauthenticated; the extension polls this
 * until it sees `approved`, at which point the token is returned exactly once
 * (and cleared server-side).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = statusSchema.safeParse({ code: searchParams.get("code") });
    if (!parsed.success) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const result = await DeviceService.getPairingStatus(parsed.data.code);
    return NextResponse.json({ status: result.status, token: result.token });
  } catch (error) {
    console.error("GET /api/extension/pair/status error:", error);
    const message = error instanceof Error ? error.message : "Failed to get pairing status";
    if (message === "Pairing request not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to get pairing status" }, { status: 500 });
  }
}
