import { syncedTables, wipeLocalData } from '@worlo/db';
import type { RemoteRow } from '@worlo/sync';
import { type Catalog, catalogEntries } from '@/data/catalogSpec';
import { dataEvents } from '@/data/events';
import { db } from '@/lib/database';
import * as mocks from '@/mocks/data.generated';
import { Ago, demoWorld, visibleTo } from '@/mocks/demoWorld';

const STAMP = '2026-01-01T00:00:00.000Z';

/**
 * Puts the device in the "demo account, fully synced" state: what Ana's phone
 * holds after a sync of the demo world (same generator as supabase/seeds/demo.sql,
 * filtered by the RLS rules) and the catalog. Rows go in directly, like a
 * pull: nothing lands in the outbox.
 */
export function seedDatabase({ demo = true }: { demo?: boolean } = {}) {
  wipeLocalData(db);
  const insert = (table: keyof typeof syncedTables, rows: Record<string, unknown>[]) => {
    const { table: target, toLocal } = syncedTables[table];
    for (const raw of rows) {
      const row = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, v instanceof Ago ? v.toISOString() : v]),
      );
      const values = toLocal({ updated_at: STAMP, ...row } as RemoteRow);
      db.insert(target)
        // biome-ignore lint/suspicious/noExplicitAny: rows match the table by construction
        .values(values as any)
        .run();
    }
  };
  insert(
    'catalog',
    catalogEntries(mocks as unknown as Catalog).map((e) => ({ ...e, deleted_at: null })),
  );
  if (demo) {
    for (const [table, rows] of Object.entries(visibleTo(demoWorld()))) {
      insert(table as keyof typeof syncedTables, rows);
    }
  }
  dataEvents.emit();
}
