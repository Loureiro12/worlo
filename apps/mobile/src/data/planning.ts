import type { ItineraryRow, LiveLog } from '@worlo/db';
import { withDay, withoutStop, withStop } from '@/features/planning/planning';
import type { Itinerary, ItineraryDay, Stop, SuggestionKey } from '@/mocks/types';
import { repos } from './repositories';
import { useQuery } from './useQuery';

export type LiveLogType = LiveLog['type'];

/**
 * One entry of "Registro do dia". `text` is already localized when the entry is
 * created (it reads like content: "fez check-in em Café Ayllu.").
 */
export type LiveLogEntry = {
  id: string;
  type: LiveLogType;
  text: string;
  /** Quote under the text (note, photo caption). */
  detail?: string;
  /** Photo URI shown under the text. */
  photo?: string;
  time: string;
  /** 'me' or the name of a travel companion. */
  author: 'me' | string;
};

/** Travel mode as the screens see it (the newest `live_sessions` row + its logs). */
export type LiveState = {
  on: boolean;
  itineraryId: string;
  /** 1-based day of the itinerary (the tab bar pill reads `days[day - 1]`). */
  day: number;
  /** "dayIndex-stopIndex" (0-based) → done. */
  done: Record<string, boolean>;
  /** Newest first. */
  log: LiveLogEntry[];
  /** Spent during the trip, in the user's currency (R$). */
  spent: number;
};

export function toItinerary(row: ItineraryRow): Itinerary {
  return {
    id: row.id,
    title: row.title,
    place: row.place,
    flag: row.flag,
    dates: row.dates,
    status: row.status,
    sugKey: row.suggestionKey as SuggestionKey,
    days: row.days as ItineraryDay[],
  };
}

const toEntry = (row: LiveLog): LiveLogEntry => ({
  id: row.id,
  type: row.type,
  text: row.text,
  detail: row.detail ?? undefined,
  photo: row.photo ?? undefined,
  time: row.time,
  author: row.author,
});

/** Newest first. For plain modules; components use `useItineraries`. */
export function getItineraries(): Itinerary[] {
  return repos.planning.itineraries().map(toItinerary);
}

export function getItinerary(id: string): Itinerary | undefined {
  const row = id ? repos.planning.get(id) : undefined;
  return row && !row.deletedAt ? toItinerary(row) : undefined;
}

export function useItineraries(): Itinerary[] {
  return useQuery(getItineraries, []);
}

export function useItinerary(id: string): Itinerary | undefined {
  return useQuery(() => getItinerary(id), [id]);
}

const OFF: LiveState = { on: false, itineraryId: '', day: 1, done: {}, log: [], spent: 0 };

export function getLive(): LiveState {
  const session = repos.planning.currentSession();
  if (!session) return OFF;
  return {
    on: session.active,
    itineraryId: session.itineraryId,
    day: session.day,
    done: session.done,
    log: repos.planning.logs(session.id).map(toEntry),
    spent: session.spent,
  };
}

export function useLive(): LiveState {
  return useQuery(getLive, []);
}

// ── Itinerary writes ─────────────────────────────────────────────────────────

export type NewItinerary = Omit<Itinerary, 'id'> & { sourceRecommendationId?: string | null };

/** Creates an itinerary and returns it (with its new id). */
export function createItinerary({ sugKey, ...input }: NewItinerary): Itinerary {
  return toItinerary(repos.planning.create({ ...input, suggestionKey: sugKey }));
}

/** Read → change → write. Ignores ids that no longer exist. */
export function updateItinerary(id: string, update: (it: Itinerary) => Itinerary) {
  const current = getItinerary(id);
  if (!current) return;
  const { id: _id, sugKey, ...next } = update(current);
  repos.planning.update(id, { ...next, suggestionKey: sugKey });
}

export function addDay(itineraryId: string, label: string) {
  updateItinerary(itineraryId, (it) => ({ ...it, days: withDay(it.days, label) }));
}

export function addStop(itineraryId: string, dayIndex: number, stop: Stop) {
  updateItinerary(itineraryId, (it) => ({ ...it, days: withStop(it.days, dayIndex, stop) }));
}

export function removeStop(itineraryId: string, dayIndex: number, stopIndex: number) {
  updateItinerary(itineraryId, (it) => ({
    ...it,
    days: withoutStop(it.days, dayIndex, stopIndex),
  }));
}

// ── Travel mode writes ───────────────────────────────────────────────────────

/** Turns travel mode on. Switching to another itinerary starts it fresh. */
export function startLive(itineraryId: string) {
  repos.planning.startLive(itineraryId);
}

export function endLive() {
  if (repos.planning.currentSession()) repos.planning.updateSession({ active: false });
}

export function setLiveDay(day: number) {
  repos.planning.updateSession({ day: Math.max(1, day) });
}

export function toggleStopDone(key: string) {
  const done = repos.planning.currentSession()?.done ?? {};
  repos.planning.updateSession({ done: { ...done, [key]: !done[key] } });
}

/** Adds an entry on top of the log; `spent` (R$) adds to what the trip cost. */
export function addLiveLog(entry: Omit<LiveLogEntry, 'id'>, spent = 0) {
  repos.planning.addLog({
    type: entry.type,
    text: entry.text,
    detail: entry.detail ?? null,
    photo: entry.photo ?? null,
    time: entry.time,
    author: entry.author,
    amount: spent,
  });
}
