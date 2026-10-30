import type { SyncResult } from './types';

export type SyncSchedulerOptions = {
  sync: () => Promise<SyncResult>;
  /** Groups bursts of local writes into a single sync. */
  debounceMs?: number;
  minRetryMs?: number;
  maxRetryMs?: number;
};

export type SyncScheduler = {
  /** Ask for a sync soon (debounced). No-op while offline. */
  request(): void;
  /** Online = network reachable AND an authenticated session exists. */
  setOnline(online: boolean): void;
  dispose(): void;
};

export function createSyncScheduler({
  sync,
  debounceMs = 500,
  minRetryMs = 1_000,
  maxRetryMs = 60_000,
}: SyncSchedulerOptions): SyncScheduler {
  let online = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedule = (delayMs: number) => {
    clear();
    timer = setTimeout(run, delayMs);
  };

  async function run() {
    timer = null;
    if (!online) return;
    try {
      await sync();
      failures = 0;
    } catch {
      failures += 1;
      if (online) schedule(Math.min(maxRetryMs, minRetryMs * 2 ** (failures - 1)));
    }
  }

  return {
    request() {
      // A pending retry already covers this request; don't reset its backoff.
      if (online && failures === 0) schedule(debounceMs);
    },
    setOnline(next) {
      const cameOnline = next && !online;
      online = next;
      if (cameOnline) {
        failures = 0;
        schedule(0);
      } else if (!next) {
        clear();
      }
    },
    dispose() {
      online = false;
      clear();
    },
  };
}
