import type { Cursor, LocalStore, Mutation, RemoteRow, RemoteStore } from './types';

/** In-memory implementations of the sync contracts, for fast tests. */

export class MemoryRemoteStore implements RemoteStore {
  readonly tables = new Map<string, Map<string, RemoteRow>>();
  upsertCalls: { table: string; rows: Record<string, unknown>[] }[] = [];
  failNextUpsert: Error | null = null;
  private clock = 0;

  upsert = async (table: string, rows: Record<string, unknown>[]) => {
    if (this.failNextUpsert) {
      const error = this.failNextUpsert;
      this.failNextUpsert = null;
      throw error;
    }
    this.upsertCalls.push({ table, rows });
    for (const row of rows) this.write(table, row as RemoteRow);
  };

  pull = async (table: string, cursor: Cursor | null, limit: number) => {
    return [...this.rowsOf(table).values()]
      .sort(compareKeyset)
      .filter((row) => !cursor || compareKeyset(row, toRow(cursor)) > 0)
      .slice(0, limit);
  };

  /** Simulates a write from another device; the server stamps `updated_at`. */
  write(table: string, row: { id: string; [column: string]: unknown }) {
    this.clock += 1;
    const updated_at = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, this.clock)).toISOString();
    const existing = this.rowsOf(table).get(row.id);
    this.rowsOf(table).set(row.id, { ...existing, ...row, updated_at });
  }

  rowsOf(table: string) {
    let rows = this.tables.get(table);
    if (!rows) {
      rows = new Map();
      this.tables.set(table, rows);
    }
    return rows;
  }
}

export class MemoryLocalStore implements LocalStore {
  readonly rows = new Map<string, Map<string, RemoteRow>>();
  readonly cursors = new Map<string, Cursor>();
  outbox: Mutation[] = [];
  private nextId = 1;

  enqueue(table: string, payload: Record<string, unknown> & { id: string }) {
    this.outbox.push({
      id: this.nextId++,
      table,
      recordId: payload.id,
      payload,
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
  }

  pendingMutations = async (limit: number) => this.outbox.slice(0, limit);

  ackMutations = async (ids: number[]) => {
    this.outbox = this.outbox.filter((m) => !ids.includes(m.id));
  };

  failMutations = async (ids: number[]) => {
    for (const m of this.outbox) if (ids.includes(m.id)) m.attempts += 1;
  };

  countPendingMutations = async () => this.outbox.length;

  applyRemoteRows = async (table: string, rows: RemoteRow[], cursor: Cursor) => {
    const pending = new Set(this.outbox.filter((m) => m.table === table).map((m) => m.recordId));
    let tableRows = this.rows.get(table);
    if (!tableRows) {
      tableRows = new Map();
      this.rows.set(table, tableRows);
    }
    for (const row of rows) if (!pending.has(row.id)) tableRows.set(row.id, row);
    this.cursors.set(table, cursor);
  };

  getCursor = async (table: string) => this.cursors.get(table) ?? null;
}

function toRow(cursor: Cursor): RemoteRow {
  return { id: cursor.id, updated_at: cursor.updatedAt };
}

function compareKeyset(a: RemoteRow, b: RemoteRow): number {
  if (a.updated_at !== b.updated_at) return a.updated_at < b.updated_at ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
