/**
 * Contracts of the sync engine.
 *
 * The local database is the source of truth for the UI. Every local write is
 * recorded in an outbox (`Mutation`) inside the same transaction; the engine
 * pushes the outbox to the server and then pulls remote changes using a
 * keyset cursor over `(updated_at, id)`.
 *
 * Rows travel in the *remote* shape (snake_case, as stored in Postgres).
 * Mapping to the local shape is the LocalStore's responsibility.
 */

export type RemoteRow = {
  id: string;
  updated_at: string;
  deleted_at?: string | null;
  [column: string]: unknown;
};

export type Mutation = {
  id: number;
  table: string;
  recordId: string;
  /** Full snapshot of the record in the remote shape. Upserts are idempotent. */
  payload: Record<string, unknown>;
  attempts: number;
  createdAt: string;
};

export type Cursor = {
  updatedAt: string;
  id: string;
};

export interface LocalStore {
  /** Oldest first. */
  pendingMutations(limit: number): Promise<Mutation[]>;
  ackMutations(ids: number[]): Promise<void>;
  failMutations(ids: number[], error: string): Promise<void>;
  /**
   * The server refused these for good (permission, constraint): take them out
   * of the queue (keep them aside for diagnosis) so the rest can sync.
   */
  rejectMutations(ids: number[], error: string): Promise<void>;
  countPendingMutations(): Promise<number>;
  /**
   * Upsert rows coming from the server and advance the table cursor, atomically.
   * Implementations MUST skip records that still have pending mutations: the
   * local version wins until it is pushed.
   */
  applyRemoteRows(table: string, rows: RemoteRow[], cursor: Cursor): Promise<void>;
  getCursor(table: string): Promise<Cursor | null>;
}

export interface RemoteStore {
  upsert(table: string, rows: Record<string, unknown>[]): Promise<void>;
  /** Rows strictly after `cursor`, ordered by `(updated_at, id)` ascending. */
  pull(table: string, cursor: Cursor | null, limit: number): Promise<RemoteRow[]>;
}

export type SyncState = 'idle' | 'syncing' | 'error';

export type SyncStatus = {
  state: SyncState;
  pending: number;
  lastSyncedAt: string | null;
  error: string | null;
};

export type SyncResult = {
  pushed: number;
  pulled: number;
};
