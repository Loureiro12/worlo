import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cursor, RemoteRow, RemoteStore } from '../types';

/**
 * Every synced table must have: `id uuid` (generated on the client),
 * `updated_at timestamptz` (set by a trigger on the server) and `deleted_at`
 * for soft deletes. Row Level Security scopes rows to the current user.
 */
export function createSupabaseRemoteStore(
  // biome-ignore lint/suspicious/noExplicitAny: the store is schema-agnostic on purpose
  client: SupabaseClient<any, any, any>,
): RemoteStore {
  return {
    async upsert(table, rows) {
      const { error } = await client.from(table).upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    },

    async pull(table, cursor, limit) {
      let query = client
        .from(table)
        .select('*')
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit);

      if (cursor) query = query.or(afterCursor(cursor));

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as RemoteRow[];
    },
  };
}

/** Keyset pagination: `(updated_at, id) > (cursor.updatedAt, cursor.id)`. */
export function afterCursor({ updatedAt, id }: Cursor): string {
  const ts = `"${updatedAt}"`;
  return `updated_at.gt.${ts},and(updated_at.eq.${ts},id.gt.${id})`;
}
