import { getVideo, updateVideoPin } from "@/lib/db/videos";
import { ApiError } from "@/lib/shared/errors";

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export class PinService {
  static async setPin(userId: string, videoId: string, enabled: boolean) {
    const video = await getVideo(videoId);
    if (!video) throw new ApiError("Video not found", 404, "NOT_FOUND");
    if (video.userId !== userId) throw new ApiError("Forbidden", 403, "FORBIDDEN");

    const pin = enabled ? generatePin() : null;
    return updateVideoPin(videoId, { pinEnabled: enabled, pin });
  }
}
