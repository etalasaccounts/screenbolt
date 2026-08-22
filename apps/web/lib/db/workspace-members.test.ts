/**
 * Tests for workspace membership database operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return { ...actual, eq: vi.fn(actual.eq), and: vi.fn(actual.and) };
});

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

import { db } from '@/lib/db';
import { addWorkspaceMember, isWorkspaceMember } from './workspace-members';

const mockInsert = vi.mocked(db.insert);
const mockSelect = vi.mocked(db.select);

describe('addWorkspaceMember', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a workspace member row with the given role', async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValueOnce(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    // @ts-expect-error mock setup for testing
    mockInsert.mockReturnValue({ values });

    await addWorkspaceMember('ws-1', 'user-1', 'owner');

    expect(values).toHaveBeenCalledWith({ workspaceId: 'ws-1', userId: 'user-1', role: 'owner' });
    expect(onConflictDoNothing).toHaveBeenCalled();
  });
});

describe('isWorkspaceMember', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when a membership row exists', async () => {
    const limit = vi.fn().mockResolvedValueOnce([{ userId: 'user-1' }]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    // @ts-expect-error mock setup for testing
    mockSelect.mockReturnValue({ from });

    const result = await isWorkspaceMember('ws-1', 'user-1');

    expect(result).toBe(true);
  });

  it('returns false when no membership row exists', async () => {
    const limit = vi.fn().mockResolvedValueOnce([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    // @ts-expect-error mock setup for testing
    mockSelect.mockReturnValue({ from });

    const result = await isWorkspaceMember('ws-1', 'user-2');

    expect(result).toBe(false);
  });
});
