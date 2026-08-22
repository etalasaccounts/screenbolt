/**
 * Tests for WorkspaceService.
 *
 * Tests verify workspace listing, creation, switching, fetching, and the
 * invite-link flow, with proper data transformation and validation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/shared/errors';
// eslint-disable-next-line no-restricted-imports
import { WorkspaceService } from './workspace.service';

vi.mock('@/lib/db/workspaces', () => ({
  getWorkspacesForUser: vi.fn(),
  createWorkspace: vi.fn(),
  setActiveWorkspace: vi.fn(),
  getWorkspace: vi.fn(),
}));

vi.mock('@/lib/db/workspace-members', () => ({
  isWorkspaceMember: vi.fn(),
  addWorkspaceMember: vi.fn(),
}));

vi.mock('@/lib/db/workspace-invites', () => ({
  findActiveInvite: vi.fn(),
  createInvite: vi.fn(),
  getInviteByToken: vi.fn(),
}));

import {
  getWorkspacesForUser,
  createWorkspace,
  setActiveWorkspace,
  getWorkspace,
} from '@/lib/db/workspaces';
import { isWorkspaceMember, addWorkspaceMember } from '@/lib/db/workspace-members';
import { findActiveInvite, createInvite, getInviteByToken } from '@/lib/db/workspace-invites';

const mockGetWorkspacesForUser = vi.mocked(getWorkspacesForUser);
const mockCreateWorkspace = vi.mocked(createWorkspace);
const mockSetActiveWorkspace = vi.mocked(setActiveWorkspace);
const mockGetWorkspace = vi.mocked(getWorkspace);
const mockIsWorkspaceMember = vi.mocked(isWorkspaceMember);
const mockAddWorkspaceMember = vi.mocked(addWorkspaceMember);
const mockFindActiveInvite = vi.mocked(findActiveInvite);
const mockCreateInvite = vi.mocked(createInvite);
const mockGetInviteByToken = vi.mocked(getInviteByToken);

describe('WorkspaceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkspacesForUser', () => {
    it('returns list of workspaces with video and member counts', async () => {
      mockGetWorkspacesForUser.mockResolvedValueOnce([
        {
          id: 'ws-1',
          name: 'Personal',
          videos: [{ id: 'v-1' }, { id: 'v-2' }],
          members: [{ userId: 'user-1' }],
        },
        {
          id: 'ws-2',
          name: 'Work',
          videos: [{ id: 'v-3' }],
          members: [{ userId: 'user-1' }, { userId: 'user-2' }],
        },
      ] as any);

      const result = await WorkspaceService.getWorkspacesForUser('user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'ws-1',
        name: 'Personal',
        videos: [{ id: 'v-1' }, { id: 'v-2' }],
        videoCount: 2,
        memberCount: 1,
      });
      expect(result[1]).toEqual({
        id: 'ws-2',
        name: 'Work',
        videos: [{ id: 'v-3' }],
        videoCount: 1,
        memberCount: 2,
      });
    });

    it('returns empty list if user has no workspaces', async () => {
      mockGetWorkspacesForUser.mockResolvedValueOnce([]);

      const result = await WorkspaceService.getWorkspacesForUser('user-1');

      expect(result).toEqual([]);
    });

    it('calculates video count from videos array', async () => {
      mockGetWorkspacesForUser.mockResolvedValueOnce([
        {
          id: 'ws-1',
          name: 'Test',
          videos: [{ id: 'v-1' }, { id: 'v-2' }, { id: 'v-3' }, { id: 'v-4' }],
          members: [{ userId: 'user-1' }],
        },
      ] as any);

      const result = await WorkspaceService.getWorkspacesForUser('user-1');

      expect(result[0].videoCount).toBe(4);
    });
  });

  describe('createWorkspace', () => {
    it('creates workspace with name and a member count of one', async () => {
      mockCreateWorkspace.mockResolvedValueOnce({
        id: 'ws-1',
        name: 'New Workspace',
      } as any);

      const result = await WorkspaceService.createWorkspace('user-1', 'New Workspace');

      expect(result).toEqual({
        id: 'ws-1',
        name: 'New Workspace',
        videos: [],
        videoCount: 0,
        memberCount: 1,
      });
      expect(mockCreateWorkspace).toHaveBeenCalledWith('user-1', 'New Workspace');
    });

    it('throws ValidationError if name is empty', async () => {
      await expect(
        WorkspaceService.createWorkspace('user-1', '')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws ValidationError if name is only whitespace', async () => {
      await expect(
        WorkspaceService.createWorkspace('user-1', '   ')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws ValidationError if name is not provided', async () => {
      await expect(
        WorkspaceService.createWorkspace('user-1', '')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });
  });

  describe('switchWorkspace', () => {
    it('switches active workspace', async () => {
      mockSetActiveWorkspace.mockResolvedValueOnce({ id: 'ws-2' } as any);

      const result = await WorkspaceService.switchWorkspace('user-1', 'ws-2');

      expect(result).toEqual({ id: 'ws-2' });
      expect(mockSetActiveWorkspace).toHaveBeenCalledWith('user-1', 'ws-2');
    });

    it('throws ValidationError if workspaceId is empty', async () => {
      await expect(
        WorkspaceService.switchWorkspace('user-1', '')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws NotFoundError if workspace not found or does not belong to user', async () => {
      mockSetActiveWorkspace.mockResolvedValueOnce(null);

      await expect(
        WorkspaceService.switchWorkspace('user-1', 'ws-999')
      ).rejects.toThrow(NotFoundError);
      expect.assertions(1);
    });

    it('includes proper error message for not found', async () => {
      mockSetActiveWorkspace.mockResolvedValueOnce(null);

      try {
        await WorkspaceService.switchWorkspace('user-1', 'ws-999');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toBe(
          'Workspace not found or does not belong to you'
        );
      }
    });
  });

  describe('getWorkspace', () => {
    it('returns workspace with video and member counts', async () => {
      mockGetWorkspace.mockResolvedValueOnce({
        id: 'ws-1',
        name: 'Personal',
        videos: [{ id: 'v-1' }, { id: 'v-2' }],
        members: [{ userId: 'user-1' }],
      } as any);

      const result = await WorkspaceService.getWorkspace('ws-1');

      expect(result).toEqual({
        id: 'ws-1',
        name: 'Personal',
        videos: [{ id: 'v-1' }, { id: 'v-2' }],
        videoCount: 2,
        memberCount: 1,
      });
    });

    it('returns null if workspace not found', async () => {
      mockGetWorkspace.mockResolvedValueOnce(null);

      const result = await WorkspaceService.getWorkspace('ws-999');

      expect(result).toBeNull();
    });

    it('includes empty videos array and zero video count for workspace with no videos', async () => {
      mockGetWorkspace.mockResolvedValueOnce({
        id: 'ws-1',
        name: 'Empty',
        videos: [],
        members: [{ userId: 'user-1' }],
      } as any);

      const result = await WorkspaceService.getWorkspace('ws-1');

      expect(result?.videos).toEqual([]);
      expect(result?.videoCount).toBe(0);
    });
  });

  describe('createInvite', () => {
    it('reuses an existing active invite for the workspace', async () => {
      mockIsWorkspaceMember.mockResolvedValueOnce(true);
      mockFindActiveInvite.mockResolvedValueOnce({
        token: 'existing-token',
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
      } as any);

      const result = await WorkspaceService.createInvite('user-1', 'ws-1');

      expect(result).toEqual({ token: 'existing-token', expiresAt: '2026-01-01T00:00:00.000Z' });
      expect(mockCreateInvite).not.toHaveBeenCalled();
    });

    it('creates a new invite when none is active', async () => {
      mockIsWorkspaceMember.mockResolvedValueOnce(true);
      mockFindActiveInvite.mockResolvedValueOnce(null);
      mockCreateInvite.mockResolvedValueOnce({
        token: 'new-token',
        expiresAt: new Date('2026-02-01T00:00:00.000Z'),
      } as any);

      const result = await WorkspaceService.createInvite('user-1', 'ws-1');

      expect(result).toEqual({ token: 'new-token', expiresAt: '2026-02-01T00:00:00.000Z' });
      expect(mockCreateInvite).toHaveBeenCalledWith('ws-1', 'user-1');
    });

    it('throws ForbiddenError if the user is not a member of the workspace', async () => {
      mockIsWorkspaceMember.mockResolvedValueOnce(false);

      await expect(
        WorkspaceService.createInvite('user-1', 'ws-1')
      ).rejects.toThrow(ForbiddenError);
      expect.assertions(1);
    });
  });

  describe('acceptInvite', () => {
    it('adds the user as a member and switches their active workspace', async () => {
      mockGetInviteByToken.mockResolvedValueOnce({
        token: 'tok',
        workspaceId: 'ws-1',
        status: 'active',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      } as any);
      mockIsWorkspaceMember.mockResolvedValueOnce(false);
      mockSetActiveWorkspace.mockResolvedValueOnce({ id: 'ws-1' } as any);

      const result = await WorkspaceService.acceptInvite('tok', 'user-2');

      expect(result).toEqual({ workspaceId: 'ws-1' });
      expect(mockAddWorkspaceMember).toHaveBeenCalledWith('ws-1', 'user-2', 'member');
      expect(mockSetActiveWorkspace).toHaveBeenCalledWith('user-2', 'ws-1');
    });

    it('does not re-add membership if the user is already a member', async () => {
      mockGetInviteByToken.mockResolvedValueOnce({
        token: 'tok',
        workspaceId: 'ws-1',
        status: 'active',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      } as any);
      mockIsWorkspaceMember.mockResolvedValueOnce(true);
      mockSetActiveWorkspace.mockResolvedValueOnce({ id: 'ws-1' } as any);

      await WorkspaceService.acceptInvite('tok', 'user-1');

      expect(mockAddWorkspaceMember).not.toHaveBeenCalled();
    });

    it('throws ValidationError when the token does not match any invite', async () => {
      mockGetInviteByToken.mockResolvedValueOnce(null);

      await expect(
        WorkspaceService.acceptInvite('missing', 'user-2')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws ValidationError when the invite has expired', async () => {
      mockGetInviteByToken.mockResolvedValueOnce({
        token: 'tok',
        workspaceId: 'ws-1',
        status: 'active',
        expiresAt: new Date(Date.now() - 1000),
      } as any);

      await expect(
        WorkspaceService.acceptInvite('tok', 'user-2')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });

    it('throws ValidationError when the invite has been revoked', async () => {
      mockGetInviteByToken.mockResolvedValueOnce({
        token: 'tok',
        workspaceId: 'ws-1',
        status: 'revoked',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      } as any);

      await expect(
        WorkspaceService.acceptInvite('tok', 'user-2')
      ).rejects.toThrow(ValidationError);
      expect.assertions(1);
    });
  });
});
