/**
 * Tests for DeviceService.
 *
 * Tests verify device token management and extension pairing flow with
 * proper state transitions and error handling.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database modules
vi.mock('@/lib/db/devices', () => ({
  createDeviceToken: vi.fn(),
  revokeDeviceToken: vi.fn(),
  listDeviceTokens: vi.fn(),
  generatePairingCode: vi.fn(() => 'CODE-123456'),
}));

vi.mock('@/lib/db/pairing', () => ({
  createPairingRequest: vi.fn(),
  getPairingRequest: vi.fn(),
  approvePairingRequest: vi.fn(),
  attachTokenToPairing: vi.fn(),
  takePairingToken: vi.fn(),
}));

// eslint-disable-next-line no-restricted-imports
import { DeviceService } from './device.service';
import {
  createDeviceToken,
  revokeDeviceToken,
  listDeviceTokens,
  generatePairingCode,
} from '@/lib/db/devices';
import {
  createPairingRequest,
  getPairingRequest,
  approvePairingRequest,
  attachTokenToPairing,
  takePairingToken,
} from '@/lib/db/pairing';

const mockCreateDeviceToken = vi.mocked(createDeviceToken);
const mockRevokeDeviceToken = vi.mocked(revokeDeviceToken);
const mockListDeviceTokens = vi.mocked(listDeviceTokens);
const mockGeneratePairingCode = vi.mocked(generatePairingCode);
const mockCreatePairingRequest = vi.mocked(createPairingRequest);
const mockGetPairingRequest = vi.mocked(getPairingRequest);
const mockApprovePairingRequest = vi.mocked(approvePairingRequest);
const mockAttachTokenToPairing = vi.mocked(attachTokenToPairing);
const mockTakePairingToken = vi.mocked(takePairingToken);

describe('DeviceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDeviceTokens', () => {
    it('returns list of device tokens with proper ISO formatting', async () => {
      const createdAt = new Date('2024-01-01T12:00:00Z');
      const lastUsedAt = new Date('2024-01-02T15:30:00Z');

      mockListDeviceTokens.mockResolvedValueOnce([
        {
          id: 'device-1',
          label: 'Chrome Extension',
          createdAt,
          lastUsedAt,
          revokedAt: null,
        },
      ] as any);

      const result = await DeviceService.getDeviceTokens('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'device-1',
        label: 'Chrome Extension',
        createdAt: createdAt.toISOString(),
        lastUsedAt: lastUsedAt.toISOString(),
        revoked: false,
      });
    });

    it('sets revoked to true when revokedAt is present', async () => {
      mockListDeviceTokens.mockResolvedValueOnce([
        {
          id: 'device-1',
          label: 'Old Device',
          createdAt: new Date('2024-01-01'),
          lastUsedAt: null,
          revokedAt: new Date('2024-01-15'),
        },
      ] as any);

      const result = await DeviceService.getDeviceTokens('user-1');

      expect(result[0].revoked).toBe(true);
    });

    it('converts null lastUsedAt to null string', async () => {
      mockListDeviceTokens.mockResolvedValueOnce([
        {
          id: 'device-1',
          label: 'New Device',
          createdAt: new Date('2024-01-01'),
          lastUsedAt: null,
          revokedAt: null,
        },
      ] as any);

      const result = await DeviceService.getDeviceTokens('user-1');

      expect(result[0].lastUsedAt).toBeNull();
    });

    it('converts null label to null', async () => {
      mockListDeviceTokens.mockResolvedValueOnce([
        {
          id: 'device-1',
          label: null,
          createdAt: new Date('2024-01-01'),
          lastUsedAt: null,
          revokedAt: null,
        },
      ] as any);

      const result = await DeviceService.getDeviceTokens('user-1');

      expect(result[0].label).toBeNull();
    });

    it('returns empty array when user has no devices', async () => {
      mockListDeviceTokens.mockResolvedValueOnce([]);

      const result = await DeviceService.getDeviceTokens('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('initPairing', () => {
    it('generates pairing code and returns with expiration', async () => {
      const expiresAt = new Date('2024-01-01T12:10:00Z');
      mockCreatePairingRequest.mockResolvedValueOnce({
        code: 'CODE-123456',
        expiresAt,
      } as any);

      const result = await DeviceService.initPairing();

      expect(result).toEqual({
        code: 'CODE-123456',
        expiresAt: expiresAt.toISOString(),
      });
      expect(mockGeneratePairingCode).toHaveBeenCalled();
    });

    it('accepts custom pairing code', async () => {
      const expiresAt = new Date('2024-01-01T12:10:00Z');
      mockGetPairingRequest.mockResolvedValueOnce(null);
      mockCreatePairingRequest.mockResolvedValueOnce({
        code: 'CUSTOM-CODE',
        expiresAt,
      } as any);

      const result = await DeviceService.initPairing('CUSTOM-CODE');

      expect(result.code).toBe('CUSTOM-CODE');
      expect(mockGetPairingRequest).toHaveBeenCalledWith('CUSTOM-CODE');
    });

    it('throws error if code already in use', async () => {
      mockGetPairingRequest.mockResolvedValueOnce({
        code: 'EXISTING-CODE',
        status: 'pending',
      } as any);

      await expect(
        DeviceService.initPairing('EXISTING-CODE')
      ).rejects.toThrow('code already in use');
      expect.assertions(1);
    });
  });

  describe('approvePairing', () => {
    it('approves pairing and mints device token', async () => {
      mockGetPairingRequest.mockResolvedValueOnce({
        code: 'CODE-123456',
        status: 'pending',
      } as any);
      mockApprovePairingRequest.mockResolvedValueOnce({
        code: 'CODE-123456',
        status: 'approved',
      } as any);
      mockCreateDeviceToken.mockResolvedValueOnce({
        id: 'device-1',
        token: 'raw-token-value',
      } as any);

      const result = await DeviceService.approvePairing(
        'CODE-123456',
        'user-1',
        'ws-1',
        'My Device'
      );

      expect(result).toEqual({ token: 'raw-token-value' });
      expect(mockAttachTokenToPairing).toHaveBeenCalledWith(
        'CODE-123456',
        'raw-token-value'
      );
    });

    it('uses default label "Chrome extension" when not provided', async () => {
      mockGetPairingRequest.mockResolvedValueOnce({
        status: 'pending',
      } as any);
      mockApprovePairingRequest.mockResolvedValueOnce({} as any);
      mockCreateDeviceToken.mockResolvedValueOnce({
        token: 'raw-token',
      } as any);

      await DeviceService.approvePairing('CODE-123456', 'user-1', 'ws-1');

      expect(mockCreateDeviceToken).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
        'Chrome extension'
      );
    });

    it('throws error if pairing request not found', async () => {
      mockGetPairingRequest.mockResolvedValueOnce(null);

      await expect(
        DeviceService.approvePairing('CODE-123456', 'user-1', 'ws-1')
      ).rejects.toThrow('Pairing request not found');
      expect.assertions(1);
    });

    it('throws error if pairing already approved', async () => {
      mockGetPairingRequest.mockResolvedValueOnce({
        status: 'approved',
      } as any);

      await expect(
        DeviceService.approvePairing('CODE-123456', 'user-1', 'ws-1')
      ).rejects.toThrow('This device was already approved');
      expect.assertions(1);
    });

    it('throws error if pairing request expired', async () => {
      mockGetPairingRequest.mockResolvedValueOnce({
        status: 'expired',
      } as any);

      await expect(
        DeviceService.approvePairing('CODE-123456', 'user-1', 'ws-1')
      ).rejects.toThrow('Pairing request expired');
      expect.assertions(1);
    });
  });

  describe('getPairingStatus', () => {
    it('returns pending status without token', async () => {
      mockGetPairingRequest.mockResolvedValueOnce({
        status: 'pending',
      } as any);

      const result = await DeviceService.getPairingStatus('CODE-123456');

      expect(result).toEqual({ status: 'pending', token: null });
      expect(mockTakePairingToken).not.toHaveBeenCalled();
    });

    it('returns approved status with token and clears it', async () => {
      mockGetPairingRequest.mockResolvedValueOnce({
        id: 'pairing-1',
        status: 'approved',
      } as any);
      mockTakePairingToken.mockResolvedValueOnce('raw-token-value');

      const result = await DeviceService.getPairingStatus('CODE-123456');

      expect(result).toEqual({
        status: 'approved',
        token: 'raw-token-value',
      });
      expect(mockTakePairingToken).toHaveBeenCalledWith('pairing-1');
    });

    it('returns expired status without token', async () => {
      mockGetPairingRequest.mockResolvedValueOnce({
        status: 'expired',
      } as any);

      const result = await DeviceService.getPairingStatus('CODE-123456');

      expect(result).toEqual({ status: 'expired', token: null });
    });

    it('throws error if pairing request not found', async () => {
      mockGetPairingRequest.mockResolvedValueOnce(null);

      await expect(
        DeviceService.getPairingStatus('CODE-123456')
      ).rejects.toThrow('Pairing request not found');
      expect.assertions(1);
    });
  });

  describe('revokeDevice', () => {
    it('revokes device token', async () => {
      mockRevokeDeviceToken.mockResolvedValueOnce({
        id: 'device-1',
        revokedAt: new Date('2024-01-15'),
      } as any);

      const result = await DeviceService.revokeDevice('device-1', 'user-1');

      expect(result).toEqual({
        id: 'device-1',
        revokedAt: new Date('2024-01-15'),
      });
      expect(mockRevokeDeviceToken).toHaveBeenCalledWith('device-1', 'user-1');
    });

    it('throws error if device not found or not owned by user', async () => {
      mockRevokeDeviceToken.mockResolvedValueOnce(null);

      await expect(
        DeviceService.revokeDevice('device-999', 'user-1')
      ).rejects.toThrow('Device not found');
      expect.assertions(1);
    });
  });

  describe('getPairing', () => {
    it('returns pairing request by code', async () => {
      const mockPairing = {
        code: 'CODE-123456',
        status: 'pending',
        expiresAt: new Date('2024-01-01T12:10:00Z'),
      };
      mockGetPairingRequest.mockResolvedValueOnce(mockPairing as any);

      const result = await DeviceService.getPairing('CODE-123456');

      expect(result).toEqual(mockPairing);
    });

    it('returns null if pairing not found', async () => {
      mockGetPairingRequest.mockResolvedValueOnce(null);

      const result = await DeviceService.getPairing('CODE-999');

      expect(result).toBeNull();
    });
  });
});
