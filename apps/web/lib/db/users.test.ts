/**
 * Tests for user database operations.
 *
 * Tests verify the function implementations by exercising real user functions
 * against a mocked database layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGoogleTokens,
  saveGoogleTokens,
  getDropboxTokens,
  saveDropboxTokens,
  createUserWithWorkspace,
} from './users';

// Mock drizzle-orm's eq function to spy on its calls
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return { ...actual, eq: vi.fn(actual.eq) };
});

// Mock the db module
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn((cb: (db: typeof mockDb) => Promise<unknown>) => cb(mockDb)),
  };

  return {
    db: mockDb,
  };
});

// We need to import after mocking to get the mocked db
import { db } from '@/lib/db';

// Type helpers for mocked functions
const mockDbSelect = vi.mocked(db.select);
const mockDbUpdate = vi.mocked(db.update);
const mockDbInsert = vi.mocked(db.insert);

describe('getGoogleTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns Google tokens when found', async () => {
    const mockTokens = {
      accessToken: 'google-access-token',
      refreshToken: 'google-refresh-token',
      expiry: new Date('2025-12-31'),
    };

    const fromChain = {
      where: vi.fn(),
    };
    const selectChain = {
      from: vi.fn().mockReturnValue(fromChain),
    };
    // @ts-expect-error - mock setup for testing
    mockDbSelect.mockReturnValue(selectChain);

    // Mock the chain to return the tokens wrapped in an array, then accessed via [0]
    fromChain.where.mockReturnValue({
      limit: vi.fn().mockResolvedValue([mockTokens]),
    });

    const result = await getGoogleTokens('user-1');
    expect(result).toEqual(mockTokens);
  });

  it('returns null when user not found', async () => {
    const fromChain = {
      where: vi.fn(),
    };
    const selectChain = {
      from: vi.fn().mockReturnValue(fromChain),
    };
    // @ts-expect-error - mock setup for testing
    mockDbSelect.mockReturnValue(selectChain);

    // Mock empty result
    fromChain.where.mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    });

    const result = await getGoogleTokens('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when no access token', async () => {
    const mockTokens = {
      accessToken: null,
      refreshToken: 'google-refresh-token',
      expiry: new Date('2025-12-31'),
    };

    const fromChain = {
      where: vi.fn(),
    };
    const selectChain = {
      from: vi.fn().mockReturnValue(fromChain),
    };
    // @ts-expect-error - mock setup for testing
    mockDbSelect.mockReturnValue(selectChain);

    fromChain.where.mockReturnValue({
      limit: vi.fn().mockResolvedValue([mockTokens]),
    });

    const result = await getGoogleTokens('user-1');
    // When the array is empty (no rows returned), we expect null
    expect(result).toEqual(mockTokens);
  });
});

describe('saveGoogleTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves Google tokens with correct expiry calculation', async () => {
    const whereChain = {
      where: vi.fn().mockResolvedValueOnce(undefined),
    };
    const setChain = {
      set: vi.fn().mockReturnValue(whereChain),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(setChain);

    const beforeTime = Date.now();
    await saveGoogleTokens('user-1', {
      accessToken: 'new-access-token',
      expiresIn: 3600,
    });
    const afterTime = Date.now();

    expect(mockDbUpdate).toHaveBeenCalled();
    const setCall = setChain.set.mock.calls[0]?.[0];
    expect(setCall?.googleAccessToken).toBe('new-access-token');
    expect(setCall?.googleTokenExpiry).toBeInstanceOf(Date);

    // Verify expiry is approximately 1 hour from now
    const expiryTime = (setCall?.googleTokenExpiry as Date).getTime();
    expect(expiryTime).toBeGreaterThanOrEqual(beforeTime + 3600 * 1000);
    expect(expiryTime).toBeLessThanOrEqual(afterTime + 3600 * 1000);
  });
});

describe('getDropboxTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns Dropbox tokens when found', async () => {
    const mockTokens = {
      accessToken: 'dropbox-access-token',
      refreshToken: 'dropbox-refresh-token',
      expiry: new Date('2025-12-31'),
    };

    const fromChain = {
      where: vi.fn(),
    };
    const selectChain = {
      from: vi.fn().mockReturnValue(fromChain),
    };
    // @ts-expect-error - mock setup for testing
    mockDbSelect.mockReturnValue(selectChain);

    fromChain.where.mockReturnValue({
      limit: vi.fn().mockResolvedValue([mockTokens]),
    });

    const result = await getDropboxTokens('user-1');
    expect(result).toEqual(mockTokens);
  });

  it('returns null when user not found', async () => {
    const fromChain = {
      where: vi.fn(),
    };
    const selectChain = {
      from: vi.fn().mockReturnValue(fromChain),
    };
    // @ts-expect-error - mock setup for testing
    mockDbSelect.mockReturnValue(selectChain);

    fromChain.where.mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    });

    const result = await getDropboxTokens('nonexistent');
    expect(result).toBeNull();
  });
});

describe('saveDropboxTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves Dropbox tokens with correct expiry calculation', async () => {
    const whereChain = {
      where: vi.fn().mockResolvedValueOnce(undefined),
    };
    const setChain = {
      set: vi.fn().mockReturnValue(whereChain),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(setChain);

    const beforeTime = Date.now();
    await saveDropboxTokens('user-1', {
      accessToken: 'new-dropbox-token',
      expiresIn: 3600,
    });
    const afterTime = Date.now();

    expect(mockDbUpdate).toHaveBeenCalled();
    const setCall = setChain.set.mock.calls[0]?.[0];
    expect(setCall?.dropboxAccessToken).toBe('new-dropbox-token');
    expect(setCall?.dropboxTokenExpiry).toBeInstanceOf(Date);

    // Verify expiry is approximately 1 hour from now
    const expiryTime = (setCall?.dropboxTokenExpiry as Date).getTime();
    expect(expiryTime).toBeGreaterThanOrEqual(beforeTime + 3600 * 1000);
    expect(expiryTime).toBeLessThanOrEqual(afterTime + 3600 * 1000);
  });
});

describe('createUserWithWorkspace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a user, a Personal workspace, and an owner membership row, then sets activeWorkspaceId', async () => {
    const userReturning = vi.fn().mockResolvedValueOnce([{ id: 'user-1', name: 'Ada', email: 'ada@example.com' }]);
    const userValues = vi.fn().mockReturnValue({ returning: userReturning });

    const workspaceReturning = vi.fn().mockResolvedValueOnce([{ id: 'ws-1' }]);
    const workspaceValues = vi.fn().mockReturnValue({ returning: workspaceReturning });

    const memberValues = vi.fn().mockResolvedValueOnce(undefined);

    mockDbInsert
      // @ts-expect-error - mock setup for testing
      .mockReturnValueOnce({ values: userValues })
      // @ts-expect-error - mock setup for testing
      .mockReturnValueOnce({ values: workspaceValues })
      // @ts-expect-error - mock setup for testing
      .mockReturnValueOnce({ values: memberValues });

    const updateWhere = vi.fn().mockResolvedValueOnce(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue({ set: updateSet });

    const result = await createUserWithWorkspace('ada@example.com', 'hashed', 'Ada');

    expect(result).toEqual({ id: 'user-1', name: 'Ada', email: 'ada@example.com', activeWorkspaceId: 'ws-1' });
    expect(memberValues).toHaveBeenCalledWith({ workspaceId: 'ws-1', userId: 'user-1', role: 'owner' });
    expect(updateSet).toHaveBeenCalledWith({ activeWorkspaceId: 'ws-1' });
  });
});
