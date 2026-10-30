import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSyncScheduler } from './scheduler';

const ok = { pushed: 0, pulled: 0 };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createSyncScheduler', () => {
  it('does nothing while offline', async () => {
    const sync = vi.fn().mockResolvedValue(ok);
    const scheduler = createSyncScheduler({ sync });

    scheduler.request();
    await vi.runAllTimersAsync();

    expect(sync).not.toHaveBeenCalled();
  });

  it('syncs right away when coming online', async () => {
    const sync = vi.fn().mockResolvedValue(ok);
    const scheduler = createSyncScheduler({ sync });

    scheduler.setOnline(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('debounces bursts of requests', async () => {
    const sync = vi.fn().mockResolvedValue(ok);
    const scheduler = createSyncScheduler({ sync, debounceMs: 500 });
    scheduler.setOnline(true);
    await vi.advanceTimersByTimeAsync(0);
    sync.mockClear();

    scheduler.request();
    await vi.advanceTimersByTimeAsync(300);
    scheduler.request();
    await vi.advanceTimersByTimeAsync(300);
    expect(sync).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('retries with exponential backoff and recovers', async () => {
    const sync = vi
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValue(ok);
    const scheduler = createSyncScheduler({ sync, minRetryMs: 1_000 });

    scheduler.setOnline(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(sync).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(sync).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1_999);
    expect(sync).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(sync).toHaveBeenCalledTimes(3);

    await vi.runAllTimersAsync();
    expect(sync).toHaveBeenCalledTimes(3);
  });

  it('stops retrying when going offline', async () => {
    const sync = vi.fn().mockRejectedValue(new Error('down'));
    const scheduler = createSyncScheduler({ sync });

    scheduler.setOnline(true);
    await vi.advanceTimersByTimeAsync(0);
    scheduler.setOnline(false);
    await vi.runAllTimersAsync();

    expect(sync).toHaveBeenCalledTimes(1);
  });
});
