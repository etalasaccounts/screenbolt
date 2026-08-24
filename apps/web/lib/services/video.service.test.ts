/**
 * Tests for VideoService.
 *
 * Tests verify video CRUD operations, title generation, view tracking, and
 * data transformation (especially views count calculation).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database modules
vi.mock('@/lib/db/videos', () => ({
  getVideos: vi.fn(),
  getVideo: vi.fn(),
  getVideoWithComments: vi.fn(),
  getCommentsForVideo: vi.fn(),
  createVideo: vi.fn(),
  updateVideo: vi.fn(),
  updateVideoTitle: vi.fn(),
  deleteVideo: vi.fn(),
  recordVideoView: vi.fn(),
}));

vi.mock('@/lib/db/comments', () => ({
  createComment: vi.fn(),
}));

// Mock only the title generator; countExternalViewers and calculateTimeSaved are
// pure domain logic and are exercised for real.
vi.mock('@/lib/shared/video', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/shared/video')>()),
  generateVideoTitleWithTimestamp: vi.fn(() => 'Recording 2024-01-01 12:00:00'),
}));

// eslint-disable-next-line no-restricted-imports
import { VideoService } from './video.service';
import {
  getVideos,
  getVideo,
  getVideoWithComments,
  getCommentsForVideo,
  createVideo,
  updateVideo,
  updateVideoTitle,
  deleteVideo,
  recordVideoView,
} from '@/lib/db/videos';
import { createComment } from '@/lib/db/comments';
import { generateVideoTitleWithTimestamp } from '@/lib/shared/video';

const mockGetVideos = vi.mocked(getVideos);
const mockGetVideo = vi.mocked(getVideo);
const mockGetVideoWithComments = vi.mocked(getVideoWithComments);
const mockGetCommentsForVideo = vi.mocked(getCommentsForVideo);
const mockCreateVideo = vi.mocked(createVideo);
const mockUpdateVideo = vi.mocked(updateVideo);
const mockUpdateVideoTitle = vi.mocked(updateVideoTitle);
const mockDeleteVideo = vi.mocked(deleteVideo);
const mockRecordVideoView = vi.mocked(recordVideoView);
const mockCreateComment = vi.mocked(createComment);
const mockGenerateVideoTitleWithTimestamp = vi.mocked(generateVideoTitleWithTimestamp);

describe('VideoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listVideos', () => {
    const OWNER = 'user-1';
    const recent = new Date();

    it('returns videos with view count calculated from videoViews array', async () => {
      mockGetVideos.mockResolvedValueOnce([
        {
          id: 'v-1',
          title: 'Video 1',
          videoUrl: 'https://example.com/video1.mp4',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          duration: 60,
          source: 'bunny',
          userId: OWNER,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          videoViews: [
            { id: 'view-1', userId: 'viewer-a', viewedAt: recent },
            { id: 'view-2', userId: 'viewer-b', viewedAt: recent },
            { id: 'view-3', userId: null, viewedAt: recent },
          ],
          user: { id: OWNER, name: 'Test User' },
          workspace: { id: 'ws-1', name: 'Personal' },
        },
      ] as any);

      const result = await VideoService.listVideos('ws-1');

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0]).toEqual({
        id: 'v-1',
        title: 'Video 1',
        videoUrl: 'https://example.com/video1.mp4',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        duration: 60,
        source: 'bunny',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        views: 3,
        user: { id: OWNER, name: 'Test User' },
        workspace: { id: 'ws-1', name: 'Personal' },
      });
    });

    it('excludes the owner from the view count', async () => {
      mockGetVideos.mockResolvedValueOnce([
        {
          id: 'v-1',
          title: 'Video 1',
          videoUrl: 'https://example.com/video1.mp4',
          thumbnailUrl: null,
          duration: 60,
          source: 'bunny',
          userId: OWNER,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          videoViews: [
            { id: 'view-1', userId: OWNER, viewedAt: recent },
            { id: 'view-2', userId: 'viewer-a', viewedAt: recent },
          ],
          user: { id: OWNER },
          workspace: { id: 'ws-1' },
        },
      ] as any);

      const result = await VideoService.listVideos('ws-1');

      expect(result.videos[0].views).toBe(1);
    });

    it('correctly calculates views count as zero for video with no views', async () => {
      mockGetVideos.mockResolvedValueOnce([
        {
          id: 'v-1',
          title: 'New Video',
          videoUrl: 'https://example.com/video1.mp4',
          thumbnailUrl: null,
          duration: 120,
          source: 'local',
          userId: OWNER,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          videoViews: [],
          user: { id: OWNER },
          workspace: { id: 'ws-1' },
        },
      ] as any);

      const result = await VideoService.listVideos('ws-1');

      expect(result.videos[0].views).toBe(0);
    });

    it('returns empty list and zero time saved when workspace has no videos', async () => {
      mockGetVideos.mockResolvedValueOnce([]);

      const result = await VideoService.listVideos('ws-1');

      expect(result.videos).toEqual([]);
      expect(result.timeSaved.seconds).toBe(0);
      expect(result.timeSaved.videoCount).toBe(0);
    });

    it('maps multiple videos with correct view counts', async () => {
      mockGetVideos.mockResolvedValueOnce([
        {
          id: 'v-1',
          title: 'Video 1',
          videoUrl: 'https://example.com/video1.mp4',
          thumbnailUrl: null,
          duration: 60,
          source: 'bunny',
          userId: OWNER,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          videoViews: [{ id: 'view-1', userId: 'viewer-a', viewedAt: recent }],
          user: { id: OWNER },
          workspace: { id: 'ws-1' },
        },
        {
          id: 'v-2',
          title: 'Video 2',
          videoUrl: 'https://example.com/video2.mp4',
          thumbnailUrl: null,
          duration: 120,
          source: 'drive',
          userId: OWNER,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          videoViews: [
            { id: 'view-2', userId: 'viewer-a', viewedAt: recent },
            { id: 'view-3', userId: 'viewer-b', viewedAt: recent },
          ],
          user: { id: OWNER },
          workspace: { id: 'ws-1' },
        },
      ] as any);

      const result = await VideoService.listVideos('ws-1');

      expect(result.videos).toHaveLength(2);
      expect(result.videos[0].views).toBe(1);
      expect(result.videos[1].views).toBe(2);
    });

    it('reports time saved as video length times outside viewers', async () => {
      mockGetVideos.mockResolvedValueOnce([
        {
          id: 'v-1',
          title: 'Video 1',
          videoUrl: 'https://example.com/video1.mp4',
          thumbnailUrl: null,
          duration: 300, // 5 minutes
          source: 'bunny',
          userId: OWNER,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          videoViews: [
            { id: 'view-1', userId: OWNER, viewedAt: recent },
            { id: 'view-2', userId: 'viewer-a', viewedAt: recent },
            { id: 'view-3', userId: 'viewer-b', viewedAt: recent },
          ],
          user: { id: OWNER },
          workspace: { id: 'ws-1' },
        },
      ] as any);

      const result = await VideoService.listVideos('ws-1');

      // 5 minutes x 2 outside viewers; the owner's own view does not count.
      expect(result.timeSaved.seconds).toBe(600);
      expect(result.timeSaved.videoCount).toBe(1);
    });
  });

  describe('getVideo', () => {
    it('returns video by ID', async () => {
      const mockVideo = {
        id: 'v-1',
        title: 'Test Video',
      };
      mockGetVideo.mockResolvedValueOnce(mockVideo as any);

      const result = await VideoService.getVideo('v-1');

      expect(result).toEqual(mockVideo);
    });

    it('returns null if video not found', async () => {
      mockGetVideo.mockResolvedValueOnce(null);

      const result = await VideoService.getVideo('v-999');

      expect(result).toBeNull();
    });
  });

  describe('getVideoWithComments', () => {
    it('returns video with comments', async () => {
      const mockVideo = {
        id: 'v-1',
        title: 'Test Video',
        comments: [
          { id: 'c-1', content: 'Great video!' },
          { id: 'c-2', content: 'Very helpful' },
        ],
      };
      mockGetVideoWithComments.mockResolvedValueOnce(mockVideo as any);

      const result = await VideoService.getVideoWithComments('v-1');

      expect(result).toEqual(mockVideo);
    });
  });

  describe('getCommentsForVideo', () => {
    it('returns comments for a video', async () => {
      const mockComments = [
        { id: 'c-1', content: 'Comment 1' },
        { id: 'c-2', content: 'Comment 2' },
      ];
      mockGetCommentsForVideo.mockResolvedValueOnce(mockComments as any);

      const result = await VideoService.getCommentsForVideo('v-1');

      expect(result).toEqual(mockComments);
    });
  });

  describe('createVideo', () => {
    it('creates video with provided title', async () => {
      const mockVideo = {
        id: 'v-1',
        title: 'My Video',
        videoUrl: 'https://example.com/video.mp4',
        userId: 'user-1',
        workspaceId: 'ws-1',
      };
      mockCreateVideo.mockResolvedValueOnce(mockVideo as any);

      const result = await VideoService.createVideo({
        title: 'My Video',
        videoUrl: 'https://example.com/video.mp4',
        userId: 'user-1',
        workspaceId: 'ws-1',
      });

      expect(result).toEqual(mockVideo);
      expect(mockCreateVideo).toHaveBeenCalledWith({
        title: 'My Video',
        videoUrl: 'https://example.com/video.mp4',
        userId: 'user-1',
        workspaceId: 'ws-1',
      });
    });

    it('generates default title when not provided', async () => {
      const mockVideo = {
        id: 'v-1',
        title: 'Recording 2024-01-01 12:00:00',
        videoUrl: 'https://example.com/video.mp4',
        userId: 'user-1',
        workspaceId: 'ws-1',
      };
      mockCreateVideo.mockResolvedValueOnce(mockVideo as any);

      await VideoService.createVideo({
        videoUrl: 'https://example.com/video.mp4',
        userId: 'user-1',
        workspaceId: 'ws-1',
      });

      expect(mockGenerateVideoTitleWithTimestamp).toHaveBeenCalled();
      expect(mockCreateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Recording 2024-01-01 12:00:00',
        })
      );
    });

    it('passes through all optional fields', async () => {
      const mockVideo = {
        id: 'v-1',
        title: 'Video',
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: 120,
        source: 'drive',
        userId: 'user-1',
        workspaceId: 'ws-1',
      };
      mockCreateVideo.mockResolvedValueOnce(mockVideo as any);

      await VideoService.createVideo({
        title: 'Video',
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: 120,
        source: 'drive',
        userId: 'user-1',
        workspaceId: 'ws-1',
      });

      expect(mockCreateVideo).toHaveBeenCalledWith({
        title: 'Video',
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: 120,
        source: 'drive',
        userId: 'user-1',
        workspaceId: 'ws-1',
      });
    });
  });

  describe('updateVideo', () => {
    it('uses optimized updateVideoTitle when only title changes', async () => {
      mockUpdateVideoTitle.mockResolvedValueOnce({
        id: 'v-1',
        title: 'New Title',
      } as any);

      await VideoService.updateVideo('v-1', { title: 'New Title' });

      expect(mockUpdateVideoTitle).toHaveBeenCalledWith('v-1', 'New Title');
      expect(mockUpdateVideo).not.toHaveBeenCalled();
    });

    it('uses full updateVideo when multiple fields change', async () => {
      mockUpdateVideo.mockResolvedValueOnce({
        id: 'v-1',
        title: 'New Title',
        videoUrl: 'https://new.com/video.mp4',
      } as any);

      await VideoService.updateVideo('v-1', {
        title: 'New Title',
        videoUrl: 'https://new.com/video.mp4',
      });

      expect(mockUpdateVideo).toHaveBeenCalledWith('v-1', {
        title: 'New Title',
        videoUrl: 'https://new.com/video.mp4',
      });
      expect(mockUpdateVideoTitle).not.toHaveBeenCalled();
    });

    it('uses full updateVideo when non-title field changes alone', async () => {
      mockUpdateVideo.mockResolvedValueOnce({
        id: 'v-1',
        duration: 180,
      } as any);

      await VideoService.updateVideo('v-1', { duration: 180 });

      expect(mockUpdateVideo).toHaveBeenCalledWith('v-1', { duration: 180 });
      expect(mockUpdateVideoTitle).not.toHaveBeenCalled();
    });
  });

  describe('deleteVideo', () => {
    it('deletes video', async () => {
      mockDeleteVideo.mockResolvedValueOnce(undefined);

      await VideoService.deleteVideo('v-1');

      expect(mockDeleteVideo).toHaveBeenCalledWith('v-1');
    });
  });

  describe('addComment', () => {
    it('adds comment to existing video', async () => {
      mockGetVideo.mockResolvedValueOnce({ id: 'v-1' } as any);
      mockCreateComment.mockResolvedValueOnce({
        id: 'c-1',
        content: 'Great video!',
        videoId: 'v-1',
        userId: 'user-1',
      } as any);

      const result = await VideoService.addComment(
        'v-1',
        'user-1',
        'Great video!'
      );

      expect(result).toEqual({
        id: 'c-1',
        content: 'Great video!',
        videoId: 'v-1',
        userId: 'user-1',
      });
    });

    it('returns null if video not found', async () => {
      mockGetVideo.mockResolvedValueOnce(null);

      const result = await VideoService.addComment('v-999', 'user-1', 'Comment');

      expect(result).toBeNull();
      expect(mockCreateComment).not.toHaveBeenCalled();
    });

    it('adds reply comment with parentId', async () => {
      mockGetVideo.mockResolvedValueOnce({ id: 'v-1' } as any);
      mockCreateComment.mockResolvedValueOnce({
        id: 'c-2',
        content: 'Great point!',
        videoId: 'v-1',
        userId: 'user-2',
        parentId: 'c-1',
      } as any);

      await VideoService.addComment(
        'v-1',
        'user-2',
        'Great point!',
        'c-1'
      );

      expect(mockCreateComment).toHaveBeenCalledWith({
        content: 'Great point!',
        videoId: 'v-1',
        userId: 'user-2',
        parentId: 'c-1',
      });
    });

    it('converts undefined parentId to null', async () => {
      mockGetVideo.mockResolvedValueOnce({ id: 'v-1' } as any);
      mockCreateComment.mockResolvedValueOnce({
        id: 'c-1',
        content: 'Comment',
        videoId: 'v-1',
        userId: 'user-1',
        parentId: null,
      } as any);

      await VideoService.addComment('v-1', 'user-1', 'Comment', undefined);

      expect(mockCreateComment).toHaveBeenCalledWith({
        content: 'Comment',
        videoId: 'v-1',
        userId: 'user-1',
        parentId: null,
      });
    });
  });

  describe('recordVideoView', () => {
    it('records a video view', async () => {
      mockRecordVideoView.mockResolvedValueOnce({ id: 'view-1' } as any);

      const result = await VideoService.recordVideoView({
        videoId: 'v-1',
        userId: 'user-1',
        sessionId: 'session-1',
      });

      expect(result).toEqual({ id: 'view-1' });
      expect(mockRecordVideoView).toHaveBeenCalledWith({
        videoId: 'v-1',
        userId: 'user-1',
        sessionId: 'session-1',
      });
    });

    it('records view with anonymous user', async () => {
      mockRecordVideoView.mockResolvedValueOnce({ id: 'view-1' } as any);

      await VideoService.recordVideoView({
        videoId: 'v-1',
        userId: null,
        sessionId: 'session-1',
      });

      expect(mockRecordVideoView).toHaveBeenCalledWith({
        videoId: 'v-1',
        userId: null,
        sessionId: 'session-1',
      });
    });
  });
});
