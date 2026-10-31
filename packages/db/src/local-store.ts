import type { Cursor, LocalStore, RemoteRow } from '@worlo/sync';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import type { LocalDatabase } from './database';
import { outbox, photoFiles, rejected, syncCursors } from './schema';
import { isSyncedTable, syncedTables } from './synced-tables';

/**
 * SQLite implementation of the sync engine's LocalStore. `onChange` fires after
 * pulled rows are applied, so the UI can refresh.
 */
export function createLocalStore(
  db: LocalDatabase,
  { onChange }: { onChange?: (tables: string[]) => void } = {},
): LocalStore {
  return {
    async pendingMutations(limit) {
      const rows = db.select().from(outbox).orderBy(asc(outbox.id)).limit(limit).all();
      return rows.map((row) => ({
        id: row.id,
        table: row.tableName,
        recordId: row.recordId,
        payload: row.payload,
        attempts: row.attempts,
        createdAt: row.createdAt,
      }));
    },

    async ackMutations(ids) {
      if (ids.length === 0) return;
      db.delete(outbox).where(inArray(outbox.id, ids)).run();
    },

    async failMutations(ids, error) {
      if (ids.length === 0) return;
      db.update(outbox)
        .set({ attempts: sql`${outbox.attempts} + 1`, lastError: error })
        .where(inArray(outbox.id, ids))
        .run();
    },

    async rejectMutations(ids, error) {
      if (ids.length === 0) return;
      db.transaction((tx) => {
        const rows = tx.select().from(outbox).where(inArray(outbox.id, ids)).all();
        const rejectedAt = new Date().toISOString();
        for (const row of rows) {
          tx.insert(rejected)
            .values({
              tableName: row.tableName,
              recordId: row.recordId,
              payload: row.payload,
              error,
              rejectedAt,
            })
            .run();
        }
        tx.delete(outbox).where(inArray(outbox.id, ids)).run();
      });
    },

    async countPendingMutations() {
      return db.select({ n: count() }).from(outbox).get()?.n ?? 0;
    },

    async applyRemoteRows(tableName: string, rows: RemoteRow[], cursor: Cursor) {
      if (!isSyncedTable(tableName)) throw new Error(`Unknown synced table: ${tableName}`);
      const { table, toLocal } = syncedTables[tableName];

      db.transaction((tx) => {
        const pending = new Set(
          tx
            .select({ recordId: outbox.recordId })
            .from(outbox)
            .where(
              and(
                eq(outbox.tableName, tableName),
                inArray(
                  outbox.recordId,
                  rows.map((r) => r.id),
                ),
              ),
            )
            .all()
            .map((r) => r.recordId),
        );

        for (const row of rows) {
          // Local changes not pushed yet win; the server copy arrives on the next pull.
          if (pending.has(row.id)) continue;
          const values = toLocal(row);
          tx.insert(table)
            .values(values)
            .onConflictDoUpdate({ target: table.id, set: values })
            .run();
        }

        const position = { updatedAt: cursor.updatedAt, recordId: cursor.id };
        tx.insert(syncCursors)
          .values({ tableName, ...position })
          .onConflictDoUpdate({ target: syncCursors.tableName, set: position })
          .run();
      });
      if (rows.length) onChange?.([tableName]);
    },

    async getCursor(tableName) {
      const row = db.select().from(syncCursors).where(eq(syncCursors.tableName, tableName)).get();
      return row ? { updatedAt: row.updatedAt, id: row.recordId } : null;
    },
  };
}

/**
 * Erases every local row, pending change and cursor (sign out / account
 * deletion), so the next account starts from a clean device.
 */
export function wipeLocalData(db: LocalDatabase) {
  db.transaction((tx) => {
    for (const { table } of Object.values(syncedTables)) tx.delete(table).run();
    tx.delete(photoFiles).run();
    tx.delete(outbox).run();
    tx.delete(rejected).run();
    tx.delete(syncCursors).run();
  });
}
