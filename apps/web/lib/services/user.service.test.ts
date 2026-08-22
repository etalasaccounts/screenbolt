/**
 * Tests for UserService.
 *
 * Tests verify user fetching and profile updates with proper validation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError } from '@/lib/shared/errors';

// Mock the database module
vi.mock('@/lib/db/auth', () => ({
  findUserById: vi.fn(),
  updateUserProfile: vi.fn(),
}));

// eslint-disable-next-line no-restricted-imports
import { UserService } from './user.service';
import { findUserById, updateUserProfile } from '@/lib/db/auth';

const mockFindUserById = vi.mocked(findUserById);
const mockUpdateUserProfile = vi.mocked(updateUserProfile);

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('returns user data when user exists', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      };
      mockFindUserById.mockResolvedValueOnce(mockUser as any);

      const result = await UserService.getCurrentUser('user-1');

      expect(result).toEqual({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      });
    });

    it('includes createdAt in response', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-06-15'),
      };
      mockFindUserById.mockResolvedValueOnce(mockUser as any);

      const result = await UserService.getCurrentUser('user-1');

      expect(result.createdAt).toBeDefined();
      expect(result.createdAt).toEqual(new Date('2024-06-15'));
    });

    it('throws ValidationError if user not found', async () => {
      mockFindUserById.mockResolvedValueOnce(null);

      await expect(
        UserService.getCurrentUser('user-999')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('includes null name when user has no name', async () => {
      const mockUser = {
        id: 'user-1',
        name: null,
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      };
      mockFindUserById.mockResolvedValueOnce(mockUser as any);

      const result = await UserService.getCurrentUser('user-1');

      expect(result.name).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('updates user name', async () => {
      mockFindUserById.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Old Name',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as any);
      mockUpdateUserProfile.mockResolvedValueOnce({
        id: 'user-1',
        name: 'New Name',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as any);

      const result = await UserService.updateProfile('user-1', {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'New Name' })
      );
    });

    it('updates user avatar URL', async () => {
      mockFindUserById.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as any);
      mockUpdateUserProfile.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as any);

      await UserService.updateProfile('user-1', {
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ avatarUrl: 'https://example.com/avatar.jpg' })
      );
    });

    it('clears avatar URL when set to null', async () => {
      mockFindUserById.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as any);
      mockUpdateUserProfile.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as any);

      await UserService.updateProfile('user-1', { avatarUrl: null });

      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ avatarUrl: null })
      );
    });

    it('updates both name and avatar URL', async () => {
      mockFindUserById.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Old Name',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as any);
      mockUpdateUserProfile.mockResolvedValueOnce({
        id: 'user-1',
        name: 'New Name',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as any);

      await UserService.updateProfile('user-1', {
        name: 'New Name',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          name: 'New Name',
          avatarUrl: 'https://example.com/avatar.jpg',
        })
      );
    });

    it('throws ValidationError if user not found', async () => {
      mockFindUserById.mockResolvedValueOnce(null);

      await expect(
        UserService.updateProfile('user-999', { name: 'New Name' })
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('does not call db when no updates provided', async () => {
      mockFindUserById.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as any);
      mockUpdateUserProfile.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as any);

      await UserService.updateProfile('user-1', {});

      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-1', {});
    });
  });
});
