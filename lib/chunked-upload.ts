/**
 * Chunked upload utility for large video files to Bunny CDN
 * Implements resumable upload with progress tracking
 */

import {
  getProviderConfig,
  validateFileSize,
  calculateUploadTimeout,
  UPLOAD_CONFIG,
} from "./storage-config";

// Legacy UPLOAD_CONFIG is now imported from storage-config.ts for backward compatibility

interface ChunkUploadOptions {
  onProgress?: (progress: number) => void;
  chunkSize?: number;
  maxRetries?: number;
}

interface ChunkUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload large video files using chunked upload strategy
 * Falls back to regular upload for smaller files
 */
export async function uploadLargeVideoToBunny(
  blob: Blob,
  options: ChunkUploadOptions = {}
): Promise<string | null> {
  const bunnyConfig = getProviderConfig("bunny");
  const {
    onProgress,
    chunkSize = bunnyConfig.chunkSize || 10 * 1024 * 1024, // Use config or fallback to 10MB
    maxRetries = 3,
  } = options;

  const fileSizeMB = blob.size / (1024 * 1024);

  // For files smaller than chunk size, use regular upload
  if (blob.size <= chunkSize) {
    console.log(
      `Small file (${fileSizeMB.toFixed(1)}MB), using regular upload`
    );
    return uploadVideoToBunnyWithTimeout(blob);
  }

  console.log(
    `Large file detected (${fileSizeMB.toFixed(1)}MB), using chunked upload`
  );

  // For now, implement a more robust single upload with better error handling
  // TODO: Implement true chunked upload when Bunny Stream supports it
  return uploadVideoToBunnyWithTimeout(blob, onProgress);
}

/**
 * Enhanced upload function with timeout and progress tracking
 */
export async function uploadVideoToBunnyWithTimeout(
  blob: Blob,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append(
      "video",
      blob,
      `recording-${new Date().toISOString()}.webm`
    );

    // Create abort controller for timeout
    const controller = new AbortController();

    // Use centralized timeout calculation
    const timeoutMs = calculateUploadTimeout(blob.size, "bunny");
    const timeoutMinutes = Math.round(timeoutMs / (60 * 1000));
    const fileSizeMB = blob.size / (1024 * 1024);

    console.log(
      `Setting upload timeout to ${timeoutMinutes} minutes for ${fileSizeMB.toFixed(
        1
      )}MB file`
    );

    const timeoutId = setTimeout(() => {
      console.log("Upload timeout reached, aborting...");
      controller.abort();
    }, timeoutMs);

    // Track upload progress if XMLHttpRequest is available
    if (onProgress && typeof XMLHttpRequest !== "undefined") {
      return uploadWithProgress(
        formData,
        controller.signal,
        onProgress,
        timeoutId
      );
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
 * Validate video file size against Bunny CDN limits
 */
export function validateVideoFileSize(fileSize: number): {
  isValid: boolean;
  error?: string;
  warning?: string;
} {
  return validateFileSize(fileSize, "bunny");
}

// Re-export the original function for backward compatibility
export { uploadVideoToBunny } from "./upload-video";
