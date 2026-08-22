/**
 * ExportService - Business logic for exporting videos to cloud providers.
 *
 * Handles video downloads, file preparation, token resolution/refresh, and uploading
 * to Google Drive or Dropbox. Delegates pure integration calls to lib/integrations.
 */

import { getVideo } from '@/lib/db/videos';
import { getGoogleTokens, saveGoogleTokens, getDropboxTokens, saveDropboxTokens } from '@/lib/db/users';
import { uploadFileToGoogleDrive, refreshGoogleAccessToken } from '@/lib/integrations/google-drive';
import { uploadFileToDropbox, refreshDropboxAccessToken } from '@/lib/integrations/dropbox';
import { NotFoundError, ForbiddenError, ValidationError, BadGatewayError } from '@/lib/shared/errors';

export class ExportService {
  /**
   * Resolve a user's access token, refreshing and persisting if needed.
   * Returns the valid access token or throws an error if unavailable.
   */
  private static async resolveGoogleAccessToken(userId: string): Promise<string> {
    const tokens = await getGoogleTokens(userId);
    if (!tokens?.accessToken) {
      throw new ForbiddenError('Google Drive is not connected');
    }

    // Check if token is expired (5-minute buffer)
    const buffer = 5 * 60 * 1000;
    const expired = tokens.expiry && Date.now() >= tokens.expiry.getTime() - buffer;

    if (!expired) {
      return tokens.accessToken;
    }

    // Token expired; try to refresh
    if (!tokens.refreshToken) {
      throw new ForbiddenError('Google Drive token expired and cannot be refreshed');
    }

    try {
      const refreshed = await refreshGoogleAccessToken(tokens.refreshToken);
      await saveGoogleTokens(userId, {
        accessToken: refreshed.access_token,
        expiresIn: refreshed.expires_in,
      });
      return refreshed.access_token;
    } catch (error) {
      console.error("Failed to refresh Google token:", error);
      throw new BadGatewayError('Failed to refresh Google Drive token');
    }
  }

  /**
   * Resolve a user's Dropbox access token, refreshing and persisting if needed.
   * Returns the valid access token or throws an error if unavailable.
   */
  private static async resolveDropboxAccessToken(userId: string): Promise<string> {
    const tokens = await getDropboxTokens(userId);
    if (!tokens?.accessToken) {
      throw new ForbiddenError('Dropbox is not connected');
    }

    // Check if token is expired (5-minute buffer)
    const buffer = 5 * 60 * 1000;
    const expired = tokens.expiry && Date.now() >= tokens.expiry.getTime() - buffer;

    if (!expired) {
      return tokens.accessToken;
    }

    // Token expired; try to refresh
    if (!tokens.refreshToken) {
      throw new ForbiddenError('Dropbox token expired and cannot be refreshed');
    }

    try {
      const refreshed = await refreshDropboxAccessToken(tokens.refreshToken);
      await saveDropboxTokens(userId, {
        accessToken: refreshed.access_token,
        expiresIn: refreshed.expires_in,
      });
      return refreshed.access_token;
    } catch (error) {
      console.error("Failed to refresh Dropbox token:", error);
      throw new BadGatewayError('Failed to refresh Dropbox token');
    }
  }

  /**
   * Export a video to a cloud provider (Google Drive or Dropbox).
   * Returns an object containing the provider, URL, and any additional metadata.
   */
  static async exportVideo(
    videoId: string,
    userId: string,
    provider: 'drive' | 'dropbox',
  ): Promise<{
    success: true;
    provider: 'drive' | 'dropbox';
    url?: string;
    fileId?: string;
    note?: string;
  }> {
    // Fetch the video with ownership check
    const video = await getVideo(videoId);
    if (!video) {
      throw new NotFoundError('Video not found');
    }

    if (video.user.id !== userId) {
      throw new ForbiddenError('You do not have permission to export this video');
    }

    // Validate that the video has a downloadable source
    if (!video.videoUrl || !video.videoUrl.startsWith('http')) {
      throw new ValidationError('Video has no downloadable source');
    }

    // Download the source video bytes
    let download: Response;
    try {
      download = await fetch(video.videoUrl);
    } catch (error) {
      throw new BadGatewayError(
        `Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (!download.ok) {
      throw new BadGatewayError(`Failed to download video (${download.status})`);
    }

    const bytes = await download.arrayBuffer();

    // Derive the file extension and MIME type
    const ext = video.videoUrl.match(/\.(webm|mp4|mov|mkv|avi)(\?|$)/i)?.[1] ?? 'webm';
    const mimeType = download.headers.get('content-type') || `video/${ext}`;

    // Sanitize the title into a safe filename
    const safeTitle = video.title.replace(/[^\w\- ]+/g, '').trim() || 'Recording';

    // Branch on provider and upload
    if (provider === 'drive') {
      const accessToken = await this.resolveGoogleAccessToken(userId);
      const fileId = await uploadFileToGoogleDrive({
        accessToken,
        name: `${safeTitle}.${ext}`,
        mimeType,
        body: bytes,
      });
      return {
        success: true,
        provider: 'drive',
        url: `https://drive.google.com/file/d/${fileId}/view`,
      };
    }

    // provider === 'dropbox'
    const accessToken = await this.resolveDropboxAccessToken(userId);
    const result = await uploadFileToDropbox({
      accessToken,
      path: `/Screenbolt/${safeTitle}.${ext}`,
      body: bytes,
    });

    return {
      success: true,
      provider: 'dropbox',
      fileId: result,
      note: 'Saved to Dropbox under /Screenbolt',
    };
  }
}
