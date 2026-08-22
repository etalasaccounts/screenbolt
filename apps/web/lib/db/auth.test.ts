/**
 * Tests for auth database operations.
 *
 * Tests verify the function implementations by exercising real auth functions
 * against a mocked database layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findUserByEmail,
  findUserById,
  createUserWithPassword,
  updateGoogleTokens,
  clearGoogleTokens,
  updateDropboxTokens,
  clearDropboxTokens,
  updateUserProfile,
} from './auth';

// Mock drizzle-orm's eq function to spy on its calls
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return { ...actual, eq: vi.fn(actual.eq) };
});

// Mock the db module
vi.mock('@/lib/db', () => {
  const mockQuery = {
    users: {
      findFirst: vi.fn(),
    },
  };

  const mockDb = {
    query: mockQuery,
    insert: vi.fn(),
    update: vi.fn(),
  };

  return {
    db: mockDb,
  };
});

// We need to import after mocking to get the mocked db
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Type helpers for mocked functions
const mockDbQuery = vi.mocked(db.query);
const mockDbInsert = vi.mocked(db.insert);
const mockDbUpdate = vi.mocked(db.update);

describe('findUserByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when found', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test' };
    // @ts-expect-error - mock setup for testing
    mockDbQuery.users.findFirst.mockResolvedValueOnce(mockUser);

    const result = await findUserByEmail('test@example.com');
    expect(result).toEqual(mockUser);
  });

  it('returns null when user not found', async () => {
    // @ts-expect-error - mock setup for testing
    mockDbQuery.users.findFirst.mockResolvedValueOnce(undefined);

    const result = await findUserByEmail('notfound@example.com');
    expect(result).toBeNull();
  });

  it('normalizes email to lowercase', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test' };
    // @ts-expect-error - mock setup for testing
    mockDbQuery.users.findFirst.mockResolvedValueOnce(mockUser);

    await findUserByEmail('TEST@EXAMPLE.COM');

    // Spy on eq and verify it was called with the lowercased email
    const mockEq = vi.mocked(eq);
    expect(mockEq).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com'
    );
  });
});

describe('findUserById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when found', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test' };
    // @ts-expect-error - mock setup for testing
    mockDbQuery.users.findFirst.mockResolvedValueOnce(mockUser);

    const result = await findUserById('user-1');
    expect(result).toEqual(mockUser);
  });

  it('returns null when user not found', async () => {
    // @ts-expect-error - mock setup for testing
    mockDbQuery.users.findFirst.mockResolvedValueOnce(undefined);

    const result = await findUserById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('createUserWithPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a user with email and password', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'new@example.com',
      name: 'New User',
      password: 'hashed',
    };
    const chainMock = {
      returning: vi.fn().mockResolvedValueOnce([mockUser]),
    };
    const insertChain = {
      values: vi.fn().mockReturnValue(chainMock),
    };
    // @ts-expect-error - mock setup for testing
    mockDbInsert.mockReturnValue(insertChain);

    const result = await createUserWithPassword(
      'new@example.com',
      'hashed',
      'New User'
    );

    expect(result).toEqual(mockUser);
  });

  it('normalizes email to lowercase', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'new@example.com',
      name: 'New User',
      password: 'hashed',
    };
    const chainMock = {
      returning: vi.fn().mockResolvedValueOnce([mockUser]),
    };
    const insertChain = {
      values: vi.fn().mockReturnValue(chainMock),
    };
    // @ts-expect-error - mock setup for testing
    mockDbInsert.mockReturnValue(insertChain);

    await createUserWithPassword('NEW@EXAMPLE.COM', 'hashed', 'New User');

    const valuesCall = insertChain.values.mock.calls[0]?.[0];
    expect(valuesCall?.email).toBe('new@example.com');
  });

  it('trims name whitespace', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'new@example.com',
      name: 'New User',
      password: 'hashed',
    };
    const chainMock = {
      returning: vi.fn().mockResolvedValueOnce([mockUser]),
    };
    const insertChain = {
      values: vi.fn().mockReturnValue(chainMock),
    };
    // @ts-expect-error - mock setup for testing
    mockDbInsert.mockReturnValue(insertChain);

    await createUserWithPassword('new@example.com', 'hashed', '  New User  ');

    const valuesCall = insertChain.values.mock.calls[0]?.[0];
    expect(valuesCall?.name).toBe('New User');
  });
});

describe('updateGoogleTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates Google OAuth tokens', async () => {
    const chainMock = {
      where: vi.fn().mockResolvedValueOnce(undefined),
    };
    const setChain = {
      set: vi.fn().mockReturnValue(chainMock),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(setChain);

    await updateGoogleTokens('user-1', 'access-token', 'refresh-token', 3600);

    expect(mockDbUpdate).toHaveBeenCalled();
    const setCall = setChain.set.mock.calls[0]?.[0];
    expect(setCall?.googleAccessToken).toBe('access-token');
    expect(setCall?.googleRefreshToken).toBe('refresh-token');
  });

  it('does not update refresh token when null', async () => {
    const chainMock = {
      where: vi.fn().mockResolvedValueOnce(undefined),
    };
    const setChain = {
      set: vi.fn().mockReturnValue(chainMock),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(setChain);

    await updateGoogleTokens('user-1', 'access-token', null, 3600);

    const setCall = setChain.set.mock.calls[0]?.[0];
    expect(setCall).not.toHaveProperty('googleRefreshToken');
  });
});

describe('clearGoogleTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears Google OAuth tokens', async () => {
    const chainMock = {
      where: vi.fn().mockResolvedValueOnce(undefined),
    };
    const setChain = {
      set: vi.fn().mockReturnValue(chainMock),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(setChain);

    await clearGoogleTokens('user-1');

    expect(mockDbUpdate).toHaveBeenCalled();
    const setCall = setChain.set.mock.calls[0]?.[0];
    expect(setCall?.googleAccessToken).toBeNull();
    expect(setCall?.googleRefreshToken).toBeNull();
    expect(setCall?.googleTokenExpiry).toBeNull();
  });
});

describe('updateDropboxTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates Dropbox OAuth tokens', async () => {
    const chainMock = {
      where: vi.fn().mockResolvedValueOnce(undefined),
    };
    const setChain = {
      set: vi.fn().mockReturnValue(chainMock),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(setChain);

    await updateDropboxTokens('user-1', 'access-token', 'refresh-token', 3600);

    expect(mockDbUpdate).toHaveBeenCalled();
    const setCall = setChain.set.mock.calls[0]?.[0];
    expect(setCall?.dropboxAccessToken).toBe('access-token');
    expect(setCall?.dropboxRefreshToken).toBe('refresh-token');
  });

  it('does not update refresh token when null or undefined', async () => {
    const chainMock = {
      where: vi.fn().mockResolvedValueOnce(undefined),
    };
    const setChain = {
      set: vi.fn().mockReturnValue(chainMock),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(setChain);

    await updateDropboxTokens('user-1', 'access-token', null, 3600);

    const setCall = setChain.set.mock.calls[0]?.[0];
    expect(setCall).not.toHaveProperty('dropboxRefreshToken');
  });
});

describe('clearDropboxTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears Dropbox OAuth tokens', async () => {
    const chainMock = {
      where: vi.fn().mockResolvedValueOnce(undefined),
    };
    const setChain = {
      set: vi.fn().mockReturnValue(chainMock),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(setChain);

    await clearDropboxTokens('user-1');

    expect(mockDbUpdate).toHaveBeenCalled();
    const setCall = setChain.set.mock.calls[0]?.[0];
    expect(setCall?.dropboxAccessToken).toBeNull();
    expect(setCall?.dropboxRefreshToken).toBeNull();
    expect(setCall?.dropboxTokenExpiry).toBeNull();
  });
});

describe('updateUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates user name and email', async () => {
    const mockUser = { id: 'user-1', email: 'updated@example.com', name: 'Updated' };
    const whereChain = {
      returning: vi.fn().mockResolvedValueOnce([mockUser]),
    };
    const setChain = {
      where: vi.fn().mockReturnValue(whereChain),
    };
    const updateChain = {
      set: vi.fn().mockReturnValue(setChain),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(updateChain);

    const result = await updateUserProfile('user-1', {
      name: 'Updated',
      email: 'updated@example.com',
    });

    expect(result).toEqual(mockUser);
  });

  it('normalizes email to lowercase', async () => {
    const mockUser = { id: 'user-1', email: 'updated@example.com', name: 'Updated' };
    const whereChain = {
      returning: vi.fn().mockResolvedValueOnce([mockUser]),
    };
    const setChain = {
      where: vi.fn().mockReturnValue(whereChain),
    };
    const updateChain = {
      set: vi.fn().mockReturnValue(setChain),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(updateChain);

    await updateUserProfile('user-1', { email: 'UPDATED@EXAMPLE.COM' });

    const setCall = updateChain.set.mock.calls[0]?.[0];
    expect(setCall?.email).toBe('updated@example.com');
  });

  it('trims name whitespace', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Updated' };
    const whereChain = {
      returning: vi.fn().mockResolvedValueOnce([mockUser]),
    };
    const setChain = {
      where: vi.fn().mockReturnValue(whereChain),
    };
    const updateChain = {
      set: vi.fn().mockReturnValue(setChain),
    };
    // @ts-expect-error - mock setup for testing
    mockDbUpdate.mockReturnValue(updateChain);

    await updateUserProfile('user-1', { name: '  Updated  ' });

    const setCall = updateChain.set.mock.calls[0]?.[0];
    expect(setCall?.name).toBe('Updated');
  });
});
