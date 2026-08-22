import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { ExportService } from "@/lib/services/export.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

type RouteContext = { params: Promise<{ id: string }> };

const exportSchema = z.object({
  provider: z.enum(["drive", "dropbox"]),
});

/**
 * Saves a Screenbolt video to a connected cloud provider.
 *   POST /api/videos/[id]/export  { provider: "drive" | "dropbox" }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;

    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return fail("provider must be 'drive' or 'dropbox'", "VALIDATION_ERROR", 400);
    }

    const result = await ExportService.exportVideo(id, user.id, parsed.data.provider);
    return ok(result);
  } catch (error) {
    return handleApiError(error, "POST /api/videos/[id]/export");
  }
}
