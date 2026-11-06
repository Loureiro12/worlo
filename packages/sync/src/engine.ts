import type { Cursor, LocalStore, Mutation, RemoteStore, SyncResult, SyncStatus } from './types';

export type SyncEngineOptions = {
  local: LocalStore;
  remote: RemoteStore;
  /**
   * Errors that retrying won't fix (default: Postgres permission / integrity /
   * data errors). The offending rows are rejected instead of blocking the queue.
   */
  isPermanentError?: (error: unknown) => boolean;
  /** Tables pulled from the server, in dependency order (parents first). */
  tables: readonly string[];
  batchSize?: number;
  now?: () => Date;
  /** Told about rows the server refused for good (they leave the outbox). */
  onRejected?: (table: string, error: string, count: number) => void;
};

type Listener = (status: SyncStatus) => void;

export class SyncEngine {
  private readonly local: LocalStore;
  private readonly remote: RemoteStore;
  private readonly tables: readonly string[];
  private readonly batchSize: number;
  private readonly now: () => Date;
  private readonly isPermanentError: (error: unknown) => boolean;
  private readonly onRejected: (table: string, error: string, count: number) => void;

  private inFlight: Promise<SyncResult> | null = null;
  private rerunRequested = false;
  private listeners = new Set<Listener>();
  private status: SyncStatus = { state: 'idle', pending: 0, lastSyncedAt: null, error: null };

  constructor(options: SyncEngineOptions) {
    this.local = options.local;
    this.remote = options.remote;
    this.tables = options.tables;
    this.batchSize = options.batchSize ?? 100;
    this.now = options.now ?? (() => new Date());
    this.isPermanentError = options.isPermanentError ?? isPostgresPermanentError;
    this.onRejected = options.onRejected ?? (() => {});
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Call after local writes so the UI can show how many changes are waiting. */
  async refreshPending(): Promise<void> {
    this.setStatus({ pending: await this.local.countPendingMutations() });
  }

  /**
   * Push the outbox, then pull remote changes. Concurrent calls are coalesced:
   * a call made while a sync is running schedules exactly one extra run, so
   * writes made mid-sync are never left behind.
   */
  sync(): Promise<SyncResult> {
    if (this.inFlight) {
      this.rerunRequested = true;
      return this.inFlight;
    }
    this.inFlight = this.runUntilSettled().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async runUntilSettled(): Promise<SyncResult> {
    const total: SyncResult = { pushed: 0, pulled: 0 };
    do {
      this.rerunRequested = false;
      const result = await this.runOnce();
      total.pushed += result.pushed;
      total.pulled += result.pulled;
    } while (this.rerunRequested);
    return total;
  }

  private async runOnce(): Promise<SyncResult> {
    this.setStatus({ state: 'syncing', error: null });
    try {
      const pushed = await this.push();
      const pulled = await this.pull();
      this.setStatus({
        state: 'idle',
        pending: await this.local.countPendingMutations(),
        lastSyncedAt: this.now().toISOString(),
      });
      return { pushed, pulled };
    } catch (error) {
      this.setStatus({
        state: 'error',
        pending: await this.local.countPendingMutations().catch(() => this.status.pending),
        error: errorMessage(error),
      });
      throw error;
    }
  }

  private async push(): Promise<number> {
    let pushed = 0;
    for (;;) {
      const batch = await this.local.pendingMutations(this.batchSize);
      if (batch.length === 0) return pushed;

      for (const { table, mutations } of groupConsecutiveByTable(batch)) {
        const ids = mutations.map((m) => m.id);
        try {
          await this.remote.upsert(table, latestSnapshotPerRecord(mutations));
        } catch (error) {
          if (!this.isPermanentError(error)) {
            await this.local.failMutations(ids, errorMessage(error));
            throw error;
          }
          // One bad row fails the whole statement: find it record by record.
          pushed += await this.pushOneByOne(table, mutations);
          continue;
        }
        await this.local.ackMutations(ids);
        pushed += mutations.length;
      }
    }
  }

  private async pushOneByOne(table: string, mutations: Mutation[]): Promise<number> {
    let pushed = 0;
    const byRecord = new Map<string, Mutation[]>();
    for (const m of mutations) byRecord.set(m.recordId, [...(byRecord.get(m.recordId) ?? []), m]);
    for (const group of byRecord.values()) {
      const ids = group.map((m) => m.id);
      try {
        await this.remote.upsert(table, latestSnapshotPerRecord(group));
        await this.local.ackMutations(ids);
        pushed += group.length;
      } catch (error) {
        if (!this.isPermanentError(error)) {
          await this.local.failMutations(ids, errorMessage(error));
          throw error;
        }
        await this.local.rejectMutations(ids, errorMessage(error));
        this.onRejected(table, errorMessage(error), ids.length);
      }
    }
    return pushed;
  }

  private async pull(): Promise<number> {
    let pulled = 0;
    for (const table of this.tables) {
      let cursor = await this.local.getCursor(table);
      for (;;) {
        const rows = await this.remote.pull(table, cursor, this.batchSize);
        const last = rows.at(-1);
        if (!last) break;

        cursor = { updatedAt: last.updated_at, id: last.id } satisfies Cursor;
        await this.local.applyRemoteRows(table, rows, cursor);
        pulled += rows.length;
        if (rows.length < this.batchSize) break;
      }
    }
    return pulled;
  }

  private setStatus(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch };
    for (const listener of this.listeners) listener(this.status);
  }
}

/** Preserves global ordering while letting each table be pushed in one request. */
export function groupConsecutiveByTable(
  mutations: Mutation[],
): { table: string; mutations: Mutation[] }[] {
  const groups: { table: string; mutations: Mutation[] }[] = [];
  for (const mutation of mutations) {
    const current = groups.at(-1);
    if (current?.table === mutation.table) current.mutations.push(mutation);
    else groups.push({ table: mutation.table, mutations: [mutation] });
  }
  return groups;
}

/**
 * Postgres rejects an upsert that touches the same row twice in one statement,
 * and only the latest snapshot matters anyway.
 */
export function latestSnapshotPerRecord(mutations: Mutation[]): Record<string, unknown>[] {
  const byRecord = new Map<string, Record<string, unknown>>();
  for (const mutation of mutations) {
    byRecord.delete(mutation.recordId);
    byRecord.set(mutation.recordId, mutation.payload);
  }
  return [...byRecord.values()];
}

/**
 * Postgres SQLSTATE classes that won't succeed on retry: 42 (permission / RLS,
 * syntax), 23 (integrity), 22 (data), P0 (raised by our triggers). Network
 * errors, timeouts and expired JWTs have no such code and are retried.
 */
export function isPostgresPermanentError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^(42|23|22|P0)/.test(code);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) return String(error.message);
  return String(error);
}
