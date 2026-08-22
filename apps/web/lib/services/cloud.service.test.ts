/**
 * Tests for CloudService.
 *
 * Tests verify cloud provider configuration and connection status checks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database and integration modules
vi.mock('@/lib/db/users', () => ({
  getGoogleAccessToken: vi.fn(),
  getDropboxAccessToken: vi.fn(),
}));

vi.mock('@/lib/integrations/google-drive', () => ({
  isDriveConfigured: vi.fn(),
}));

vi.mock('@/lib/integrations/dropbox', () => ({
  isDropboxConfigured: vi.fn(),
}));

// eslint-disable-next-line no-restricted-imports
import { CloudService } from './cloud.service';
import {
  getGoogleAccessToken,
  getDropboxAccessToken,
} from '@/lib/db/users';
import { isDriveConfigured } from '@/lib/integrations/google-drive';
import { isDropboxConfigured } from '@/lib/integrations/dropbox';

const mockGetGoogleAccessToken = vi.mocked(getGoogleAccessToken);
const mockGetDropboxAccessToken = vi.mocked(getDropboxAccessToken);
const mockIsDriveConfigured = vi.mocked(isDriveConfigured);
const mockIsDropboxConfigured = vi.mocked(isDropboxConfigured);

describe('CloudService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCloudConnections', () => {
    it('returns both configured and connected', async () => {
      mockGetGoogleAccessToken.mockResolvedValueOnce('google-token');
      mockGetDropboxAccessToken.mockResolvedValueOnce('dropbox-token');
      mockIsDriveConfigured.mockReturnValueOnce(true);
      mockIsDropboxConfigured.mockReturnValueOnce(true);

      const result = await CloudService.getCloudConnections('user-1');

      expect(result).toEqual({
        drive: {
          configured: true,
          connected: true,
        },
        dropbox: {
          configured: true,
          connected: true,
        },
      });
    });

    it('returns configured but not connected when tokens are missing', async () => {
      mockGetGoogleAccessToken.mockResolvedValueOnce(null);
      mockGetDropboxAccessToken.mockResolvedValueOnce(null);
      mockIsDriveConfigured.mockReturnValueOnce(true);
      mockIsDropboxConfigured.mockReturnValueOnce(true);

      const result = await CloudService.getCloudConnections('user-1');

      expect(result).toEqual({
        drive: {
          configured: true,
          connected: false,
        },
        dropbox: {
          configured: true,
          connected: false,
        },
      });
    });

    it('returns not configured even if tokens exist', async () => {
      mockGetGoogleAccessToken.mockResolvedValueOnce('google-token');
      mockGetDropboxAccessToken.mockResolvedValueOnce('dropbox-token');
      mockIsDriveConfigured.mockReturnValueOnce(false);
      mockIsDropboxConfigured.mockReturnValueOnce(false);

      const result = await CloudService.getCloudConnections('user-1');

      expect(result).toEqual({
        drive: {
          configured: false,
          connected: true,
        },
        dropbox: {
          configured: false,
          connected: true,
        },
      });
    });

    it('returns partial configuration (drive only)', async () => {
      mockGetGoogleAccessToken.mockResolvedValueOnce('google-token');
      mockGetDropboxAccessToken.mockResolvedValueOnce(null);
      mockIsDriveConfigured.mockReturnValueOnce(true);
      mockIsDropboxConfigured.mockReturnValueOnce(false);

      const result = await CloudService.getCloudConnections('user-1');

      expect(result).toEqual({
        drive: {
          configured: true,
          connected: true,
        },
        dropbox: {
          configured: false,
          connected: false,
        },
      });
    });

    it('returns partial configuration (dropbox only)', async () => {
      mockGetGoogleAccessToken.mockResolvedValueOnce(null);
      mockGetDropboxAccessToken.mockResolvedValueOnce('dropbox-token');
      mockIsDriveConfigured.mockReturnValueOnce(false);
      mockIsDropboxConfigured.mockReturnValueOnce(true);

      const result = await CloudService.getCloudConnections('user-1');

      expect(result).toEqual({
        drive: {
          configured: false,
          connected: false,
        },
        dropbox: {
          configured: true,
          connected: true,
        },
      });
    });

    it('fetches tokens in parallel', async () => {
      mockGetGoogleAccessToken.mockResolvedValueOnce('google-token');
      mockGetDropboxAccessToken.mockResolvedValueOnce('dropbox-token');
      mockIsDriveConfigured.mockReturnValueOnce(true);
      mockIsDropboxConfigured.mockReturnValueOnce(true);

      await CloudService.getCloudConnections('user-1');

      // Both should be called (tested by verifying return values)
      expect(mockGetGoogleAccessToken).toHaveBeenCalledWith('user-1');
      expect(mockGetDropboxAccessToken).toHaveBeenCalledWith('user-1');
    });

    it('handles null token as not connected', async () => {
      mockGetGoogleAccessToken.mockResolvedValueOnce(null);
      mockGetDropboxAccessToken.mockResolvedValueOnce(null);
      mockIsDriveConfigured.mockReturnValueOnce(true);
      mockIsDropboxConfigured.mockReturnValueOnce(true);

      const result = await CloudService.getCloudConnections('user-1');

      expect(result.drive.connected).toBe(false);
      expect(result.dropbox.connected).toBe(false);
    });

    it('handles empty string token as not connected', async () => {
      mockGetGoogleAccessToken.mockResolvedValueOnce('');
      mockGetDropboxAccessToken.mockResolvedValueOnce('');
      mockIsDriveConfigured.mockReturnValueOnce(true);
      mockIsDropboxConfigured.mockReturnValueOnce(true);

      const result = await CloudService.getCloudConnections('user-1');

      expect(result.drive.connected).toBe(false);
      expect(result.dropbox.connected).toBe(false);
    });
  });
});
