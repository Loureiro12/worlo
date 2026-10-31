import { TRIP_DETAILS, TRIPS } from '@/mocks/data.generated';
import type { Trip } from '@/mocks/types';
import { matchCountry, splitDestination, tripFormError, yearOf } from './destination';
import { formatAmount, splitShare, summarizeMoney, tripCurrency } from './money';

const floripa = TRIPS.find((t) => t.id === 'floripa') as Trip;
const lisboa = TRIPS.find((t) => t.id === 'lisboa') as Trip;

describe('money', () => {
  it('summarizes the mock expenses with per-day value and shares', () => {
    const money = summarizeMoney(floripa, TRIP_DETAILS.floripa, []);
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
    const money = summarizeMoney(floripa, TRIP_DETAILS.floripa, [
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
    expect(summarizeMoney(lisboa, TRIP_DETAILS.lisboa, [])).toBeNull();
    expect(tripCurrency(lisboa, TRIP_DETAILS.lisboa)).toBe('€');
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
