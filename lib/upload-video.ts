import { calculateUploadTimeout, validateFileSize } from "./storage-config";

/**
 * Uploads a video blob to Bunny.net via the API route
 * Enhanced with timeout and better error handling
 * @param blob - The video blob to upload
 * @param onProgress - Optional progress callback
 * @returns The URL of the uploaded video or null if error
 */
export async function uploadVideoToBunny(
  blob: Blob,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    // Create form data for the upload
    const formData = new FormData();
    formData.append(
      "video",
      blob,
      `recording-${new Date().toISOString()}.webm`
    );

    // Create abort controller for timeout
    const controller = new AbortController();
    const fileSizeMB = blob.size / (1024 * 1024);

    // Calculate timeout based on file size using centralized config
    const timeoutMs = calculateUploadTimeout(blob.size, "bunny");
    const timeoutMinutes = Math.round(timeoutMs / (60 * 1000));

    console.log(
      `Uploading ${fileSizeMB.toFixed(
        1
      )}MB file with ${timeoutMinutes} minute timeout`
    );

    const timeoutId = setTimeout(() => {
      console.log("Upload timeout reached, aborting...");
      controller.abort();
    }, timeoutMs);

    // Track upload progress if XMLHttpRequest is available and callback provided
    if (onProgress && typeof XMLHttpRequest !== "undefined") {
      const result = await uploadWithProgress(
        formData,
        controller.signal,
        onProgress,
        timeoutId
      );
      return result;
    }

    // Fallback to fetch with timeout
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Upload failed with status ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Upload failed");
    }

    return data.url;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("Upload timeout - file too large or connection slow");
        throw new Error(
          "Upload timeout. File mungkin terlalu besar atau koneksi lambat. Coba kompres video atau gunakan koneksi yang lebih stabil."
        );
      }
      console.error("Error uploading video to Bunny:", error.message);
      throw error;
    }
    console.error("Unknown error uploading video to Bunny:", String(error));
    return null;
  }
}

/**
 * Upload with XMLHttpRequest for progress tracking
 */
function uploadWithProgress(
  formData: FormData,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  timeoutId: NodeJS.Timeout
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle abort signal
    signal.addEventListener("abort", () => {
      xhr.abort();
      reject(new Error("Upload aborted due to timeout"));
    });

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      clearTimeout(timeoutId);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            resolve(data.url);
          } else {
            reject(new Error(data.error || "Upload failed"));
          }
        } catch (e) {
          reject(new Error("Invalid response from server"));
        }
      } else {
        reject(
          new Error(
            `Upload failed with status ${xhr.status}: ${xhr.responseText}`
          )
        );
      }
    });

    xhr.addEventListener("error", () => {
      clearTimeout(timeoutId);
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("timeout", () => {
      clearTimeout(timeoutId);
      reject(new Error("Upload timeout"));
    });

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  });
}

/**
 * Validate file size before upload
 */
export function validateVideoFileSize(blob: Blob): {
  valid: boolean;
  error?: string;
} {
  const validation = validateFileSize(blob.size, "bunny");

  if (!validation.isValid) {
    return {
      valid: false,
      error: validation.error || "File size validation failed",
    };
  }

  if (validation.warning) {
    console.warn(validation.warning);
  }

  return { valid: true };
}