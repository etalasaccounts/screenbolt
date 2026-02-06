/**
 * Centralized Storage Configuration
 *
 * This file contains all storage provider configurations and upload limits.
 * When updating MAX_FILE_SIZE_MB, also update next.config.js api.bodyParser.sizeLimit
 */

export type StorageProvider = "bunny" | "dropbox" | "google-drive";

export interface ProviderConfig {
  name: string;
  maxFileSizeMB: number;
  maxFileSize: number; // in bytes
  chunkSize?: number; // in bytes
  supportsChunkedUpload: boolean;
  directUploadLimit?: number; // in bytes, for providers that support both direct and chunked
  largeFileWarningMB?: number;
  timeoutConfig?: {
    minTimeout: number; // in milliseconds
    timeoutPerMB: number; // in milliseconds per MB
  };
}

export const STORAGE_PROVIDERS: Record<StorageProvider, ProviderConfig> = {
  bunny: {
    name: "Bunny CDN",
    maxFileSizeMB: 10240, // 10GB with TUS chunked uploads
    maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB in bytes
    chunkSize: 5 * 1024 * 1024, // 5MB chunks for TUS
    supportsChunkedUpload: true,
    largeFileWarningMB: 1024, // 1GB warning
    timeoutConfig: {
      minTimeout: 5 * 60 * 1000, // 5 minutes
      timeoutPerMB: 1 * 1000, // 1 second per MB (faster with chunked)
    },
  },
  dropbox: {
    name: "Dropbox",
    maxFileSizeMB: 358400, // 350GB theoretical limit
    maxFileSize: 350 * 1024 * 1024 * 1024, // 350GB in bytes
    chunkSize: 8 * 1024 * 1024, // 8MB chunks for upload_session
    directUploadLimit: 150 * 1024 * 1024, // 150MB direct upload limit
    supportsChunkedUpload: true, // via upload_session for larger files
    largeFileWarningMB: 1024, // 1GB warning
    timeoutConfig: {
      minTimeout: 10 * 60 * 1000, // 10 minutes
      timeoutPerMB: 500, // 0.5 seconds per MB
    },
  },
  "google-drive": {
    name: "Google Drive",
    maxFileSizeMB: 5120000, // 5TB theoretical limit
    maxFileSize: 5 * 1024 * 1024 * 1024 * 1024, // 5TB in bytes
    chunkSize: 256 * 1024, // 256KB chunks for resumable uploads
    supportsChunkedUpload: true,
    largeFileWarningMB: 2048, // 2GB warning
    timeoutConfig: {
      minTimeout: 15 * 60 * 1000, // 15 minutes
      timeoutPerMB: 300, // 0.3 seconds per MB
    },
  },
};

export const GLOBAL_CONFIG = {
  // Global settings that apply to all providers
  supportedVideoFormats: ["mp4", "mov", "avi", "mkv", "webm", "flv", "3gp"],
  supportedImageFormats: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
  maxConcurrentUploads: 3,
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  
  // Chunked upload settings
  defaultChunkSize: 5 * 1024 * 1024, // 5MB default
  minChunkSize: 256 * 1024, // 256KB minimum
  maxChunkSize: 32 * 1024 * 1024, // 32MB maximum
  
  // Progress reporting
  progressReportInterval: 500, // Report progress every 500ms
  
  // Compression settings
  enableAutoCompression: true,
  compressionThresholdMB: 100, // Auto-compress files larger than 100MB
  
  // Fallback settings
  enableProviderFallback: true,
  fallbackOrder: ["bunny", "dropbox", "google-drive"] as StorageProvider[],
} as const;

/**
 * Get configuration for a specific storage provider
 */
