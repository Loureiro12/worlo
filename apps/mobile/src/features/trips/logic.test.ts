import { repos } from '@/data/repositories';
import { type TripView, toTrip } from '@/data/trips';
import { savedLabel } from '@/data/world';
import { demoId } from '@/mocks/demo';
import { matchCountry, splitDestination, tripFormError, yearOf } from './destination';
import { formatAmount, splitShare, summarizeMoney, tripCurrency } from './money';

/** Demo trips as the screens get them (SQLite row → view, `details` json included). */
const demoTrip = (key: string) => {
  const row = repos.trips.get(demoId(`trip:${key}`));
  if (!row) throw new Error(`demo trip ${key} not seeded`);
  return toTrip(row);
};
let floripa: TripView;
let lisboa: TripView;
const details = (trip: TripView) => trip.details ?? undefined;

beforeEach(() => {
  floripa = demoTrip('floripa');
  lisboa = demoTrip('lisboa');
});

describe('money', () => {
  it('summarizes the mock expenses with per-day value and shares', () => {
    const money = summarizeMoney(floripa, details(floripa), []);
    expect(money).toMatchObject({ currency: 'R$', total: 4860, perDay: 810, days: 6 });
    expect(money?.cats.map((c) => [c.key, c.pct])).toEqual([
      ['lodging', 40],
      ['food', 27],
      ['tours', 14],
      ['transport', 12],
      ['shopping', 7],
    ]);
  });

  it('adds app expenses to their category and lists them first', () => {
    const money = summarizeMoney(floripa, details(floripa), [
      {
        icon: 'fork-knife',
        name: 'Pastel',
        meta: 'Comida · hoje',
        val: 'R$ 30',
        amount: 30,
        cat: 'Comida',
      },
    ]);
    expect(money?.total).toBe(4890);
    expect(money?.cats.find((c) => c.key === 'food')?.value).toBe(1350);
    expect(money?.items[0]?.name).toBe('Pastel');
  });

  it('returns null without expenses and uses the trip total currency', () => {
    expect(summarizeMoney(lisboa, details(lisboa), [])).toBeNull();
    expect(tripCurrency(lisboa, details(lisboa))).toBe('€');
    const money = summarizeMoney(lisboa, undefined, [
      { icon: 'car', name: 'Táxi', meta: '', val: '€ 20', amount: 20, cat: 'Transporte' },
    ]);
    expect(money).toMatchObject({ currency: '€', total: 20, perDay: 3 });
  });

  it('splits equally with the author', () => {
    expect(splitShare(210, 2)).toBe(70);
    expect(splitShare(100, 0)).toBe(100);
    expect(formatAmount(splitShare(100, 2), 'R$')).toBe('R$ 33,33');
    expect(formatAmount(4860, 'R$')).toBe('R$ 4.860');
  });
});

describe('destination', () => {
  it('splits place and country', () => {
    expect(splitDestination('Florianópolis, Brasil')).toEqual({
      place: 'Florianópolis',
      country: 'Brasil',
    });
    expect(splitDestination('Japão')).toEqual({ place: 'Japão', country: '' });
  });

  it('matches a known country without accents', () => {
    expect(matchCountry('Kyoto, japao')).toBe('392');
    expect(matchCountry('Brasil')).toBe('076');
    expect(matchCountry('Narnia')).toBeUndefined();
    expect(matchCountry('Hanoi, Vietnã', { '704': 'Vietnã' })).toBe('704');
  });

  it('validates destination then name and reads the year', () => {
    expect(tripFormError({ dest: ' ', name: '' })).toBe('dest');
    expect(tripFormError({ dest: 'Lisboa', name: '' })).toBe('name');
    expect(tripFormError({ dest: 'Lisboa', name: 'Férias' })).toBeNull();
    expect(yearOf('Julho de 2025')).toBe('2025');
    expect(yearOf('julho')).toBeUndefined();
  });
});

describe('wishlist saved label', () => {
  const now = Date.parse('2026-10-31T12:00:00Z');
  it('says "now" for the last day and the month (localized) before that', () => {
    expect(savedLabel({ createdAt: '2026-10-31T08:00:00Z' }, 'pt-BR', now)).toEqual({
      key: 'savedNow',
    });
    expect(savedLabel({ createdAt: '2025-08-01T00:00:00Z' }, 'pt-BR', now)).toEqual({
      key: 'savedOn',
      month: 'ago 2025',
    });
    expect(savedLabel({ createdAt: '2025-08-01T00:00:00Z' }, 'en', now)).toEqual({
      key: 'savedOn',
      month: 'Aug 2025',
    });
  });

  it('credits the inviter for destinations joined through an invite', () => {
    expect(savedLabel({ createdAt: '2026-10-31T08:00:00Z' }, 'pt-BR', now, 'Marina Costa')).toEqual(
      {
        key: 'invitedBy',
        name: 'Marina',
      },
    );
  });
});
