import { describe, expect, it } from 'vitest';
import { afterCursor } from './supabase';

describe('afterCursor', () => {
  it('builds a keyset filter that breaks timestamp ties by id', () => {
    expect(afterCursor({ updatedAt: '2026-01-01T00:00:00.000Z', id: 'abc' })).toBe(
      'updated_at.gt."2026-01-01T00:00:00.000Z",and(updated_at.eq."2026-01-01T00:00:00.000Z",id.gt.abc)',
    );
  });
});
