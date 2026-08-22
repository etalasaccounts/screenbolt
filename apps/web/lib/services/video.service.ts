/**
 * VideoService - Business logic for video operations.
 *
 * Handles video CRUD, comments, exports, and view tracking.
 * Delegates database operations to lib/db/videos.ts and lib/db/comments.ts.
 */

import {
  getVideos,
  getVideo,
  getVideoWithComments,
  getCommentsForVideo,
  createVideo as dbCreateVideo,
  updateVideo as dbUpdateVideo,
  updateVideoTitle as dbUpdateVideoTitle,
  deleteVideo as dbDeleteVideo,
  recordVideoView,
} from '@/lib/db/videos';
import { createComment as dbCreateComment } from '@/lib/db/comments';
import { generateVideoTitleWithTimestamp } from '@/lib/shared/video';

export class VideoService {
  /**
   * List all videos in a workspace, serialized for API response.
   */
  static async listVideos(workspaceId: string) {
    const videos = await getVideos(workspaceId);
    return videos.map((v) => ({
      id: v.id,
      title: v.title,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      duration: v.duration,
      source: v.source,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      views: v.videoViews.length,
      user: v.user,
      workspace: v.workspace,
    }));
  }

  /**
   * Get video by ID (no ownership check - public endpoint).
   */
  static async getVideo(videoId: string) {
    return getVideo(videoId);
  }

  /**
   * Get video with comments by ID.
   */
  static async getVideoWithComments(videoId: string) {
    return getVideoWithComments(videoId);
  }

  /**
   * Get comments for a video.
   */
  static async getCommentsForVideo(videoId: string) {
    return getCommentsForVideo(videoId);
  }

  /**
   * Create a new video.
   * If no title is provided, generates a default title with the current timestamp.
   */
  static async createVideo(data: {
    title?: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
    source?: 'local' | 'bunny' | 'drive' | 'dropbox';
    userId: string;
    workspaceId: string;
  }) {
    const title = data.title || generateVideoTitleWithTimestamp();
    return dbCreateVideo({ ...data, title });
  }

  /**
   * Update video metadata.
   * Caller must verify ownership before calling.
   */
  static async updateVideo(
    videoId: string,
    data: {
      title?: string;
      videoUrl?: string;
      thumbnailUrl?: string | null;
      duration?: number | null;
      source?: 'local' | 'bunny' | 'drive' | 'dropbox';
    },
  ) {
    // Route optimization: if only title is being updated, use the optimized method
    if (data.title && Object.keys(data).length === 1) {
      return dbUpdateVideoTitle(videoId, data.title);
    }

    return dbUpdateVideo(videoId, data);
  }

  /**
   * Delete video.
   * Caller must verify ownership before calling.
   */
  static async deleteVideo(videoId: string) {
    await dbDeleteVideo(videoId);
  }

  /**
   * Add comment to video (no ownership check needed).
   */
  static async addComment(videoId: string, userId: string, content: string, parentId?: string | null) {
    // Verify video exists
    const video = await getVideo(videoId);
    if (!video) return null;

    return dbCreateComment({
      content,
      videoId,
      userId,
      parentId: parentId ?? null,
    });
  }

  /**
   * Record a video view.
   */
  static async recordVideoView(data: {
    videoId: string;
    userId?: string | null;
    sessionId?: string | null;
  }) {
    return recordVideoView(data);
  }

}
