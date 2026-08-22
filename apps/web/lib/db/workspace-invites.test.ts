/**
 * Tests for workspace invite database operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return { ...actual, eq: vi.fn(actual.eq), and: vi.fn(actual.and), gt: vi.fn(actual.gt), desc: vi.fn(actual.desc) };
});

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

import { db } from '@/lib/db';
import { generateInviteToken, findActiveInvite, createInvite, getInviteByToken } from './workspace-invites';

const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);

describe('generateInviteToken', () => {
  it('returns a url-safe token of reasonable length', () => {
    const token = generateInviteToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('returns a different token on each call', () => {
    expect(generateInviteToken()).not.toBe(generateInviteToken());
  });
});

describe('findActiveInvite', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the most recent active, unexpired invite', async () => {
    const invite = { id: 'inv-1', token: 'tok', workspaceId: 'ws-1', status: 'active' };
    const limit = vi.fn().mockResolvedValueOnce([invite]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    // @ts-expect-error mock setup for testing
    mockSelect.mockReturnValue({ from });

    const result = await findActiveInvite('ws-1');

    expect(result).toEqual(invite);
  });

  it('returns null when no active invite exists', async () => {
    const limit = vi.fn().mockResolvedValueOnce([]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    // @ts-expect-error mock setup for testing
    mockSelect.mockReturnValue({ from });

    const result = await findActiveInvite('ws-1');

    expect(result).toBeNull();
  });
});

describe('createInvite', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts an invite with a generated token and a future expiry', async () => {
    const created = { id: 'inv-1', token: 'generated-token', workspaceId: 'ws-1', invitedByUserId: 'user-1' };
    const returning = vi.fn().mockResolvedValueOnce([created]);
    const values = vi.fn().mockReturnValue({ returning });
    // @ts-expect-error mock setup for testing
    mockInsert.mockReturnValue({ values });

    const result = await createInvite('ws-1', 'user-1');

    expect(result).toEqual(created);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', invitedByUserId: 'user-1', expiresAt: expect.any(Date) }),
    );
  });
});

describe('getInviteByToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the invite matching the token', async () => {
    const invite = { id: 'inv-1', token: 'tok' };
    const limit = vi.fn().mockResolvedValueOnce([invite]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    // @ts-expect-error mock setup for testing
    mockSelect.mockReturnValue({ from });

    const result = await getInviteByToken('tok');

    expect(result).toEqual(invite);
  });

  it('returns null when the token does not match any invite', async () => {
    const limit = vi.fn().mockResolvedValueOnce([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    // @ts-expect-error mock setup for testing
    mockSelect.mockReturnValue({ from });

    const result = await getInviteByToken('missing');

    expect(result).toBeNull();
  });
});
