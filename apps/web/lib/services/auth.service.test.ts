/**
 * Tests for AuthService.
 *
 * Tests verify signup validation, workspace creation, OAuth connection,
 * password verification, and profile updates.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ValidationError,
  ConflictError,
} from '@/lib/shared/errors';

// Mock the database modules
vi.mock('@/lib/db/auth', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUserWithPassword: vi.fn(),
  updateGoogleTokens: vi.fn(),
  clearGoogleTokens: vi.fn(),
  updateDropboxTokens: vi.fn(),
  clearDropboxTokens: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock('@/lib/db/users', () => ({
  createUserWithWorkspace: vi.fn(),
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (password) => `hashed_${password}`),
    compare: vi.fn(async (inputPassword, hash) => {
      return hash === `hashed_${inputPassword}`;
    }),
  },
}));

// Mock integrations
vi.mock('@/lib/integrations/google-drive', () => ({
  generateGoogleDriveAuthUrl: vi.fn(),
  exchangeGoogleDriveCode: vi.fn(),
  isDriveConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/integrations/dropbox', () => ({
  generateDropboxAuthUrl: vi.fn(),
  exchangeDropboxCode: vi.fn(),
  isDropboxConfigured: vi.fn(() => true),
}));

// eslint-disable-next-line no-restricted-imports
import { AuthService } from './auth.service';
import {
  findUserByEmail,
  findUserById,
  createUserWithPassword,
  updateGoogleTokens,
  clearGoogleTokens,
  updateDropboxTokens,
  clearDropboxTokens,
  updateUserProfile,
} from '@/lib/db/auth';
import { createUserWithWorkspace } from '@/lib/db/users';
import { exchangeGoogleDriveCode } from '@/lib/integrations/google-drive';
import { exchangeDropboxCode } from '@/lib/integrations/dropbox';

const mockFindUserByEmail = vi.mocked(findUserByEmail);
const mockFindUserById = vi.mocked(findUserById);
const mockCreateUserWithPassword = vi.mocked(createUserWithPassword);
const mockUpdateGoogleTokens = vi.mocked(updateGoogleTokens);
const mockClearGoogleTokens = vi.mocked(clearGoogleTokens);
const mockUpdateDropboxTokens = vi.mocked(updateDropboxTokens);
const mockClearDropboxTokens = vi.mocked(clearDropboxTokens);
const mockUpdateUserProfile = vi.mocked(updateUserProfile);
const mockCreateUserWithWorkspace = vi.mocked(createUserWithWorkspace);
const mockExchangeGoogleDriveCode = vi.mocked(exchangeGoogleDriveCode);
const mockExchangeDropboxCode = vi.mocked(exchangeDropboxCode);

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signup', () => {
    it('creates a user with valid email and password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'new@example.com',
        name: 'Test User',
      };
      mockFindUserByEmail.mockResolvedValueOnce(null);
      mockCreateUserWithPassword.mockResolvedValueOnce(mockUser as any);

      const result = await AuthService.signup({
        email: 'new@example.com',
        password: 'ValidPassword123',
        name: 'Test User',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'new@example.com',
        name: 'Test User',
      });
      expect(mockCreateUserWithPassword).toHaveBeenCalled();
    });

    it('throws ValidationError if email is missing', async () => {
      await expect(
        AuthService.signup({
          email: '',
          password: 'ValidPassword123',
        })
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws ValidationError if email has no @', async () => {
      await expect(
        AuthService.signup({
          email: 'invalidemail',
          password: 'ValidPassword123',
        })
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws ValidationError if password is too short', async () => {
      await expect(
        AuthService.signup({
          email: 'test@example.com',
          password: 'short',
        })
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws ValidationError if password is missing', async () => {
      await expect(
        AuthService.signup({
          email: 'test@example.com',
          password: '',
        })
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws ConflictError if email already registered', async () => {
      mockFindUserByEmail.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'test@example.com',
      } as any);

      await expect(
        AuthService.signup({
          email: 'test@example.com',
          password: 'ValidPassword123',
        })
      ).rejects.toThrow(ConflictError);
      expect.assertions(1);
    });
  });

  describe('signupWithWorkspace', () => {
    it('creates user and workspace together', async () => {
      const mockResult = {
        id: 'user-1',
        email: 'new@example.com',
        name: 'Test User',
        activeWorkspaceId: 'ws-1',
      };
      mockFindUserByEmail.mockResolvedValueOnce(null);
      mockCreateUserWithWorkspace.mockResolvedValueOnce(mockResult as any);

      const result = await AuthService.signupWithWorkspace({
        email: 'new@example.com',
        password: 'ValidPassword123',
        name: 'Test User',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'new@example.com',
        name: 'Test User',
        activeWorkspaceId: 'ws-1',
      });
    });

    it('throws ValidationError if email is invalid', async () => {
      await expect(
        AuthService.signupWithWorkspace({
          email: 'invalid',
          password: 'ValidPassword123',
        })
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws ValidationError if password is too short', async () => {
      await expect(
        AuthService.signupWithWorkspace({
          email: 'test@example.com',
          password: 'short',
        })
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws ConflictError if email already exists', async () => {
      mockFindUserByEmail.mockResolvedValueOnce({ id: 'existing' } as any);

      await expect(
        AuthService.signupWithWorkspace({
          email: 'test@example.com',
          password: 'ValidPassword123',
        })
      ).rejects.toThrow(ConflictError);
      expect.assertions(1);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for matching password', async () => {
      const result = await AuthService.verifyPassword(
        'hashed_password123',
        'password123'
      );
      expect(result).toBe(true);
    });

    it('returns false for non-matching password', async () => {
      const result = await AuthService.verifyPassword(
        'hashed_password123',
        'wrongpassword'
      );
      expect(result).toBe(false);
    });
  });

  describe('connectGoogleDrive', () => {
    it('connects Google Drive for user', async () => {
      mockFindUserById.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockExchangeGoogleDriveCode.mockResolvedValueOnce({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
      });

      await AuthService.connectGoogleDrive('user-1', 'auth-code', 'https://redirect');

      expect(mockUpdateGoogleTokens).toHaveBeenCalledWith(
        'user-1',
        'access-token',
        'refresh-token',
        3600
      );
    });

    it('throws ValidationError if user not found', async () => {
      mockFindUserById.mockResolvedValueOnce(null);

      await expect(
        AuthService.connectGoogleDrive('user-1', 'code', 'https://redirect')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });
  });

  describe('disconnectGoogleDrive', () => {
    it('clears Google Drive tokens', async () => {
      mockFindUserById.mockResolvedValueOnce({ id: 'user-1' } as any);

      await AuthService.disconnectGoogleDrive('user-1');

      expect(mockClearGoogleTokens).toHaveBeenCalledWith('user-1');
    });

    it('throws ValidationError if user not found', async () => {
      mockFindUserById.mockResolvedValueOnce(null);

      await expect(
        AuthService.disconnectGoogleDrive('user-1')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });
  });

  describe('connectDropbox', () => {
    it('connects Dropbox for user', async () => {
      mockFindUserById.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockExchangeDropboxCode.mockResolvedValueOnce({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
      });

      await AuthService.connectDropbox('user-1', 'auth-code', 'https://redirect');

      expect(mockUpdateDropboxTokens).toHaveBeenCalledWith(
        'user-1',
        'access-token',
        'refresh-token',
        3600
      );
    });

    it('throws ValidationError if user not found', async () => {
      mockFindUserById.mockResolvedValueOnce(null);

      await expect(
        AuthService.connectDropbox('user-1', 'code', 'https://redirect')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });
  });

  describe('disconnectDropbox', () => {
    it('clears Dropbox tokens', async () => {
      mockFindUserById.mockResolvedValueOnce({ id: 'user-1' } as any);

      await AuthService.disconnectDropbox('user-1');

      expect(mockClearDropboxTokens).toHaveBeenCalledWith('user-1');
    });

    it('throws ValidationError if user not found', async () => {
      mockFindUserById.mockResolvedValueOnce(null);

      await expect(
        AuthService.disconnectDropbox('user-1')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });
  });

  describe('updateProfile', () => {
    it('updates user profile with new name and email', async () => {
      mockFindUserById.mockResolvedValueOnce({
        id: 'user-1',
        email: 'old@example.com',
        name: 'Old Name',
      } as any);
      mockFindUserByEmail.mockResolvedValueOnce(null);
      mockUpdateUserProfile.mockResolvedValueOnce({
        id: 'user-1',
        email: 'new@example.com',
        name: 'New Name',
      } as any);

      const result = await AuthService.updateProfile('user-1', {
        email: 'new@example.com',
        name: 'New Name',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'new@example.com',
        name: 'New Name',
      });
    });

    it('throws ConflictError if new email already in use', async () => {
      mockFindUserById.mockResolvedValueOnce({
        id: 'user-1',
        email: 'old@example.com',
      } as any);
      mockFindUserByEmail.mockResolvedValueOnce({
        id: 'user-2',
        email: 'new@example.com',
      } as any);

      await expect(
        AuthService.updateProfile('user-1', { email: 'new@example.com' })
      ).rejects.toThrow(ConflictError);
      expect.assertions(1);
    });

    it('throws ValidationError if user not found', async () => {
      mockFindUserById.mockResolvedValueOnce(null);

      await expect(
        AuthService.updateProfile('user-1', { name: 'New Name' })
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('allows updating only name without email check', async () => {
      mockFindUserById.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Old Name',
      } as any);
      mockUpdateUserProfile.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        name: 'New Name',
      } as any);

      await AuthService.updateProfile('user-1', { name: 'New Name' });

      expect(mockFindUserByEmail).not.toHaveBeenCalled();
    });
  });
});
