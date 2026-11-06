import type { TripRow } from '@worlo/db';
import type { IconName } from '@worlo/ui';
import { palette } from '@worlo/ui';
import { getCatalog } from '@/data/catalog';
import { formatMoney } from '@/lib/format';
import type { CountryId, Itinerary, Stop, TimelineItem, TripDay } from '@/mocks/types';

export const EXPENSE_CATEGORIES = [
  { key: 'food', icon: 'fork-knife' },
  { key: 'transport', icon: 'van' },
  { key: 'tours', icon: 'ticket' },
  { key: 'shopping', icon: 'shopping-bag' },
  { key: 'lodging', icon: 'bed' },
] as const satisfies readonly { key: string; icon: IconName }[];
export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORIES)[number]['key'];

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

export function countryIdForFlag(flag: string): CountryId | undefined {
  const { COUNTRIES } = getCatalog();
  return Object.keys(COUNTRIES).find((id) => COUNTRIES[id]?.flag === flag);
}

export type EndSummary = { days: number; photos: number; places: number };

/** What the trip will count: only what was really recorded in travel mode. */
export function endSummary(
  it: Itinerary,
  log: { type: string; photo?: string }[],
  doneCount: number,
): EndSummary {
  return {
    days: it.days.length,
    photos: log.filter((l) => l.photo).length,
    places: log.filter((l) => l.type === 'checkin' || l.type === 'activity').length + doneCount,
  };
}

type RecordEntry = {
  type: string;
  text: string;
  detail?: string;
  photo?: string;
  time: string;
  day?: number;
};

const LOG_ICON: Record<string, IconName> = {
  photo: 'camera',
  expense: 'wallet',
  note: 'note-pencil',
  checkin: 'map-pin',
};

/**
 * "Dia a dia" of the trip created when travel mode ends: each itinerary day
 * with its stops (done or not) and what was recorded on it — photos with
 * their captions, notes, expenses. Activities added with "+" are already
 * stops; "done" entries only mark stops.
 */
export function tripDaysFromLive(
  it: Itinerary,
  log: readonly RecordEntry[],
  done: Record<string, boolean>,
  dayLabel: (n: number, label: string) => string,
  fallbackDay = 1,
): TripDay[] {
  return it.days
    .map((day, di) => {
      const stops: TimelineItem[] = day.items.map((stop, i) => ({
        time: stop.time,
        icon: stop.icon,
        title: stop.title,
        note: [stop.duration, stop.note].filter(Boolean).join(' · '),
        ...(done[`${di}-${i}`] ? { extra: '✓' } : {}),
      }));
      const recorded: TimelineItem[] = log
        .filter((entry) => (entry.day ?? fallbackDay) === di + 1 && entry.type in LOG_ICON)
        // The log is newest first; the day reads in order.
        .slice()
        .reverse()
        .map((entry) => ({
          time: entry.time,
          icon: LOG_ICON[entry.type] ?? 'note-pencil',
          title: entry.text,
          note: entry.detail ?? '',
          ...(entry.photo && !entry.photo.includes('://') ? { photos: [entry.photo] } : {}),
        }));
      return { label: dayLabel(di + 1, day.label), items: [...stops, ...recorded] };
    })
    .filter((day) => day.items.length > 0);
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
    companions: [],
    total: formatMoney(Math.round(totalCost(it.days) + spent)),
    tint: palette.coral300,
  };
}
