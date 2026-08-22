/**
 * Tests for ExportService.
 *
 * Tests verify OAuth token refresh error handling:
 * - Errors are not leaked to the client (generic message only)
 * - Errors are logged server-side (console.error)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadGatewayError } from '@/lib/shared/errors';

// Mock the database module
vi.mock('@/lib/db/videos', () => ({
  getVideo: vi.fn(),
}));

vi.mock('@/lib/db/users', () => ({
  getGoogleTokens: vi.fn(),
  saveGoogleTokens: vi.fn(),
  getDropboxTokens: vi.fn(),
  saveDropboxTokens: vi.fn(),
}));

// Mock the integrations
vi.mock('@/lib/integrations/google-drive', () => ({
  uploadFileToGoogleDrive: vi.fn(),
  refreshGoogleAccessToken: vi.fn(),
}));

vi.mock('@/lib/integrations/dropbox', () => ({
  uploadFileToDropbox: vi.fn(),
  refreshDropboxAccessToken: vi.fn(),
}));

import { getVideo } from '@/lib/db/videos';
import { getGoogleTokens, getDropboxTokens } from '@/lib/db/users';
import { refreshGoogleAccessToken } from '@/lib/integrations/google-drive';
import { refreshDropboxAccessToken } from '@/lib/integrations/dropbox';

// eslint-disable-next-line no-restricted-imports
import { ExportService } from './export.service';

const mockGetVideo = vi.mocked(getVideo);
const mockGetGoogleTokens = vi.mocked(getGoogleTokens);
const mockGetDropboxTokens = vi.mocked(getDropboxTokens);
const mockRefreshGoogleAccessToken = vi.mocked(refreshGoogleAccessToken);
const mockRefreshDropboxAccessToken = vi.mocked(refreshDropboxAccessToken);

interface MockVideo {
  id: string;
  title: string;
  videoUrl: string;
  user: { id: string };
  userId: string;
}

const mockValidVideo: MockVideo = {
  id: 'video-1',
  title: 'Test Video',
  videoUrl: 'https://example.com/video.mp4',
  user: { id: 'user-1' },
  userId: 'user-1',
};

describe('ExportService - Token Refresh Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to return a valid response with video data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        'content-type': 'video/mp4',
      }),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Google token refresh failure', () => {
    it('does NOT leak OAuth error details to the client', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const secretError = new Error('SECRET_OAUTH_INTERNALS: invalid_grant from Google');

      // Mock video as owned by the user
      mockGetVideo.mockResolvedValue(mockValidVideo as Awaited<ReturnType<typeof getVideo>>);

      // Set up: tokens exist and are expired
      mockGetGoogleTokens.mockResolvedValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiry: new Date(Date.now() - 10000), // expired
      });

      // Refresh fails with OAuth error
      mockRefreshGoogleAccessToken.mockRejectedValue(secretError);

      // Expected: BadGatewayError with generic message that doesn't leak details
      await expect(
        ExportService.exportVideo('video-1', 'user-1', 'drive')
      ).rejects.toThrow(BadGatewayError);

      // Verify server-side logging happened
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh Google token:', secretError);

      consoleErrorSpy.mockRestore();
    });

    it('logs the real error server-side before throwing generic error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const realError = new Error('Network timeout from Google API');

      mockGetVideo.mockResolvedValue(mockValidVideo as Awaited<ReturnType<typeof getVideo>>);

      mockGetGoogleTokens.mockResolvedValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiry: new Date(Date.now() - 10000),
      });

      mockRefreshGoogleAccessToken.mockRejectedValue(realError);

      await expect(
        ExportService.exportVideo('video-1', 'user-1', 'drive')
      ).rejects.toThrow(BadGatewayError);

      // Verify the real error was logged with context
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh Google token:', realError);

      consoleErrorSpy.mockRestore();
    });

    it('throws BadGatewayError (502) on token refresh failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      mockGetVideo.mockResolvedValue(mockValidVideo as Awaited<ReturnType<typeof getVideo>>);

      mockGetGoogleTokens.mockResolvedValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiry: new Date(Date.now() - 10000),
      });

      mockRefreshGoogleAccessToken.mockRejectedValue(new Error('Some error'));

      const error = await (ExportService.exportVideo('video-1', 'user-1', 'drive').catch(e => e));
      expect(error).toBeInstanceOf(BadGatewayError);
      expect((error as BadGatewayError).status).toBe(502);

      vi.restoreAllMocks();
    });
  });

  describe('Dropbox token refresh failure', () => {
    it('does NOT leak OAuth error details to the client', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const secretError = new Error('SECRET_OAUTH_INTERNALS: invalid_refresh_token from Dropbox');

      mockGetVideo.mockResolvedValue(mockValidVideo as Awaited<ReturnType<typeof getVideo>>);

      // Set up: tokens exist and are expired
      mockGetDropboxTokens.mockResolvedValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiry: new Date(Date.now() - 10000),
      });

      // Refresh fails with OAuth error
      mockRefreshDropboxAccessToken.mockRejectedValue(secretError);

      // Expected: BadGatewayError with generic message that doesn't leak details
      await expect(
        ExportService.exportVideo('video-1', 'user-1', 'dropbox')
      ).rejects.toThrow(BadGatewayError);

      // Verify server-side logging happened
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh Dropbox token:', secretError);

      consoleErrorSpy.mockRestore();
    });

    it('logs the real error server-side before throwing generic error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const realError = new Error('Connection refused from Dropbox');

      mockGetVideo.mockResolvedValue(mockValidVideo as Awaited<ReturnType<typeof getVideo>>);

      mockGetDropboxTokens.mockResolvedValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiry: new Date(Date.now() - 10000),
      });

      mockRefreshDropboxAccessToken.mockRejectedValue(realError);

      await expect(
        ExportService.exportVideo('video-1', 'user-1', 'dropbox')
      ).rejects.toThrow(BadGatewayError);

      // Verify the real error was logged with context
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh Dropbox token:', realError);

      consoleErrorSpy.mockRestore();
    });

    it('throws BadGatewayError (502) on token refresh failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      mockGetVideo.mockResolvedValue(mockValidVideo as Awaited<ReturnType<typeof getVideo>>);

      mockGetDropboxTokens.mockResolvedValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiry: new Date(Date.now() - 10000),
      });

      mockRefreshDropboxAccessToken.mockRejectedValue(new Error('Some error'));

      const error = await (ExportService.exportVideo('video-1', 'user-1', 'dropbox').catch(e => e));
      expect(error).toBeInstanceOf(BadGatewayError);
      expect((error as BadGatewayError).status).toBe(502);

      vi.restoreAllMocks();
    });
  });

});
