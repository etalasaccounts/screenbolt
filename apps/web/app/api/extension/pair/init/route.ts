import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { DeviceService } from "@/lib/services/device.service";

const initSchema = z.object({ code: z.string().uuid().optional() });

/**
 * Extension pairing — step 1. Registers a pairing code (the extension
 * generates its own UUID and opens /connect?code=... in a new tab). Returns
 * the code and TTL. Unauthenticated by design — the code is an unguessable
 * handoff identifier that only becomes privileged once a logged-in user
 * approves it.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = initSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "code must be a UUID" }, { status: 400 });
    }

    const result = await DeviceService.initPairing(parsed.data.code);
    return NextResponse.json(
      {
        success: true,
        code: result.code,
        expiresAt: result.expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/extension/pair/init error:", error);
    const message = error instanceof Error ? error.message : "Failed to initialize pairing";
    if (message === "code already in use") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to initialize pairing" }, { status: 500 });
  }
}
