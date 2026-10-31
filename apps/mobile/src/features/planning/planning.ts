import type { TripRow } from '@worlo/db';
import type { IconName } from '@worlo/ui';
import { palette } from '@worlo/ui';
import { getCatalog } from '@/data/catalog';
import { formatMoney } from '@/lib/format';
import { demoKey } from '@/mocks/demo';
import type { CountryId, Itinerary, Stop } from '@/mocks/types';

/** Prototype exchange rate (04_INTERACTIONS → Câmbio no modo viagem): S/ 1 = R$ 1,52. */
export const EXCHANGE_RATE = 1.52;
export const LOCAL_CURRENCY = 'S/';

/** Mock content (pt-BR): places near the traveler, for the check-in sheet. */
export const NEARBY = [
  { name: 'Mercado de Pisac', cat: 'Mercado', dist: '120 m' },
  { name: 'Ruínas de Pisac', cat: 'Sítio inca', dist: '1,2 km' },
  { name: 'Café Ayllu', cat: 'Café', dist: '300 m' },
  { name: 'Ollantaytambo', cat: 'Cidade inca', dist: '48 km' },
] as const;

/** Where the traveler is on each day (prototype demo for Peru). */
const HERE: Record<string, string[]> = {
  peru: ['Cusco, Peru', 'Pisac, Vale Sagrado', 'Aguas Calientes'],
};

export function hereFor(it: Itinerary, dayIndex: number): string {
  return HERE[demoKey(it.id, 'itinerary')]?.[dayIndex] ?? it.place;
}

export const EXPENSE_CATEGORIES = [
  { key: 'food', icon: 'fork-knife' },
  { key: 'transport', icon: 'van' },
  { key: 'tours', icon: 'ticket' },
  { key: 'shopping', icon: 'shopping-bag' },
  { key: 'lodging', icon: 'bed' },
] as const satisfies readonly { key: string; icon: IconName }[];
export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORIES)[number]['key'];

/** Base photos already in the trip (Marina's 6 in Pisac). */
const BASE_PHOTOS = 6;
/** Places visited before today in the prototype demo. */
const BASE_PLACES = 3;

export function totalCost(days: Itinerary['days']): number {
  return days.reduce((sum, d) => sum + d.items.reduce((s, it) => s + (it.cost || 0), 0), 0);
}

type Days = Itinerary['days'];

/** Appends an empty day. */
export function withDay(days: Days, label: string): Days {
  return [...days, { label, items: [] }];
}

/** Appends a stop to day `dayIndex` (0-based). */
export function withStop(days: Days, dayIndex: number, stop: Stop): Days {
  return days.map((d, i) => (i === dayIndex ? { ...d, items: [...d.items, stop] } : d));
}

/** Removes stop `stopIndex` of day `dayIndex` (0-based). */
export function withoutStop(days: Days, dayIndex: number, stopIndex: number): Days {
  return days.map((d, i) =>
    i === dayIndex ? { ...d, items: d.items.filter((_, j) => j !== stopIndex) } : d,
  );
}

/** Deep copy of a recommendation's days (the copy is edited on its own). */
export function copyDays(days: Days): Days {
  return days.map((d) => ({ ...d, items: d.items.map((s) => ({ ...s })) }));
}

export function stopCount(days: Itinerary['days']): number {
  return days.reduce((sum, d) => sum + d.items.length, 0);
}

/** "R$ 18" or "R$ 18,24" (up to 2 decimals, like the prototype). */
export function formatMoneyFlex(value: number, currency = 'R$'): string {
  const rounded = Math.round(value * 100) / 100;
  return formatMoney(rounded, currency, Number.isInteger(rounded) ? 0 : 2);
}

export function nowHHMM(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Peru is 2h behind Brasília (prototype). */
export function localTime(date = new Date()): string {
  const shifted = new Date(date.getTime() - 2 * 3600 * 1000);
  return nowHHMM(shifted);
}

export function countryIdForFlag(flag: string): CountryId | undefined {
  const { COUNTRIES } = getCatalog();
  return Object.keys(COUNTRIES).find((id) => COUNTRIES[id]?.flag === flag);
}

export type EndSummary = { days: number; photos: number; places: number };

export function endSummary(
  it: Itinerary,
  log: { type: string; photo?: string }[],
  doneToday: number,
): EndSummary {
  return {
    days: it.days.length,
    photos: log.filter((l) => l.photo).length + BASE_PHOTOS,
    places: log.filter((l) => l.type === 'checkin').length + doneToday + BASE_PLACES,
  };
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export type PastTripInput = Pick<
  TripRow,
  | 'title'
  | 'place'
  | 'country'
  | 'countryIso'
  | 'flag'
  | 'period'
  | 'year'
  | 'days'
  | 'photos'
  | 'places'
  | 'companions'
  | 'people'
  | 'total'
  | 'tint'
>;

/** The past trip created when travel mode ends (mock content stays pt-BR). */
export function tripFromLive(
  it: Itinerary,
  summary: EndSummary,
  spent: number,
  date = new Date(),
): PastTripInput {
  const [place = it.place, country = ''] = it.place.split(',').map((p) => p.trim());
  const cid = countryIdForFlag(it.flag);
  const year = String(date.getFullYear());
  return {
    title: it.title,
    place,
    country: (cid && getCatalog().COUNTRIES[cid]?.name) || country,
    countryIso: cid && /^[0-9]{3}$/.test(cid) ? cid : null,
    flag: it.flag,
    period: `${MONTHS[date.getMonth()]} ${year}`,
    year,
    days: summary.days,
    photos: summary.photos,
    places: summary.places,
    people: '',
    companions: [{ name: 'Marina Costa', status: 'ok' }],
    total: formatMoney(Math.round(totalCost(it.days) + spent)),
    tint: palette.coral300,
  };
}
