/**
 * UploadService - Business logic for video uploads.
 *
 * Handles chunked and simple upload flows, delegating storage to Bunny CDN
 * (via lib/storage) and database operations to lib/db.
 */

import { isStorageConfigured, putObject, createMultipartUpload, uploadPart, completeMultipartUpload } from '@/lib/integrations/bunny';
import { createVideo } from '@/lib/db/videos';
import { generateVideoTitleWithTimestamp } from '@/lib/shared/video';

/**
 * Result from uploading a file (video or thumbnail).
 */
export interface UploadedFile {
  url: string;
  pathname: string;
}

/**
 * Result from completing a chunked upload.
 */
export interface ChunkedUploadCompletion {
  url: string;
  video: Awaited<ReturnType<typeof createVideo>>;
}

/**
 * Result from initiating a chunked upload.
 */
export interface InitChunkedUploadResult {
  uploadId: string;
  key: string;
  pathname: string;
}

export class UploadService {
  /**
   * Check if Bunny storage is properly configured.
   */
  static checkStorageConfiguration(): boolean {
    return isStorageConfigured();
  }

  /**
   * Simple single-file upload: stores video and optional thumbnail to Bunny,
   * then creates a video record.
   */
  static async uploadSimple(
    video: File,
    userId: string,
    workspaceId: string,
    title?: string,
    duration?: number | null,
    thumbnail?: File | null,
  ): Promise<{ url: string; video: Awaited<ReturnType<typeof createVideo>> }> {
    // Upload video to Bunny
    const filename = video.name || `recording-${Date.now()}.webm`;
    const ext = filename.split('.').pop()?.toLowerCase() || 'webm';
    const uploaded = await putObject(`videos/${crypto.randomUUID()}.${ext}`, video, video.type || undefined);

    // Optional thumbnail upload
    let thumbnailUrl: string | null = null;
    if (thumbnail && thumbnail.type.startsWith('image/')) {
      const thumbUploaded = await putObject(
        `thumbnails/${crypto.randomUUID()}.jpg`,
        thumbnail,
        thumbnail.type,
      );
      thumbnailUrl = thumbUploaded.url;
    }

    // Create video record
    const record = await createVideo({
      title: title || generateVideoTitleWithTimestamp(),
      videoUrl: uploaded.url,
      thumbnailUrl,
      duration: duration && !isNaN(duration) ? duration : null,
      source: 'bunny',
      userId,
      workspaceId,
    });

    return { url: uploaded.url, video: record };
  }

  /**
   * Chunked upload step 1: Initialize a multipart upload session.
   * Returns uploadId, key (pathname), and pathname for the client to use in subsequent steps.
   */
  static async initChunkedUpload(
    filename: string,
    contentType?: string,
  ): Promise<InitChunkedUploadResult> {
    const ext = filename.split('.').pop()?.toLowerCase() || 'webm';
    const pathname = `videos/${crypto.randomUUID()}.${ext}`;

    const { key, uploadId } = await createMultipartUpload(
      pathname,
      contentType ?? 'application/octet-stream',
    );

    return { uploadId, key, pathname };
  }

  /**
   * Chunked upload step 2: Upload a single part (chunk).
   * Returns the part etag and number for the client to use in completion.
   */
  static async uploadChunk(
    uploadId: string,
    partNumber: number,
    body: ArrayBuffer,
  ): Promise<{ etag: string; partNumber: number }> {
    const part = await uploadPart(body, { uploadId, partNumber });
    return part;
  }

  /**
   * Chunked upload step 3: Finalize the upload, assemble parts, and create video record.
   */
  static async completeChunkedUpload(
    uploadId: string,
    pathname: string,
    parts: Array<{ etag: string; partNumber: number }>,
    userId: string,
    workspaceId: string,
    title?: string,
    duration?: number | null,
    thumbnailUrl?: string | null,
  ): Promise<ChunkedUploadCompletion> {
    // Finalize in storage (assemble parts)
    const uploaded = await completeMultipartUpload(pathname, parts, { uploadId });

    // Create video record
    const record = await createVideo({
      title: title || generateVideoTitleWithTimestamp(),
      videoUrl: uploaded.url,
      thumbnailUrl: thumbnailUrl ?? null,
      duration: duration ?? null,
      source: 'bunny',
      userId,
      workspaceId,
    });

    return { url: uploaded.url, video: record };
  }

  /**
   * Upload a thumbnail image to Bunny.
   */
  static async uploadThumbnail(thumbnail: File): Promise<{ url: string }> {
    const uploaded = await putObject(
      `thumbnails/${crypto.randomUUID()}.jpg`,
      thumbnail,
      thumbnail.type,
    );
    return { url: uploaded.url };
  }
}
