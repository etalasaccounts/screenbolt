// Grabs a single frame from a video URL as a JPEG blob, for the library
// grid's thumbnail. Used by both the editor's save-destination adapter
// (recorded/edited videos) and the plain file-upload button. Best-effort:
// any failure just means no thumbnail, never a failed upload.
export function captureThumbnail(videoUrl: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    let settled = false;
    const finish = (result: Blob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      video.removeAttribute("src");
      video.load();
      resolve(result);
    };

    const timeoutId = setTimeout(() => finish(null), 6000);

    video.addEventListener("error", () => finish(null));
    video.addEventListener(
      "loadedmetadata",
      () => {
        // A couple seconds in avoids capturing a black/blank first frame.
        video.currentTime = Math.min(2, (video.duration || 4) / 4);
      },
      { once: true },
    );
    video.addEventListener(
      "seeked",
      () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          if (canvas.width === 0 || canvas.height === 0) return finish(null);
          const ctx = canvas.getContext("2d");
          if (!ctx) return finish(null);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.82);
        } catch {
          finish(null);
        }
      },
      { once: true },
    );

    video.src = videoUrl;
  });
}
