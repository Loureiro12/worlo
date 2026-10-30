import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Local (on-device) schema. Synced tables mirror their Postgres counterpart and
 * always have `id` (uuid generated on the device), `updated_at` and
 * `deleted_at` (soft delete, so deletions can be synced).
 *
 * After changing this file run `pnpm db:generate` to create a migration.
 */

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (t) => [index('tasks_deleted_at_idx').on(t.deletedAt)],
);

/** Local writes waiting to be pushed to the server (transactional outbox). */
export const outbox = sqliteTable(
  '_outbox',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tableName: text('table_name').notNull(),
    recordId: text('record_id').notNull(),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('outbox_record_idx').on(t.tableName, t.recordId)],
);

/** Pull position per table: keyset `(updated_at, id)` of the last row applied. */
export const syncCursors = sqliteTable('_sync_cursors', {
  tableName: text('table_name').primaryKey(),
  updatedAt: text('updated_at').notNull(),
  recordId: text('record_id').notNull(),
});

export type Task = typeof tasks.$inferSelect;
