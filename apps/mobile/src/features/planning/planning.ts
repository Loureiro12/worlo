import type { IconName } from '@worlo/ui';
import { palette } from '@worlo/ui';
import { formatMoney } from '@/lib/format';
import { COUNTRIES } from '@/mocks/data.generated';
import type { CountryId, Itinerary, Trip } from '@/mocks/types';

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
  return HERE[it.id]?.[dayIndex] ?? it.place;
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

/** The past trip created when travel mode ends (mock content stays pt-BR). */
export function tripFromLive(
  it: Itinerary,
  summary: EndSummary,
  spent: number,
  date = new Date(),
): Trip {
  const [place = it.place, country = ''] = it.place.split(',').map((p) => p.trim());
  const cid = countryIdForFlag(it.flag);
  const year = String(date.getFullYear());
  return {
    id: `${it.id}-trip`,
    title: it.title,
    place,
    country: (cid && COUNTRIES[cid]?.name) || country,
    flag: it.flag,
    period: `${MONTHS[date.getMonth()]} ${year}`,
    year,
    days: summary.days,
    photos: summary.photos,
    places: summary.places,
    people: '',
    collab: [{ name: 'Marina Costa', status: 'ok' }],
    total: formatMoney(Math.round(totalCost(it.days) + spent)),
    tint: palette.coral300,
  };
}
