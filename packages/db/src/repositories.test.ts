import { describe, expect, it, vi } from 'vitest';
import { createLocalStore } from './local-store';
import { createRepositories } from './repositories';
import { createTestDatabase, generateId, sequentialClock } from './test-utils';
import { ValidationError } from './writer';

function setup() {
  const db = createTestDatabase();
  const onChange = vi.fn();
  const repos = createRepositories(db, { generateId, now: sequentialClock(), onChange });
  const pending = () => createLocalStore(db).pendingMutations(100);
  return { db, repos, onChange, pending };
}

describe('writes', () => {
  it('records every write in the outbox, in the same order, and notifies once per write', async () => {
    const { repos, onChange, pending } = setup();
    const trip = repos.trips.create({ title: '  Kyoto  ' });
    repos.trips.update(trip.id, { period: 'Abr' });

    expect(trip.title).toBe('Kyoto');
    expect((await pending()).map((m) => [m.table, m.recordId])).toEqual([
      ['trips', trip.id],
      ['trips', trip.id],
    ]);
    expect(onChange).toHaveBeenNthCalledWith(1, ['trips']);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('rejects rows the server would refuse, before they reach the outbox', async () => {
    const { repos, pending } = setup();
    expect(() => repos.trips.create({ title: '   ' })).toThrow(ValidationError);
    expect(() => repos.world.toggleVisited('BR')).toThrow(ValidationError);
    expect(() => repos.saved.createCollection('')).toThrow(ValidationError);
    expect(await pending()).toEqual([]);
  });

  it('soft deletes: removed rows disappear from reads but are synced', async () => {
    const { repos, pending } = setup();
    const trip = repos.trips.create({ title: 'Gone' });
    repos.trips.remove(trip.id);
    expect(repos.trips.list()).toEqual([]);
    expect((await pending()).at(-1)?.payload).toMatchObject({ id: trip.id });
    expect((await pending()).at(-1)?.payload.deleted_at).toBeTruthy();
  });
});

describe('world', () => {
  it('marks several countries without duplicating the ones already visited', () => {
    const { repos } = setup();
    repos.world.toggleVisited('076', '2020');
    repos.world.markManyVisited(['076', '380', '380'], '2024');
    expect(repos.world.visitedMap()).toEqual({ '076': ['2020'], '380': ['2024'] });
  });

  it('adds a visit year without turning the country off', () => {
    const { repos } = setup();
    repos.world.addVisitYear('076', '2020');
    repos.world.addVisitYear('076', '2025');
    repos.world.addVisitYear('076', '2025');
    expect(repos.world.visitedMap()).toEqual({ '076': ['2020', '2025'] });
    expect(repos.world.visited()).toHaveLength(1);
  });

  it('toggles a wishlist country', () => {
    const { repos } = setup();
    repos.world.toggleWishCountry('392', 'Japão', '🇯🇵');
    expect(repos.world.wishes().map((w) => w.name)).toEqual(['Japão']);
    repos.world.toggleWishCountry('392', 'Japão');
    expect(repos.world.wishes()).toEqual([]);
  });
});

describe('trips', () => {
  it('lists expenses of a trip, newest first', () => {
    const { repos } = setup();
    const trip = repos.trips.create({ title: 'Lisboa' });
    repos.trips.addExpense(trip.id, { name: 'Pastéis', amount: 12 });
    repos.trips.addExpense(trip.id, { name: 'Elétrico', amount: 3 });
    expect(repos.trips.expenses(trip.id).map((e) => e.name)).toEqual(['Elétrico', 'Pastéis']);
    expect(() => repos.trips.addExpense(trip.id, { name: 'x', amount: -1 })).toThrow(
      ValidationError,
    );
  });
});

describe('travel mode', () => {
  it('resumes the same itinerary and starts fresh for another one', () => {
    const { repos } = setup();
    const peru = repos.planning.create({ title: 'Peru' });
    const japan = repos.planning.create({ title: 'Japão' });

    const first = repos.planning.startLive(peru.id);
    repos.planning.updateSession({ day: 2, done: { '0-0': true } });
    repos.planning.updateSession({ active: false });
    const resumed = repos.planning.startLive(peru.id);
    expect(resumed).toMatchObject({ id: first.id, active: true, day: 2 });

    const other = repos.planning.startLive(japan.id);
    expect(other.id).not.toBe(first.id);
    expect(other).toMatchObject({ day: 1, done: {}, spent: 0 });
  });

  it('logs entries newest first and adds expenses to what was spent', () => {
    const { repos } = setup();
    const peru = repos.planning.create({ title: 'Peru' });
    const session = repos.planning.startLive(peru.id);
    repos.planning.addLog({ type: 'checkin', text: 'Café Ayllu' });
    repos.planning.addLog({ type: 'expense', text: 'Almoço', amount: 45.5 });

    expect(repos.planning.logs(session.id).map((l) => l.text)).toEqual(['Almoço', 'Café Ayllu']);
    expect(repos.planning.currentSession()?.spent).toBe(45.5);
  });
});

describe('saved', () => {
  it('unsaving drops the item from every collection', () => {
    const { repos } = setup();
    repos.saved.toggle({ refId: 's1', name: 'Belém' });
    const c = repos.saved.createCollection('Lisboa', 's1');
    expect(repos.saved.isSaved('s1')).toBe(true);

    repos.saved.toggle({ refId: 's1' });
    expect(repos.saved.isSaved('s1')).toBe(false);
    expect(repos.saved.collections().find((x) => x.id === c.id)?.itemIds).toEqual([]);
  });
});

describe('profile', () => {
  it('cannot be edited before it is pulled from the server', () => {
    const { repos } = setup();
    expect(repos.profile.get()).toBeUndefined();
    expect(() => repos.profile.update({ city: 'Lisboa' })).toThrow('Profile not synced yet');
  });
});
