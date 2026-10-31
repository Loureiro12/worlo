import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createSupabaseRemoteStore } from './supabase';

/**
 * Runs against a real Supabase (local stack or CI). Skipped unless configured:
 *   SUPABASE_URL=http://127.0.0.1:56321 SUPABASE_PUBLISHABLE_KEY=... pnpm --filter @worlo/sync test
 */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

describe.runIf(url && key)('Supabase remote store', () => {
  async function signedInStore() {
    const client = createClient(url as string, key as string, {
      auth: { persistSession: false },
    });
    const { error } = await client.auth.signUp({
      email: `sync-${randomUUID()}@example.com`,
      password: randomUUID(),
    });
    if (error) throw error;
    return createSupabaseRemoteStore(client);
  }

  it('upserts idempotently and pages with the keyset cursor', async () => {
    const store = await signedInStore();
    const rows = Array.from({ length: 5 }, (_, i) => ({
      id: randomUUID(),
      title: `trip ${i}`,
      created_at: new Date().toISOString(),
    }));

    await store.upsert('trips', rows);
    await store.upsert('trips', [{ ...rows[0], period: 'edited' }]);

    const pulled = [];
    let cursor = null;
    for (;;) {
      const page = await store.pull('trips', cursor, 2);
      pulled.push(...page);
      const last = page.at(-1);
      if (!last || page.length < 2) break;
      cursor = { updatedAt: last.updated_at, id: last.id };
    }

    expect(pulled).toHaveLength(5);
    expect(new Set(pulled.map((r) => r.id)).size).toBe(5);
    expect(pulled.at(-1)).toMatchObject({ id: rows[0]?.id, period: 'edited' });
  });

  it('only sees rows of the signed-in user (RLS)', async () => {
    const alice = await signedInStore();
    const bob = await signedInStore();
    await alice.upsert('trips', [
      { id: randomUUID(), title: 'private', created_at: new Date().toISOString() },
    ]);

    expect(await bob.pull('trips', null, 100)).toEqual([]);
  });
});
