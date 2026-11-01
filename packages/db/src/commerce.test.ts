import { describe, expect, it } from 'vitest';
import { createRepositories } from './repositories';
import { outbox } from './schema';
import { syncedTables } from './synced-tables';
import { createTestDatabase, generateId, sequentialClock } from './test-utils';
import { ValidationError } from './writer';

const ANA = '11111111-1111-4111-8111-111111111111';
const BIA = '22222222-2222-4222-8222-222222222222';
const SLOT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function setup() {
  const db = createTestDatabase();
  const changed: string[][] = [];
  const repos = createRepositories(db, {
    generateId,
    now: sequentialClock(),
    userId: () => ANA,
    onChange: (tables) => changed.push(tables),
  });
  const pulled = (table: keyof typeof syncedTables, row: Record<string, unknown>) => {
    const { table: target, toLocal } = syncedTables[table];
    const values = toLocal({
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      deleted_at: null,
      ...row,
    } as never);
    // biome-ignore lint/suspicious/noExplicitAny: test helper
    db.insert(target)
      .values(values as any)
      .run();
  };
  return { db, repos, pulled, changed };
}

const booking = (patch: Record<string, unknown> = {}) => ({
  id: 'b1',
  user_id: ANA,
  tour_id: 'tejo',
  slot_id: SLOT,
  date: '2026-11-07',
  people: 2,
  total: 90,
  currency: '€',
  status: 'confirmed',
  cancelled_at: null,
  reminded_at: null,
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-01T10:00:00.000Z',
  deleted_at: null,
  ...patch,
});

describe('tours', () => {
  it('lists the dates after today, soonest first', () => {
    const { repos, pulled } = setup();
    for (const [id, date] of [
      ['s3', '2026-11-09'],
      ['s1', '2026-11-05'],
      ['s2', '2026-11-07'],
    ] as const) {
      pulled('tour_slots', { id, tour_id: 'tejo', date, capacity: 12, booked: 0 });
    }
    pulled('tour_slots', { id: 's4', tour_id: 'nata', date: '2026-11-07', capacity: 8, booked: 0 });
    expect(repos.tours.slots('tejo', '2026-11-05').map((s) => s.date)).toEqual([
      '2026-11-07',
      '2026-11-09',
    ]);
  });
});

describe('bookings', () => {
  it('stores the RPC row without the outbox and holds the seats', () => {
    const { db, repos, pulled, changed } = setup();
    pulled('tour_slots', {
      id: SLOT,
      tour_id: 'tejo',
      date: '2026-11-07',
      capacity: 12,
      booked: 3,
    });
    repos.bookings.applyBooking(booking());
    expect(repos.bookings.forTour('tejo')).toMatchObject({
      people: 2,
      total: 90,
      status: 'confirmed',
    });
    expect(repos.tours.slot(SLOT)?.booked).toBe(5);
    expect(db.select().from(outbox).all()).toEqual([]);
    expect(changed.at(-1)).toEqual(['bookings', 'tour_slots']);

    // Retrying the same booking does not take more seats.
    repos.bookings.applyBooking(booking());
    expect(repos.tours.slot(SLOT)?.booked).toBe(5);

    repos.bookings.applyBooking(
      booking({ status: 'cancelled', cancelled_at: '2026-11-02T00:00:00Z' }),
    );
    expect(repos.bookings.forTour('tejo')).toBeUndefined();
    expect(repos.tours.slot(SLOT)?.booked).toBe(3);
  });

  it('only lists my confirmed bookings', () => {
    const { repos, pulled } = setup();
    pulled('bookings', booking());
    pulled('bookings', booking({ id: 'b2', tour_id: 'nata', status: 'cancelled' }));
    pulled('bookings', booking({ id: 'b3', tour_id: 'fado', user_id: BIA }));
    expect(repos.bookings.list().map((b) => b.id)).toEqual(['b1']);
  });
});

describe('businesses', () => {
  it('submits an Anuncie sign-up through the outbox, in review', () => {
    const { db, repos } = setup();
    const business = repos.businesses.submit({
      name: '  Rio Tejo Sailing ',
      type: 'guide',
      city: 'Lisboa',
      description: 'Veleiro ao pôr do sol',
      email: 'ola@tejo.pt',
    });
    expect(business).toMatchObject({ userId: ANA, name: 'Rio Tejo Sailing', status: 'review' });
    expect(repos.businesses.mine()).toHaveLength(1);
    expect(db.select().from(outbox).all()).toMatchObject([
      { tableName: 'businesses', recordId: business.id },
    ]);
  });

  it('validates name, city and e-mail', () => {
    const { repos } = setup();
    const base = { name: 'Tejo', type: 'guide' as const, city: 'Lisboa', email: 'ola@tejo.pt' };
    for (const [patch, code] of [
      [{ name: ' ' }, 'name'],
      [{ city: '' }, 'city'],
      [{ email: 'ola' }, 'email'],
    ] as const) {
      expect(() => repos.businesses.submit({ ...base, ...patch })).toThrow(
        new ValidationError(code),
      );
    }
  });
});
