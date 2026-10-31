import { ROTS } from '@/mocks/data.generated';
import type { Itinerary, Stop } from '@/mocks/types';
import type { Slice } from '../types';

export type LiveLogType = 'checkin' | 'photo' | 'expense' | 'note' | 'done';

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

export type LiveState = {
  on: boolean;
  itineraryId: string;
  /** 1-based day of the itinerary (the tab bar pill reads `days[day - 1]`). */
  day: number;
  /** "dayIndex-stopIndex" (0-based) → done. */
  done: Record<string, boolean>;
  log: LiveLogEntry[];
  /** Spent during the trip, in the user's currency (R$). */
  spent: number;
};

export type PlanningSlice = {
  itineraries: Itinerary[];
  live: LiveState;
  addItinerary: (itinerary: Itinerary) => void;
  updateItinerary: (id: string, update: (it: Itinerary) => Itinerary) => void;
  addDay: (itineraryId: string, label: string) => void;
  addStop: (itineraryId: string, dayIndex: number, stop: Stop) => void;
  removeStop: (itineraryId: string, dayIndex: number, stopIndex: number) => void;
  /** Turns travel mode on. Switching to another itinerary starts it fresh. */
  startLive: (itineraryId: string) => void;
  endLive: () => void;
  setLiveDay: (day: number) => void;
  toggleStopDone: (key: string) => void;
  /**
   * Adds an entry on top of the log. `seed` fills an empty log first (the
   * prototype's sample entries stay below the user's first one).
   */
  addLiveLog: (entry: LiveLogEntry, spent?: number, seed?: LiveLogEntry[]) => void;
};

const mapDays = (
  s: { itineraries: Itinerary[] },
  id: string,
  fn: (days: Itinerary['days']) => Itinerary['days'],
) => ({
  itineraries: s.itineraries.map((it) => (it.id === id ? { ...it, days: fn(it.days) } : it)),
});

export const createPlanningSlice: Slice<PlanningSlice> = (set) => ({
  itineraries: ROTS.slice(),
  // Prototype demo: Cusco e Machu Picchu, day 2 (Vale Sagrado), day 1 all done.
  live: {
    on: false,
    itineraryId: 'peru',
    day: 2,
    done: { '0-0': true, '0-1': true, '0-2': true },
    log: [],
    spent: 0,
  },
  addItinerary: (itinerary) => set((s) => ({ itineraries: [itinerary, ...s.itineraries] })),
  updateItinerary: (id, update) =>
    set((s) => ({ itineraries: s.itineraries.map((it) => (it.id === id ? update(it) : it)) })),
  addDay: (itineraryId, label) =>
    set((s) => mapDays(s, itineraryId, (days) => [...days, { label, items: [] }])),
  addStop: (itineraryId, dayIndex, stop) =>
    set((s) =>
      mapDays(s, itineraryId, (days) =>
        days.map((d, i) => (i === dayIndex ? { ...d, items: [...d.items, stop] } : d)),
      ),
    ),
  removeStop: (itineraryId, dayIndex, stopIndex) =>
    set((s) =>
      mapDays(s, itineraryId, (days) =>
        days.map((d, i) =>
          i === dayIndex ? { ...d, items: d.items.filter((_, j) => j !== stopIndex) } : d,
        ),
      ),
    ),
  startLive: (itineraryId) =>
    set((s) => ({
      live:
        s.live.itineraryId === itineraryId
          ? { ...s.live, on: true }
          : { on: true, itineraryId, day: 1, done: {}, log: [], spent: 0 },
    })),
  endLive: () => set((s) => ({ live: { ...s.live, on: false } })),
  setLiveDay: (day) => set((s) => ({ live: { ...s.live, day } })),
  toggleStopDone: (key) =>
    set((s) => ({ live: { ...s.live, done: { ...s.live.done, [key]: !s.live.done[key] } } })),
  addLiveLog: (entry, spent = 0, seed = []) =>
    set((s) => ({
      live: {
        ...s.live,
        log: [entry, ...(s.live.log.length ? s.live.log : seed)],
        spent: s.live.spent + spent,
      },
    })),
});
