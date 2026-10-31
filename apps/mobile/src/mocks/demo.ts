import {
  COLLS,
  COUNTRIES,
  DEFAULT_VISITED,
  FUTURES,
  ROTS,
  SAVED,
  TRIP_DETAILS,
  TRIPS,
} from './data.generated';

/**
 * The demo account (Ana): the prototype's personal data as database rows.
 * Seeds the local Supabase and the hosted one (App Review / testers log in with
 * it), and fills the SQLite database in component tests.
 *
 * Rows are in the server shape (snake_case), like the sync engine sends them.
 */

export const DEMO_USER = {
  id: 'de300000-0000-4000-8000-000000000001',
  email: 'ana@worlo.app',
  password: 'worlo1234',
} as const;

/**
 * Stable uuid for a prototype record (`trip:floripa`): FNV-1a, 48 bits. Social
 * mocks (phase 2) still point at prototype ids; `demoKey` maps back.
 */
export function demoId(key: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const char of key) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  const hex = (hash & 0xffffffffffffn).toString(16).padStart(12, '0');
  return `de300000-0000-4000-8000-${hex}`;
}

/** Prototype id of a demo trip / itinerary (`floripa`), or the id itself. */
export function demoKey(id: string, kind: 'trip' | 'itinerary'): string {
  const keys = kind === 'trip' ? TRIPS.map((t) => t.id) : ROTS.map((r) => r.id);
  return keys.find((k) => demoId(`${kind}:${k}`) === id) ?? id;
}

const isoByName = (name: string) =>
  Object.entries(COUNTRIES).find(([, c]) => c.name === name)?.[0] ?? null;

const PT_MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** "Salvo em ago 2025" → 2025-08-01: the wishlist label is derived from created_at. */
function savedAt(label: string, fallback: string): string {
  const m = /(\w{3}) (\d{4})/.exec(label);
  const month = m ? PT_MONTHS.indexOf(m[1] as string) : -1;
  return month >= 0 && m ? new Date(Date.UTC(Number(m[2]), month, 1)).toISOString() : fallback;
}

type Row = Record<string, unknown> & { id: string };

export type DemoData = Record<
  | 'profiles'
  | 'visited_countries'
  | 'wish_destinations'
  | 'trips'
  | 'itineraries'
  | 'live_sessions'
  | 'saved_items'
  | 'collections',
  Row[]
>;

/** `base` orders rows (created_at) the way the prototype lists them. */
export function demoData(base = Date.UTC(2026, 0, 1)): DemoData {
  let tick = 0;
  /** Newer first in lists sorted by created_at desc: earlier items get later stamps. */
  const stamp = (offset: number) => new Date(base + offset * 60_000).toISOString();
  const common = (id: string, createdAt: string) => ({
    id,
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
  });

  const trips = TRIPS.map((t, i) => {
    const details = TRIP_DETAILS[t.id];
    return {
      ...common(demoId(`trip:${t.id}`), stamp(TRIPS.length - i)),
      title: t.title,
      place: t.place,
      country: t.country,
      country_iso: isoByName(t.country),
      flag: t.flag,
      period: t.period,
      year: t.year,
      days: t.days,
      photos: t.photos,
      places: t.places,
      companions: t.collab,
      people: t.people,
      total: t.total,
      tint: t.tint,
      details: details ?? null,
    };
  });

  const itineraries = ROTS.map((r, i) => ({
    ...common(demoId(`itinerary:${r.id}`), stamp(ROTS.length - i)),
    title: r.title,
    place: r.place,
    flag: r.flag,
    dates: r.dates,
    status: r.status,
    suggestion_key: r.sugKey,
    days: r.days,
    source_recommendation_id: null,
  }));

  return {
    profiles: [
      {
        ...common(DEMO_USER.id, stamp(0)),
        name: 'Ana Ribeiro',
        username: 'anaviaja',
        city: 'São Paulo',
        bio: 'Viajo devagar, como bem e volto sempre com uma lista maior do que fui.',
        avatar_url: null,
        currency: 'BRL',
        units: 'metric',
        privacy: 'friends',
        privacy_detail: { map: true, trips: true, photos: false, search: true },
        notification_prefs: { memories: true, community: true, itineraries: true, promos: false },
        auto_organize_photos: true,
        onboarded_at: stamp(0),
      },
    ],
    visited_countries: Object.entries(DEFAULT_VISITED).map(([iso, years]) => ({
      ...common(demoId(`visited:${iso}`), stamp(tick++)),
      country_iso: iso,
      years,
    })),
    wish_destinations: FUTURES.map((f, i) => ({
      ...common(demoId(`wish:${f.id}`), savedAt(f.saved, stamp(i))),
      country_iso: /^[0-9]{3}$/.test(f.cid) ? f.cid : null,
      name: f.name,
      flag: f.flag,
      note: f.note,
      companions: f.collab ?? [],
      tint: f.tint,
    })),
    trips,
    itineraries,
    // Prototype demo: Peru, day 2 (Vale Sagrado), day 1 all done, mode off.
    live_sessions: [
      {
        ...common(demoId('live:peru'), stamp(0)),
        itinerary_id: demoId('itinerary:peru'),
        active: false,
        day: 2,
        done: { '0-0': true, '0-1': true, '0-2': true },
        spent: 0,
        started_at: stamp(0),
      },
    ],
    saved_items: SAVED.map((s, i) => ({
      ...common(demoId(`saved:${s.id}`), stamp(SAVED.length - i)),
      ref_id: s.id,
      name: s.name,
      category: s.cat,
      city: s.city,
      flag: s.flag,
      meta: s.meta,
      rating: s.rating,
    })),
    collections: COLLS.map((c, i) => ({
      ...common(demoId(`collection:${c.id}`), stamp(i)),
      name: c.name,
      item_ids: c.ids,
    })),
  };
}
