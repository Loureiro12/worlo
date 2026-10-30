import type { RemoteRow } from '@worlo/sync';
import { type Task, tasks } from './schema';

/**
 * Registry of tables kept in sync with Supabase. To sync a new table:
 * 1. add it to `schema.ts` (with id / updated_at / deleted_at),
 * 2. create the Postgres table + RLS in `supabase/migrations`,
 * 3. register its mappers here and add it to `syncOrder`.
 */

export const taskMapper = {
  table: tasks,
  toRemote: (task: Task) => ({
    id: task.id,
    title: task.title,
    completed: task.completed,
    created_at: task.createdAt,
    deleted_at: task.deletedAt,
  }),
  toLocal: (row: RemoteRow): Task => ({
    id: row.id,
    title: String(row.title),
    completed: Boolean(row.completed),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at,
    deletedAt: (row.deleted_at as string | null) ?? null,
  }),
};

export const syncedTables = {
  tasks: taskMapper,
} as const;

export type SyncedTableName = keyof typeof syncedTables;

/** Pull order: parents before children. */
export const syncOrder: readonly SyncedTableName[] = ['tasks'];

export function isSyncedTable(name: string): name is SyncedTableName {
  return name in syncedTables;
}
