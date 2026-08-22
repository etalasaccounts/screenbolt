/**
 * Tests for UploadService.
 *
 * Tests verify simple and chunked upload flows, title generation, and storage
 * configuration checks.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the integrations and database
vi.mock('@/lib/integrations/bunny', () => ({
  isStorageConfigured: vi.fn(() => true),
  putObject: vi.fn(),
  createMultipartUpload: vi.fn(),
  uploadPart: vi.fn(),
  completeMultipartUpload: vi.fn(),
}));

vi.mock('@/lib/db/videos', () => ({
  createVideo: vi.fn(),
}));

vi.mock('@/lib/shared/video', () => ({
  generateVideoTitleWithTimestamp: vi.fn(() => 'Recording 2024-01-01 12:00:00'),
}));

// eslint-disable-next-line no-restricted-imports
import { UploadService } from './upload.service';
import {
  isStorageConfigured,
  putObject,
  createMultipartUpload,
  uploadPart,
  completeMultipartUpload,
} from '@/lib/integrations/bunny';
import { createVideo } from '@/lib/db/videos';
import { generateVideoTitleWithTimestamp } from '@/lib/shared/video';

const mockIsStorageConfigured = vi.mocked(isStorageConfigured);
const mockPutObject = vi.mocked(putObject);
const mockCreateMultipartUpload = vi.mocked(createMultipartUpload);
const mockUploadPart = vi.mocked(uploadPart);
const mockCompleteMultipartUpload = vi.mocked(completeMultipartUpload);
const mockCreateVideo = vi.mocked(createVideo);
const mockGenerateVideoTitleWithTimestamp = vi.mocked(generateVideoTitleWithTimestamp);

describe('UploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkStorageConfiguration', () => {
    it('returns true when storage is configured', async () => {
      mockIsStorageConfigured.mockReturnValueOnce(true);

      const result = UploadService.checkStorageConfiguration();

      expect(result).toBe(true);
    });

    it('returns false when storage is not configured', async () => {
      mockIsStorageConfigured.mockReturnValueOnce(false);

      const result = UploadService.checkStorageConfiguration();

      expect(result).toBe(false);
    });
  });

  describe('uploadSimple', () => {
    it('uploads video with provided title', async () => {
      const videoFile = new File(['video data'], 'test.webm', { type: 'video/webm' });
      const mockVideo = {
        id: 'v-1',
        title: 'My Recording',
        videoUrl: 'https://bunny.com/video.webm',
      };

      mockPutObject.mockResolvedValueOnce({
        url: 'https://bunny.com/video.webm',
        pathname: 'videos/some-uuid.webm',
      });
      mockCreateVideo.mockResolvedValueOnce(mockVideo as any);

      const result = await UploadService.uploadSimple(
        videoFile,
        'user-1',
        'ws-1',
        'My Recording',
        120
      );

      expect(result.url).toBe('https://bunny.com/video.webm');
      expect(result.video).toEqual(mockVideo);
      expect(mockCreateVideo).toHaveBeenCalledWith({
        title: 'My Recording',
        videoUrl: 'https://bunny.com/video.webm',
        thumbnailUrl: null,
        duration: 120,
        source: 'bunny',
        userId: 'user-1',
        workspaceId: 'ws-1',
      });
    });

    it('generates default title when not provided', async () => {
      const videoFile = new File(['video data'], 'test.webm');
      mockPutObject.mockResolvedValueOnce({
        url: 'https://bunny.com/video.webm',
        pathname: 'videos/some-uuid.webm',
      });
      mockCreateVideo.mockResolvedValueOnce({ id: 'v-1' } as any);

      await UploadService.uploadSimple(
        videoFile,
        'user-1',
        'ws-1',
        undefined,
        120
      );

      expect(mockGenerateVideoTitleWithTimestamp).toHaveBeenCalled();
      expect(mockCreateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Recording 2024-01-01 12:00:00',
        })
      );
    });

    it('extracts file extension from filename', async () => {
      const videoFile = new File(['video data'], 'recording.mp4');
      mockPutObject.mockResolvedValueOnce({
        url: 'https://bunny.com/video.mp4',
        pathname: 'videos/some-uuid.mp4',
      });
      mockCreateVideo.mockResolvedValueOnce({ id: 'v-1' } as any);

      await UploadService.uploadSimple(videoFile, 'user-1', 'ws-1', 'Test', 60);

      const firstCall = mockPutObject.mock.calls[0];
      expect(firstCall[0]).toMatch(/\.mp4$/);
    });

    it('uses filename as extension when file has no dot', async () => {
      const videoFile = new File(['video data'], 'recording');
      mockPutObject.mockResolvedValueOnce({
        url: 'https://bunny.com/video.recording',
        pathname: 'videos/some-uuid.recording',
      });
      mockCreateVideo.mockResolvedValueOnce({ id: 'v-1' } as any);

      await UploadService.uploadSimple(videoFile, 'user-1', 'ws-1', 'Test', 60);

      // When there's no dot, the whole filename becomes the extension
      const firstCall = mockPutObject.mock.calls[0];
      expect(firstCall[0]).toMatch(/\.recording$/);
    });

    it('uploads thumbnail if provided', async () => {
      const videoFile = new File(['video data'], 'test.webm');
      const thumbnailFile = new File(['thumbnail data'], 'thumb.jpg', { type: 'image/jpeg' });

      mockPutObject
        .mockResolvedValueOnce({
          url: 'https://bunny.com/video.webm',
          pathname: 'videos/some-uuid.webm',
        })
        .mockResolvedValueOnce({
          url: 'https://bunny.com/thumb.jpg',
          pathname: 'thumbnails/some-uuid.jpg',
        });
      mockCreateVideo.mockResolvedValueOnce({ id: 'v-1' } as any);

      await UploadService.uploadSimple(
        videoFile,
        'user-1',
        'ws-1',
        'Test',
        60,
        thumbnailFile
      );

      expect(mockPutObject).toHaveBeenCalledTimes(2);
      expect(mockCreateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnailUrl: 'https://bunny.com/thumb.jpg',
        })
      );
    });

    it('skips thumbnail if not an image type', async () => {
      const videoFile = new File(['video data'], 'test.webm');
      const notAnImage = new File(['data'], 'file.txt', { type: 'text/plain' });

      mockPutObject.mockResolvedValueOnce({
        url: 'https://bunny.com/video.webm',
        pathname: 'videos/some-uuid.webm',
      });
      mockCreateVideo.mockResolvedValueOnce({ id: 'v-1' } as any);

      await UploadService.uploadSimple(
        videoFile,
        'user-1',
        'ws-1',
        'Test',
        60,
        notAnImage
      );

      expect(mockCreateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnailUrl: null,
        })
      );
    });

    it('handles NaN duration by setting to null', async () => {
      const videoFile = new File(['video data'], 'test.webm');
      mockPutObject.mockResolvedValueOnce({
        url: 'https://bunny.com/video.webm',
        pathname: 'videos/some-uuid.webm',
      });
      mockCreateVideo.mockResolvedValueOnce({ id: 'v-1' } as any);

      await UploadService.uploadSimple(
        videoFile,
        'user-1',
        'ws-1',
        'Test',
        NaN
      );

      expect(mockCreateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: null,
        })
      );
    });
  });

  describe('initChunkedUpload', () => {
    it('initializes multipart upload with pathname and uploadId', async () => {
      mockCreateMultipartUpload.mockResolvedValueOnce({
        uploadId: '123e4567-e89b-12d3-a456-426614174000' as any,
        key: 'videos/uuid-abc.webm',
      });

      const result = await UploadService.initChunkedUpload('video.webm', 'video/webm');

      expect(result.uploadId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.pathname).toMatch(/^videos\/.*\.webm$/);
      expect(result.key).toBe('videos/uuid-abc.webm');
    });

    it('extracts extension from filename', async () => {
      mockCreateMultipartUpload.mockResolvedValueOnce({
        uploadId: '123e4567-e89b-12d3-a456-426614174000' as any,
        key: 'videos/uuid-abc.mp4',
      });

      await UploadService.initChunkedUpload('recording.mp4');

      expect(mockCreateMultipartUpload).toHaveBeenCalledWith(
        expect.stringContaining('.mp4'),
        'application/octet-stream'
      );
    });

    it('uses filename as extension when file has no dot', async () => {
      mockCreateMultipartUpload.mockResolvedValueOnce({
        uploadId: '123e4567-e89b-12d3-a456-426614174000' as any,
        key: 'videos/uuid-abc.recording',
      });

      await UploadService.initChunkedUpload('recording');

      // When there's no dot, split().pop() returns the whole filename
      expect(mockCreateMultipartUpload).toHaveBeenCalledWith(
        expect.stringContaining('.recording'),
        'application/octet-stream'
      );
    });

    it('uses provided content type', async () => {
      mockCreateMultipartUpload.mockResolvedValueOnce({
        uploadId: '123e4567-e89b-12d3-a456-426614174000' as any,
        key: 'videos/uuid-abc.mp4',
      });

      await UploadService.initChunkedUpload('video.mp4', 'video/mp4');

      expect(mockCreateMultipartUpload).toHaveBeenCalledWith(
        expect.anything(),
        'video/mp4'
      );
    });
  });

  describe('uploadChunk', () => {
    it('uploads a part and returns etag and part number', async () => {
      const uploadId = '123e4567-e89b-12d3-a456-426614174000' as any;
      mockUploadPart.mockResolvedValueOnce({
        etag: 'etag-123',
        partNumber: 1,
      });

      const body = new ArrayBuffer(1000);
      const result = await UploadService.uploadChunk(
        uploadId,
        1,
        body
      );

      expect(result).toEqual({
        etag: 'etag-123',
        partNumber: 1,
      });
      expect(mockUploadPart).toHaveBeenCalledWith(body, {
        uploadId,
        partNumber: 1,
      });
    });
  });

  describe('completeChunkedUpload', () => {
    it('completes upload and creates video record with provided title', async () => {
      const mockVideo = {
        id: 'v-1',
        title: 'My Recording',
        videoUrl: 'https://bunny.com/video.webm',
      };

      mockCompleteMultipartUpload.mockResolvedValueOnce({
        url: 'https://bunny.com/video.webm',
      });
      mockCreateVideo.mockResolvedValueOnce(mockVideo as any);

      const result = await UploadService.completeChunkedUpload(
        'upload-123',
        'videos/some-uuid.webm',
        [{ etag: 'etag-1', partNumber: 1 }],
        'user-1',
        'ws-1',
        'My Recording',
        120,
        'https://bunny.com/thumb.jpg'
      );

      expect(result).toEqual({
        url: 'https://bunny.com/video.webm',
        video: mockVideo,
      });
      expect(mockCreateVideo).toHaveBeenCalledWith({
        title: 'My Recording',
        videoUrl: 'https://bunny.com/video.webm',
        thumbnailUrl: 'https://bunny.com/thumb.jpg',
        duration: 120,
        source: 'bunny',
        userId: 'user-1',
        workspaceId: 'ws-1',
      });
    });

    it('generates default title when not provided', async () => {
      mockCompleteMultipartUpload.mockResolvedValueOnce({
        url: 'https://bunny.com/video.webm',
      });
      mockCreateVideo.mockResolvedValueOnce({ id: 'v-1' } as any);

      await UploadService.completeChunkedUpload(
        'upload-123',
        'videos/some-uuid.webm',
        [{ etag: 'etag-1', partNumber: 1 }],
        'user-1',
        'ws-1'
      );

      expect(mockGenerateVideoTitleWithTimestamp).toHaveBeenCalled();
      expect(mockCreateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Recording 2024-01-01 12:00:00',
        })
      );
    });

    it('handles null thumbnail URL', async () => {
      mockCompleteMultipartUpload.mockResolvedValueOnce({
        url: 'https://bunny.com/video.webm',
      });
      mockCreateVideo.mockResolvedValueOnce({ id: 'v-1' } as any);

      await UploadService.completeChunkedUpload(
        'upload-123',
        'videos/some-uuid.webm',
        [],
        'user-1',
        'ws-1',
        'Test',
        60,
        null
      );

      expect(mockCreateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnailUrl: null,
        })
      );
    });

    it('handles undefined thumbnail URL by converting to null', async () => {
      mockCompleteMultipartUpload.mockResolvedValueOnce({
        url: 'https://bunny.com/video.webm',
      });
      mockCreateVideo.mockResolvedValueOnce({ id: 'v-1' } as any);

      await UploadService.completeChunkedUpload(
        'upload-123',
        'videos/some-uuid.webm',
        [],
        'user-1',
        'ws-1',
        'Test',
        60,
        undefined
      );

      expect(mockCreateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnailUrl: null,
        })
      );
    });

    it('passes parts array to storage layer', async () => {
      const uploadId = '123e4567-e89b-12d3-a456-426614174000' as any;
      const parts = [
        { etag: 'etag-1', partNumber: 1 },
        { etag: 'etag-2', partNumber: 2 },
        { etag: 'etag-3', partNumber: 3 },
      ];

      mockCompleteMultipartUpload.mockResolvedValueOnce({
        url: 'https://bunny.com/video.webm',
      });
      mockCreateVideo.mockResolvedValueOnce({ id: 'v-1' } as any);

      await UploadService.completeChunkedUpload(
        uploadId,
        'videos/some-uuid.webm',
        parts,
        'user-1',
        'ws-1'
      );

      expect(mockCompleteMultipartUpload).toHaveBeenCalledWith(
        'videos/some-uuid.webm',
        parts,
        { uploadId }
      );
    });
  });

  describe('uploadThumbnail', () => {
    it('uploads thumbnail and returns URL', async () => {
      const thumbnailFile = new File(['thumbnail data'], 'thumb.jpg', { type: 'image/jpeg' });

      mockPutObject.mockResolvedValueOnce({
        url: 'https://bunny.com/thumb.jpg',
        pathname: 'thumbnails/uuid-123.jpg',
      });

      const result = await UploadService.uploadThumbnail(thumbnailFile);

      expect(result).toEqual({
        url: 'https://bunny.com/thumb.jpg',
      });
      expect(mockPutObject).toHaveBeenCalledWith(
        expect.stringContaining('thumbnails/'),
        thumbnailFile,
        'image/jpeg'
      );
    });
  });
});