export function getProviderConfig(provider: StorageProvider): ProviderConfig {
  const config = STORAGE_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown storage provider: ${provider}`);
  }
  return config;
}

/**
 * Validate file size against provider limits
 */
export function validateFileSize(
  fileSizeBytes: number,
  provider: StorageProvider,
  useDirectUpload = false
): { isValid: boolean; error?: string; warning?: string } {
  const config = getProviderConfig(provider);

  // Check against direct upload limit if specified and using direct upload
  const limit =
    useDirectUpload && config.directUploadLimit
      ? config.directUploadLimit
      : config.maxFileSize;

  const limitMB = limit / (1024 * 1024);

  if (fileSizeBytes > limit) {
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    return {
      isValid: false,
      error: `File size (${fileSizeMB.toFixed(1)}MB) exceeds ${
        config.name
      } limit of ${limitMB}MB${
        useDirectUpload && config.supportsChunkedUpload
          ? ". Consider using chunked upload for larger files."
          : ""
      }`,
    };
  }

  // Check for large file warning
  if (
    config.largeFileWarningMB &&
    fileSizeBytes > config.largeFileWarningMB * 1024 * 1024
  ) {
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    return {
      isValid: true,
      warning: `Large file detected (${fileSizeMB.toFixed(
        1
      )}MB). Upload may take longer than usual.`,
    };
  }

  return { isValid: true };
}

/**
 * Calculate timeout for upload based on file size and provider
 */
export function calculateUploadTimeout(
  fileSizeBytes: number,
  provider: StorageProvider
): number {
  const config = getProviderConfig(provider);

  if (!config.timeoutConfig) {
    // Default timeout: 5 minutes + 1 second per MB
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    return Math.max(5 * 60 * 1000, fileSizeMB * 1000);
  }

  const { minTimeout, timeoutPerMB } = config.timeoutConfig;
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  return Math.max(minTimeout, fileSizeMB * timeoutPerMB);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Check if file type is supported
 */
export function isFileTypeSupported(
  filename: string,
  type: "video" | "image" = "video"
): boolean {
  const extension = getFileExtension(filename);
  const supportedFormats =
    type === "video"
      ? GLOBAL_CONFIG.supportedVideoFormats
      : GLOBAL_CONFIG.supportedImageFormats;

  return (supportedFormats as readonly string[]).includes(extension);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Legacy exports for backward compatibility - now uses unified system defaults
export const UPLOAD_CONFIG = {
  // Use the largest provider limits for backward compatibility
  MAX_FILE_SIZE: Math.max(...Object.values(STORAGE_PROVIDERS).map(p => p.maxFileSize)),
  MAX_FILE_SIZE_MB: Math.max(...Object.values(STORAGE_PROVIDERS).map(p => p.maxFileSizeMB)),
  LARGE_FILE_WARNING_MB: GLOBAL_CONFIG.compressionThresholdMB,
  CHUNK_SIZE: GLOBAL_CONFIG.defaultChunkSize,
  MIN_TIMEOUT: 5 * 60 * 1000, // 5 minutes minimum
  TIMEOUT_PER_MB: 500, // 0.5 seconds per MB average
} as const;

/**
 * Get optimal chunk size for a provider
 */
export function getOptimalChunkSize(provider: StorageProvider, fileSize: number): number {
  const config = getProviderConfig(provider);
  const providerChunkSize = config.chunkSize || GLOBAL_CONFIG.defaultChunkSize;
  
  // For very large files, use larger chunks to reduce overhead
  if (fileSize > 1024 * 1024 * 1024) { // > 1GB
    return Math.min(providerChunkSize * 2, GLOBAL_CONFIG.maxChunkSize);
  }
  
  return providerChunkSize;
}

/**
 * Check if chunked upload should be used for a file
 */
export function shouldUseChunkedUpload(
  provider: StorageProvider, 
  fileSize: number
): boolean {
  const config = getProviderConfig(provider);
  
  if (!config.supportsChunkedUpload) {
    return false;
  }
  
  // Always use chunked upload for files larger than direct upload limit
  if (config.directUploadLimit && fileSize > config.directUploadLimit) {
    return true;
  }
  
  // Use chunked upload for files larger than 50MB for better reliability
  return fileSize > 50 * 1024 * 1024;
}