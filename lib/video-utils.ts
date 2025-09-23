/**
 * Converts Bunny CDN player URL to direct video stream URL
 * @param playerUrl - Bunny CDN player URL (e.g., https://iframe.mediadelivery.net/embed/{libraryId}/{videoId})
 * @returns Direct video stream URL or original URL if not a Bunny CDN URL
 */
export function getDirectVideoUrl(playerUrl: string): string {
  try {
    // Check if it's a Bunny CDN iframe URL
    if (playerUrl.includes('iframe.mediadelivery.net/embed/')) {
      // Extract library ID and video ID from iframe URL
      // Video ID can contain hyphens and alphanumeric characters (UUID format)
      const match = playerUrl.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
      if (match) {
        const [, libraryId, videoId] = match;
        // Convert to direct stream URL using correct Bunny CDN format
        // Format: https://{pull_zone_url}.b-cdn.net/{video_id}/play_720p.mp4
        return `https://vz-${libraryId}.b-cdn.net/${videoId}/play_720p.mp4`;
      }
    }
    
    // Check if it's already a direct video URL
    if (playerUrl.includes('.b-cdn.net') && playerUrl.includes('.mp4')) {
      return playerUrl;
    }
    
    // For other URLs, return as-is (fallback)
    return playerUrl;
  } catch (error) {
    console.error('Error converting video URL:', error);
    return playerUrl;
  }
}

export function generateVideoTitleWithTimestamp(userTimestamp?: string): string {
  const baseTitle = `Recording`;
  
  // If userTimestamp is provided, use it; otherwise fall back to server time
  const now = userTimestamp ? new Date(userTimestamp) : new Date();
  const timestamp = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${baseTitle} - ${timestamp}`;
}

export function createVideoSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim()
    .substring(0, 50); // Limit length
}

/**
 * Extracts the duration from a video blob
 * @param blob - The video blob to analyze
 * @returns Promise<number> - Duration in seconds, or 0 if unable to determine
 */
export async function getVideoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    try {
      // Create a video element to load the blob
      const video = document.createElement("video");
      const url = URL.createObjectURL(blob);

      video.preload = "metadata";

      video.onloadedmetadata = () => {
        // Clean up the object URL
        URL.revokeObjectURL(url);

        // Return the duration in seconds
        const duration = video.duration;
        resolve(isNaN(duration) || !isFinite(duration) ? 0 : duration);
      };

      video.onerror = () => {
        // Clean up the object URL
        URL.revokeObjectURL(url);
        console.warn("Failed to load video metadata for duration extraction");
        resolve(0);
      };

      // Set the source to trigger metadata loading
      video.src = url;
    } catch (error) {
      console.error("Error extracting video duration:", error);
      resolve(0);
    }
  });
}

/**
 * Formats duration in seconds to a human-readable string (MM:SS or HH:MM:SS)
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Generates a thumbnail from a video blob
 * @param videoBlob - The video blob to generate thumbnail from
 * @param time - Time in seconds to capture the thumbnail (default: 1)
 * @returns Promise<Blob | null> - Thumbnail as a blob, or null if failed
 */
export async function generateThumbnailFromVideoBlob(
  videoBlob: Blob,
  time: number = 1
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      // Create a video element to load the blob
      const video = document.createElement("video");
      const url = URL.createObjectURL(videoBlob);

      video.preload = "metadata";
      video.muted = true;

      video.onloadedmetadata = () => {
        // Set the time to capture the thumbnail
        video.currentTime = Math.min(time, video.duration || time);
      };

      video.onseeked = () => {
        // Create a canvas to draw the thumbnail
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Draw the current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              // Clean up the object URL
              URL.revokeObjectURL(url);
              resolve(blob);
            },
            "image/jpeg",
            0.8
          );
        } else {
          // Clean up the object URL
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      video.onerror = () => {
        // Clean up the object URL
        URL.revokeObjectURL(url);
        console.warn("Failed to load video for thumbnail generation");
        resolve(null);
      };

      // Set the source to trigger metadata loading
      video.src = url;
    } catch (error) {
      console.error("Error generating thumbnail from video blob:", error);
      resolve(null);
    }
  });
}
