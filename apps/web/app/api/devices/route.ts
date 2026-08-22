import { getCurrentUser } from "@/lib/auth/server-auth";
import { DeviceService } from "@/lib/services/device.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }
    const devices = await DeviceService.getDeviceTokens(user.id);
    return ok(devices);
  } catch (error) {
    return handleApiError(error, "GET /api/devices");
  }
}
