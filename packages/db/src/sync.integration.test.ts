import { SyncEngine } from '@worlo/sync';
import { MemoryRemoteStore } from '@worlo/sync/testing';
import { describe, expect, it } from 'vitest';
import { createLocalStore } from './local-store';
import { syncOrder } from './synced-tables';
import { createTasksRepository } from './tasks';
import { createTestDatabase, generateId, sequentialClock } from './test-utils';

/** Real SQLite + real engine; only the server is faked. */
function device(remote: MemoryRemoteStore) {
  const db = createTestDatabase();
  const repo = createTasksRepository(db, { generateId, now: sequentialClock() });
  const engine = new SyncEngine({ local: createLocalStore(db), remote, tables: syncOrder });
  return { db, repo, engine };
}

describe('offline-first sync (SQLite ↔ remote)', () => {
  it('pushes changes made offline once a sync runs', async () => {
    const remote = new MemoryRemoteStore();
    const phone = device(remote);

    const task = phone.repo.create('Written offline');
    phone.repo.setCompleted(task.id, true);
    await phone.engine.sync();

    expect(remote.rowsOf('tasks').get(task.id)).toMatchObject({
      title: 'Written offline',
      completed: true,
    });
    expect(phone.engine.getStatus().pending).toBe(0);
  });

  it('propagates changes between two devices, including deletes', async () => {
    const remote = new MemoryRemoteStore();
    const phone = device(remote);
    const tablet = device(remote);

    const task = phone.repo.create('Shared');
    await phone.engine.sync();
    await tablet.engine.sync();
    expect(
      tablet.repo
        .listQuery()
        .all()
        .map((t) => t.title),
    ).toEqual(['Shared']);

    tablet.repo.remove(task.id);
    await tablet.engine.sync();
    await phone.engine.sync();
    expect(phone.repo.listQuery().all()).toEqual([]);
  });

  it('keeps unsynced local edits when the server has an older version', async () => {
    const remote = new MemoryRemoteStore();
    const phone = device(remote);
    const task = phone.repo.create('v1');
    await phone.engine.sync();

    // Another device edits it on the server while this phone edits it offline.
    remote.write('tasks', { id: task.id, title: 'server edit' });
    phone.repo.setCompleted(task.id, true);
    remote.failNextUpsert = new Error('offline');
    await phone.engine.sync().catch(() => {});

    const store = createLocalStore(phone.db);
    const serverRows = await remote.pull('tasks', null, 10);
    await store.applyRemoteRows('tasks', serverRows, { id: task.id, updatedAt: 'z' });

    expect(phone.repo.listQuery().all()[0]).toMatchObject({ title: 'v1', completed: true });
  });

  it('resumes pulling from the stored cursor', async () => {
    const remote = new MemoryRemoteStore();
    for (const id of ['a', 'b', 'c']) {
      remote.write('tasks', { id, title: id, completed: false, created_at: '2026-01-01' });
    }
    const phone = device(remote);

    expect((await phone.engine.sync()).pulled).toBe(3);
    expect((await phone.engine.sync()).pulled).toBe(0);
  });
});
