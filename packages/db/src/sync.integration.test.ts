import { SyncEngine } from '@worlo/sync';
import { MemoryRemoteStore } from '@worlo/sync/testing';
import { describe, expect, it, vi } from 'vitest';
import { createLocalStore, wipeLocalData } from './local-store';
import { createRepositories } from './repositories';
import { syncOrder } from './synced-tables';
import { createTestDatabase, generateId, sequentialClock } from './test-utils';

/** Real SQLite + real engine; only the server is faked. */
function device(remote: MemoryRemoteStore) {
  const db = createTestDatabase();
  const repos = createRepositories(db, { generateId, now: sequentialClock() });
  const engine = new SyncEngine({ local: createLocalStore(db), remote, tables: syncOrder });
  return { db, repos, engine };
}

describe('offline-first sync (SQLite ↔ remote)', () => {
  it('pushes changes made offline once a sync runs, in the remote shape', async () => {
    const remote = new MemoryRemoteStore();
    const phone = device(remote);

    const trip = phone.repos.trips.create({ title: 'Kyoto', countryIso: '392' });
    phone.repos.trips.update(trip.id, { period: 'Abr 2025' });
    phone.repos.trips.addExpense(trip.id, { name: 'Ryokan', amount: 820, split: ['Bia'] });
    await phone.engine.sync();

    expect(remote.rowsOf('trips').get(trip.id)).toMatchObject({
      title: 'Kyoto',
      country_iso: '392',
      period: 'Abr 2025',
      deleted_at: null,
    });
    expect(remote.rowsOf('trips').get(trip.id)).not.toHaveProperty('updatedAt');
    expect([...remote.rowsOf('trip_expenses').values()][0]).toMatchObject({
      trip_id: trip.id,
      amount: 820,
      split: ['Bia'],
    });
    expect(phone.engine.getStatus().pending).toBe(0);
  });

  it('propagates changes between two devices, including deletes', async () => {
    const remote = new MemoryRemoteStore();
    const phone = device(remote);
    const tablet = device(remote);

    const trip = phone.repos.trips.create({ title: 'Shared' });
    phone.repos.world.toggleVisited('076', '2024');
    await phone.engine.sync();
    await tablet.engine.sync();
    expect(tablet.repos.trips.list().map((t) => t.title)).toEqual(['Shared']);
    expect(tablet.repos.world.visitedMap()).toEqual({ '076': ['2024'] });

    tablet.repos.trips.remove(trip.id);
    tablet.repos.world.toggleVisited('076');
    await tablet.engine.sync();
    await phone.engine.sync();
    expect(phone.repos.trips.list()).toEqual([]);
    expect(phone.repos.world.visitedMap()).toEqual({});
  });

  it('merges a country marked visited on two devices while offline', async () => {
    const remote = new MemoryRemoteStore();
    const phone = device(remote);
    const tablet = device(remote);

    phone.repos.world.toggleVisited('380', '2023');
    tablet.repos.world.toggleVisited('380', '2025');
    await phone.engine.sync();
    await tablet.engine.sync();
    await phone.engine.sync();

    expect(phone.repos.world.visitedMap()).toEqual({ '380': ['2023', '2025'] });
    // Turning it off removes both rows.
    phone.repos.world.toggleVisited('380');
    await phone.engine.sync();
    await tablet.engine.sync();
    expect(tablet.repos.world.visitedMap()).toEqual({});
  });

  it('keeps unsynced local edits when the server has an older version', async () => {
    const remote = new MemoryRemoteStore();
    const phone = device(remote);
    const trip = phone.repos.trips.create({ title: 'v1' });
    await phone.engine.sync();

    // Another device edits it on the server while this phone edits it offline.
    remote.write('trips', { id: trip.id, title: 'server edit' });
    phone.repos.trips.update(trip.id, { period: 'offline edit' });
    remote.failNextUpsert = new Error('offline');
    await phone.engine.sync().catch(() => {});

    const store = createLocalStore(phone.db);
    const serverRows = await remote.pull('trips', null, 10);
    await store.applyRemoteRows('trips', serverRows, { id: trip.id, updatedAt: 'z' });

    expect(phone.repos.trips.get(trip.id)).toMatchObject({ title: 'v1', period: 'offline edit' });
  });

  it('pulls the read-only catalog and notifies listeners', async () => {
    const remote = new MemoryRemoteStore();
    remote.write('catalog', {
      id: 'country:076',
      kind: 'country',
      key: '076',
      sort: 0,
      data: { name: 'Brasil' },
    });
    const db = createTestDatabase();
    const onChange = vi.fn();
    const engine = new SyncEngine({
      local: createLocalStore(db, { onChange }),
      remote,
      tables: syncOrder,
    });
    const repos = createRepositories(db, { generateId });

    expect((await engine.sync()).pulled).toBe(1);
    expect(repos.catalog.rows()[0]).toMatchObject({ kind: 'country', data: { name: 'Brasil' } });
    expect(onChange).toHaveBeenCalledWith(['catalog']);
    expect((await engine.sync()).pulled).toBe(0);
  });

  it('wipes everything on sign out', async () => {
    const remote = new MemoryRemoteStore();
    const phone = device(remote);
    phone.repos.trips.create({ title: 'Private' });
    await phone.engine.sync();
    phone.repos.saved.toggle({ refId: 's1', name: 'Belém' });

    wipeLocalData(phone.db);

    expect(phone.repos.trips.list()).toEqual([]);
    expect(phone.repos.saved.items()).toEqual([]);
    expect(await createLocalStore(phone.db).countPendingMutations()).toBe(0);
    expect(await createLocalStore(phone.db).getCursor('trips')).toBeNull();
  });
});
