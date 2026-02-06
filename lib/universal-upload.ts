import { bunnyProvider } from "./providers/bunny-provider";
import { dropboxProvider } from "./providers/dropbox-provider";
import { googleDriveProvider } from "./providers/google-drive-provider";
import { compressVideo, VideoQualityPreset } from "./video-compression";
import { STORAGE_PROVIDERS } from "./storage-config";

export type UploadProvider = "bunny" | "dropbox" | "google-drive";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: "compressing" | "uploading" | "finalizing";
  provider: UploadProvider;
}

export interface UploadOptions {
  provider: UploadProvider;
  file: File;
  filename?: string;
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error) => void;
  compressionQuality?: VideoQualityPreset;
  enableCompression?: boolean;
  maxRetries?: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  streamUrl?: string;
  embedUrl?: string;
  provider: UploadProvider;
  fileSize: number;
  originalFileSize: number;
  compressed: boolean;
  error?: string;
}

export interface ProviderInterface {
  upload(
    file: File,
    options: {
      filename?: string;
      onProgress?: (progress: UploadProgress) => void;
    }
  ): Promise<UploadResult>;
  validateFile(file: File): Promise<boolean>;
  getMaxFileSize(): number;
  supportsChunkedUpload(): boolean;
}

const providers: Record<UploadProvider, ProviderInterface> = {
  bunny: bunnyProvider,
  dropbox: dropboxProvider,
  "google-drive": googleDriveProvider,
};

/**
 * Universal video upload function that handles all providers with chunked uploads
 */
export async function uploadVideo(
  options: UploadOptions
): Promise<UploadResult> {
  const {
    provider,
    file,
    filename,
    onProgress,
    onError,
    compressionQuality = "medium",
    enableCompression = true,
    maxRetries = 3,
  } = options;

  let currentFile = file;
  let compressed = false;
  const originalFileSize = file.size;

  try {
    // Get provider instance
    const providerInstance = providers[provider];
    if (!providerInstance) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Validate file
    const isValid = await providerInstance.validateFile(currentFile);
    if (!isValid) {
      throw new Error(`File validation failed for provider: ${provider}`);
    }

    // Check if compression is needed or requested
    const maxFileSize = providerInstance.getMaxFileSize();
    const providerConfig = STORAGE_PROVIDERS[provider];
    if (!providerConfig) {
      throw new Error(`Invalid provider: ${provider}`);
    }
    
    const needsCompression =
      enableCompression &&
      (currentFile.size > maxFileSize ||
        currentFile.size >
          (providerConfig.largeFileWarningMB || 1024) * 1024 * 1024);

    if (needsCompression) {
      onProgress?.({
        loaded: 0,
        total: currentFile.size,
        percentage: 0,
        stage: "compressing",
        provider,
      });

      try {
        currentFile = await compressVideo(
          currentFile,
          compressionQuality,
          (progress) => {
            onProgress?.({
              loaded: progress.loaded,
              total: progress.total,
              percentage: progress.percentage,
              stage: "compressing",
              provider,
            });
          }
        );
        compressed = true;
      } catch (compressionError) {
        console.warn(
          "Video compression failed, proceeding with original file:",
          compressionError
        );
        // Continue with original file if compression fails
      }
    }

    // Attempt upload with retries
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await providerInstance.upload(currentFile, {
          filename: filename || file.name,
          onProgress: (progress) => {
            onProgress?.({
              ...progress,
              stage: "uploading",
              provider,
            });
          },
        });

        if (result.success) {
          return {
            ...result,
            originalFileSize,
            compressed,
            fileSize: currentFile.size,
          };
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Upload attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    // All retries failed
    throw lastError || new Error("Upload failed after all retries");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown upload error";
    onError?.(error as Error);

    return {
      success: false,
      provider,
      fileSize: currentFile.size,
      originalFileSize,
      compressed,
      error: errorMessage,
    };
  }
}

/**
 * Upload with automatic provider fallback
 */
export async function uploadVideoWithFallback(
  file: File,
  preferredProviders: UploadProvider[],
  options: Omit<UploadOptions, "provider" | "file"> = {}
): Promise<UploadResult> {
  let lastError: Error | null = null;

  for (const provider of preferredProviders) {
    try {
      const result = await uploadVideo({
        ...options,
        provider,
        file,
      });

      if (result.success) {
        return result;
      } else {
        lastError = new Error(
          result.error || `Upload failed for provider: ${provider}`
        );
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`Provider ${provider} failed:`, error);
    }
  }

  // All providers failed
  throw lastError || new Error("All upload providers failed");
}

/**
 * Get available providers based on user configuration
 */
export function getAvailableProviders(): UploadProvider[] {
  const available: UploadProvider[] = [];

  // Always include Bunny as it's the primary provider
  available.push("bunny");

  // Check if other providers are configured
  if (typeof window !== "undefined") {
    // Check for Dropbox
    if (localStorage.getItem("dropbox_access_token")) {
      available.push("dropbox");
    }

    // Check for Google Drive
    if (localStorage.getItem("google_drive_access_token")) {
      available.push("google-drive");
    }
  }

  return available;
}

/**
 * Get recommended provider based on file size and user preferences
 */
export function getRecommendedProvider(fileSize: number): UploadProvider {
  const available = getAvailableProviders();

  // For very large files, prefer Google Drive if available
  if (fileSize > 500 * 1024 * 1024 && available.includes("google-drive")) {
    return "google-drive";
  }

  // For medium files, prefer Dropbox if available
  if (fileSize > 100 * 1024 * 1024 && available.includes("dropbox")) {
    return "dropbox";
  }

  // Default to Bunny
  return "bunny";
}

/**
 * Estimate upload time based on file size and provider
 */
export function estimateUploadTime(
  fileSize: number,
  provider: UploadProvider
): number {
  // Rough estimates in seconds based on average upload speeds
  const speedEstimates = {
    bunny: 5 * 1024 * 1024, // 5 MB/s
    dropbox: 3 * 1024 * 1024, // 3 MB/s
    "google-drive": 4 * 1024 * 1024, // 4 MB/s
  };

  return Math.ceil(fileSize / speedEstimates[provider]);
}