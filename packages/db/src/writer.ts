import { and, eq, isNull } from 'drizzle-orm';
import type { LocalDatabase } from './database';
import { outbox } from './schema';
import { type pullOnlyTables, type SyncedTableName, syncedTables } from './synced-tables';

/** Tables users write (the others are written by the server). */
export type WritableTable = Exclude<SyncedTableName, (typeof pullOnlyTables)[number]>;

type RowOf<N extends WritableTable> = (typeof syncedTables)[N]['table']['$inferSelect'];

export class ValidationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'ValidationError';
  }
}

export type RepositoryOptions = {
  generateId: () => string;
  /** The signed-in user (owner of new rows; picks the own profile among people). */
  userId?: () => string | null;
  now?: () => Date;
  /** Called after every committed write with the tables touched (e.g. to refresh queries and request a sync). */
  onChange?: (tables: string[]) => void;
};

export type Put = <N extends WritableTable>(table: N, row: RowOf<N>) => RowOf<N>;

/**
 * Every write goes through here: each row is saved AND its snapshot appended to
 * the outbox in the same transaction, so nothing is lost if the app dies before
 * syncing. `batch` commits several rows atomically and notifies once.
 */
export function createWriter(db: LocalDatabase, options: RepositoryOptions) {
  const { generateId, now = () => new Date(), onChange } = options;

  function batch<T>(fn: (put: Put) => T): T {
    const touched = new Set<string>();
    const result = db.transaction((tx) => {
      const put: Put = (name, row) => {
        const { table, toRemote } = syncedTables[name];
        // biome-ignore lint/suspicious/noExplicitAny: the registry pairs each table with its own row type
        const values = row as any;
        tx.insert(table).values(values).onConflictDoUpdate({ target: table.id, set: values }).run();
        tx.insert(outbox)
          .values({
            tableName: name,
            recordId: row.id,
            payload: toRemote(row),
            createdAt: row.updatedAt,
          })
          .run();
        touched.add(name);
        return row;
      };
      return fn(put);
    });
    if (touched.size) onChange?.([...touched]);
    return result;
  }

  const stamp = () => now().toISOString();

  return {
    batch,
    /** Tell listeners about direct local changes (no outbox: device-only tables, pruning). */
    notify: (tables: string[]) => onChange?.(tables),
    put: <N extends WritableTable>(name: N, row: RowOf<N>) => batch((put) => put(name, row)),
    stamp,
    /** Fields every new row needs. */
    fresh: () => {
      const ts = stamp();
      return { id: generateId(), createdAt: ts, updatedAt: ts, deletedAt: null };
    },
    /** Visible (not soft deleted) row by id. */
    get<N extends WritableTable>(name: N, id: string): RowOf<N> | undefined {
      const { table } = syncedTables[name];
      return db
        .select()
        .from(table)
        .where(and(eq(table.id, id), isNull(table.deletedAt)))
        .get() as RowOf<N> | undefined;
    },
    getOrThrow<N extends WritableTable>(name: N, id: string): RowOf<N> {
      const row = this.get(name, id);
      if (!row) throw new Error(`${name} not found: ${id}`);
      return row;
    },
  };
}

export type Writer = ReturnType<typeof createWriter>;

/** Trims and bounds a required text field, mirroring the Postgres checks. */
export function requiredText(value: string, max: number, code: string): string {
  const text = value.trim().slice(0, max);
  if (!text) throw new ValidationError(code);
  return text;
}
