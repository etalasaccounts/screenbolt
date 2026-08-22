/**
 * Tests for workspace database operations.
 *
 * Tests verify the function implementations by exercising real workspace
 * functions against a mocked database layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return { ...actual, eq: vi.fn(actual.eq), desc: vi.fn(actual.desc), inArray: vi.fn(actual.inArray) };
});

vi.mock('@/lib/db/workspace-members', () => ({
  isWorkspaceMember: vi.fn(),
}));

vi.mock('@/lib/db', () => {
  const mockQuery = {
    workspaces: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  const mockDb = {
    query: mockQuery,
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: vi.fn((cb: any) => cb(mockDb)),
  };

  return {
    db: mockDb,
  };
});

// We need to import after mocking to get the mocked db
import { db } from '@/lib/db';
import { isWorkspaceMember } from '@/lib/db/workspace-members';
import {
  ensureActiveWorkspace,
  getWorkspacesForUser,
  createWorkspace,
  setActiveWorkspace,
} from './workspaces';

// Type helpers for mocked functions
const mockDbSelect = vi.mocked(db.select);
const mockDbInsert = vi.mocked(db.insert);
const mockDbUpdate = vi.mocked(db.update);
const mockDbTransaction = vi.mocked(db.transaction);
const mockFindMany = vi.mocked(db.query.workspaces.findMany);
const mockIsWorkspaceMember = vi.mocked(isWorkspaceMember);

describe('ensureActiveWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbTransaction.mockImplementation((cb: any) => cb(db));
  });

  it('returns existing activeWorkspaceId if user already has one', async () => {
    const selectChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce([{ activeWorkspaceId: 'ws-123' }]),
        }),
      }),
    };
    // @ts-expect-error mock setup for testing
    mockDbSelect.mockReturnValue(selectChain);

    const result = await ensureActiveWorkspace('user-1');

    expect(result).toBe('ws-123');
    expect(mockDbTransaction).not.toHaveBeenCalled();
  });

  it('creates workspace, adds owner as member, and updates user if no activeWorkspaceId', async () => {
    const selectChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce([{ activeWorkspaceId: null }]),
        }),
      }),
    };
    // @ts-expect-error mock setup for testing
    mockDbSelect.mockReturnValue(selectChain);

    const insertReturning = vi.fn().mockResolvedValueOnce([{ id: 'ws-456' }]);
    const insertValuesWorkspace = vi.fn().mockReturnValue({ returning: insertReturning });
    const insertValuesMember = vi.fn().mockResolvedValueOnce(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbInsert.mockReturnValueOnce({ values: insertValuesWorkspace } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbInsert.mockReturnValueOnce({ values: insertValuesMember } as any);

    const updateWhere = vi.fn().mockResolvedValueOnce(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbUpdate.mockReturnValue({ set: updateSet } as any);

    const result = await ensureActiveWorkspace('user-1');

    expect(result).toBe('ws-456');
    expect(insertValuesWorkspace).toHaveBeenCalledWith({ name: 'Personal', userId: 'user-1' });
    expect(insertValuesMember).toHaveBeenCalledWith({ workspaceId: 'ws-456', userId: 'user-1', role: 'owner' });
    expect(updateSet).toHaveBeenCalledWith({ activeWorkspaceId: 'ws-456' });
  });

  it('returns null if user does not exist', async () => {
    const selectChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce([]),
        }),
      }),
    };
    // @ts-expect-error mock setup for testing
    mockDbSelect.mockReturnValue(selectChain);

    const result = await ensureActiveWorkspace('nonexistent-user');

    expect(result).toBeNull();
    expect(mockDbTransaction).not.toHaveBeenCalled();
  });

  it('returns null if workspace insert returns nothing', async () => {
    const selectChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce([{ activeWorkspaceId: null }]),
        }),
      }),
    };
    // @ts-expect-error mock setup for testing
    mockDbSelect.mockReturnValue(selectChain);

    const insertReturning = vi.fn().mockResolvedValueOnce([]);
    const insertValuesWorkspace = vi.fn().mockReturnValue({ returning: insertReturning });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbInsert.mockReturnValueOnce({ values: insertValuesWorkspace } as any);

    const result = await ensureActiveWorkspace('user-1');

    expect(result).toBeNull();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });
});

describe('getWorkspacesForUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns workspaces the user is a member of', async () => {
    const membershipWhere = vi.fn().mockResolvedValueOnce([{ workspaceId: 'ws-1' }, { workspaceId: 'ws-2' }]);
    const membershipFrom = vi.fn().mockReturnValue({ where: membershipWhere });
    // @ts-expect-error mock setup for testing
    mockDbSelect.mockReturnValue({ from: membershipFrom });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock setup for testing
    mockFindMany.mockResolvedValueOnce([{ id: 'ws-1', name: 'Personal', videos: [], members: [{ userId: 'user-1' }] }] as any);

    const result = await getWorkspacesForUser('user-1');

    expect(result).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalled();
  });

  it('returns an empty array without querying workspaces when user has no memberships', async () => {
    const membershipWhere = vi.fn().mockResolvedValueOnce([]);
    const membershipFrom = vi.fn().mockReturnValue({ where: membershipWhere });
    // @ts-expect-error mock setup for testing
    mockDbSelect.mockReturnValue({ from: membershipFrom });

    const result = await getWorkspacesForUser('user-1');

    expect(result).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

describe('createWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbTransaction.mockImplementation((cb: any) => cb(db));
  });

  it('creates a workspace and adds the creator as owner member', async () => {
    const insertReturning = vi.fn().mockResolvedValueOnce([{ id: 'ws-1', name: 'New Workspace' }]);
    const insertValuesWorkspace = vi.fn().mockReturnValue({ returning: insertReturning });
    const insertValuesMember = vi.fn().mockResolvedValueOnce(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbInsert.mockReturnValueOnce({ values: insertValuesWorkspace } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbInsert.mockReturnValueOnce({ values: insertValuesMember } as any);

    const result = await createWorkspace('user-1', 'New Workspace');

    expect(result).toEqual({ id: 'ws-1', name: 'New Workspace' });
    expect(insertValuesMember).toHaveBeenCalledWith({ workspaceId: 'ws-1', userId: 'user-1', role: 'owner' });
  });
});

describe('setActiveWorkspace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates activeWorkspaceId when the user is a member', async () => {
    mockIsWorkspaceMember.mockResolvedValueOnce(true);
    const updateWhere = vi.fn().mockResolvedValueOnce(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbUpdate.mockReturnValue({ set: updateSet } as any);

    const result = await setActiveWorkspace('user-1', 'ws-2');

    expect(result).toEqual({ id: 'ws-2' });
    expect(updateSet).toHaveBeenCalledWith({ activeWorkspaceId: 'ws-2' });
  });

  it('returns null when the user is not a member of the workspace', async () => {
    mockIsWorkspaceMember.mockResolvedValueOnce(false);

    const result = await setActiveWorkspace('user-1', 'ws-2');

    expect(result).toBeNull();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });
});
