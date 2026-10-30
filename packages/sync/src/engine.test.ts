import { describe, expect, it, vi } from 'vitest';
import { SyncEngine } from './engine';
import { MemoryLocalStore, MemoryRemoteStore } from './testing';

function setup(batchSize = 100) {
  const local = new MemoryLocalStore();
  const remote = new MemoryRemoteStore();
  const engine = new SyncEngine({
    local,
    remote,
    tables: ['tasks'],
    batchSize,
    now: () => new Date('2026-10-30T12:00:00.000Z'),
  });
  return { local, remote, engine };
}

describe('SyncEngine push', () => {
  it('pushes the outbox and clears it', async () => {
    const { local, remote, engine } = setup();
    local.enqueue('tasks', { id: 'a', title: 'A' });
    local.enqueue('tasks', { id: 'b', title: 'B' });

    const result = await engine.sync();

    expect(result.pushed).toBe(2);
    expect(local.outbox).toHaveLength(0);
    expect([...remote.rowsOf('tasks').keys()]).toEqual(['a', 'b']);
  });

  it('sends only the latest snapshot when a record changed several times', async () => {
    const { local, remote, engine } = setup();
    local.enqueue('tasks', { id: 'a', title: 'first' });
    local.enqueue('tasks', { id: 'a', title: 'second' });

    await engine.sync();

    expect(remote.upsertCalls).toEqual([{ table: 'tasks', rows: [{ id: 'a', title: 'second' }] }]);
  });

  it('keeps cross-table ordering by pushing consecutive groups', async () => {
    const { local, remote, engine } = setup();
    local.enqueue('lists', { id: 'l1' });
    local.enqueue('tasks', { id: 't1', list_id: 'l1' });
    local.enqueue('lists', { id: 'l2' });

    await engine.sync();

    expect(remote.upsertCalls.map((c) => c.table)).toEqual(['lists', 'tasks', 'lists']);
  });

  it('keeps mutations and reports the error when the server rejects them', async () => {
    const { local, remote, engine } = setup();
    local.enqueue('tasks', { id: 'a' });
    remote.failNextUpsert = new Error('network down');
    const pullSpy = vi.spyOn(remote, 'pull');

    await expect(engine.sync()).rejects.toThrow('network down');

    expect(local.outbox).toHaveLength(1);
    expect(local.outbox[0]?.attempts).toBe(1);
    expect(pullSpy).not.toHaveBeenCalled();
    expect(engine.getStatus()).toMatchObject({ state: 'error', error: 'network down', pending: 1 });
  });
});

describe('SyncEngine pull', () => {
  it('pages through remote changes and advances the cursor', async () => {
    const { local, remote, engine } = setup(2);
    for (const id of ['a', 'b', 'c', 'd', 'e']) remote.write('tasks', { id });

    const result = await engine.sync();

    expect(result.pulled).toBe(5);
    expect(local.rows.get('tasks')?.size).toBe(5);
    expect(local.cursors.get('tasks')?.id).toBe('e');
  });

  it('only fetches what changed since the last sync', async () => {
    const { remote, engine } = setup();
    remote.write('tasks', { id: 'a' });
    await engine.sync();

    remote.write('tasks', { id: 'b' });
    const result = await engine.sync();

    expect(result.pulled).toBe(1);
  });
});

describe('SyncEngine coordination', () => {
  it('coalesces concurrent calls into a single extra run', async () => {
    const { local, remote, engine } = setup();
    const upsert = vi.spyOn(remote, 'upsert');
    local.enqueue('tasks', { id: 'a' });

    const first = engine.sync();
    local.enqueue('tasks', { id: 'b' });
    const second = engine.sync();
    const third = engine.sync();

    expect(second).toBe(first);
    expect(third).toBe(first);
    await first;
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(local.outbox).toHaveLength(0);
  });

  it('notifies subscribers about status changes', async () => {
    const { local, engine } = setup();
    const states: string[] = [];
    engine.subscribe((s) => states.push(s.state));
    local.enqueue('tasks', { id: 'a' });

    await engine.refreshPending();
    expect(engine.getStatus().pending).toBe(1);

    await engine.sync();
    expect(states).toEqual(['idle', 'syncing', 'idle']);
    expect(engine.getStatus()).toMatchObject({
      pending: 0,
      lastSyncedAt: '2026-10-30T12:00:00.000Z',
    });
  });
});
