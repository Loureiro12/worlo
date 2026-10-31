import type { TranslationSchema } from '@worlo/i18n';
import type { Href } from 'expo-router';
import { getCatalog } from '@/data/catalog';
import { matchesQuery, normalize } from '@/lib/format';
import { img } from '@/lib/images';
import { firstName } from '@/lib/people';
import { demoKey } from '@/mocks/demo';
import type { CountryId, Itinerary, PlaceToKnow, SavedItem, Trip } from '@/mocks/types';
import { routes } from '@/navigation/routes';

export type SearchCategory = 'dest' | 'place' | 'tour' | 'people' | 'rot';
export const SEARCH_CATEGORIES: readonly SearchCategory[] = [
  'dest',
  'place',
  'tour',
  'people',
  'rot',
];

/** Where a result leads: a route, or a "coming soon" toast for pages not built yet. */
/** `mapCountry` opens the map focused on a country that has no page. */
export type SearchTarget = { href: Href; mapCountry?: CountryId } | { soon: string };

export type SearchLead =
  | { kind: 'flag'; flag: string }
  | { kind: 'person'; name: string; expert?: boolean; initials?: string }
  | { kind: 'photo'; uri: string };

export type SearchItem = {
  key: string;
  cat: SearchCategory;
  title: string;
  sub: string;
  lead: SearchLead;
  target: SearchTarget;
};

/** Searches typed often in the prototype ("Em alta no Worlo"). Content, not UI copy. */
export const TRENDING = [
  'Japão',
  'Patagônia',
  'pastel de nata',
  'Machu Picchu',
  'trilha',
  'Marina',
];

/** Cities with a known country (prototype search index). */
const CITY_LIST: readonly [string, string][] = [
  ['Lisboa', 'Portugal'],
  ['Porto', 'Portugal'],
  ['Sintra', 'Portugal'],
  ['Cascais', 'Portugal'],
  ['Kyoto', 'Japão'],
  ['Tóquio', 'Japão'],
  ['Osaka', 'Japão'],
  ['Florianópolis', 'Brasil'],
  ['Cusco', 'Peru'],
  ['El Calafate', 'Argentina'],
  ['Paris', 'França'],
  ['Roma', 'Itália'],
  ['Jericoacoara', 'Brasil'],
  ['Seul', 'Coreia do Sul'],
];

/** Only Lisboa has a city page in the mock data. */
const CITY_PAGES = new Set(['Lisboa']);

export function countryIdByName(name: string): CountryId | undefined {
  return Object.entries(getCatalog().COUNTRIES).find(([, c]) => c.name === name)?.[0];
}

/** Country page when the mock has one, otherwise the map focused on it. */
export function countryTarget(id: CountryId): SearchTarget {
  return getCatalog().COUNTRY_PAGES[id]
    ? { href: routes.country(id) }
    : { href: routes.map, mapCountry: id };
}

/** City page, else its country page, else "chega em breve". */
export function cityTarget(city: string, country?: string): SearchTarget {
  if (CITY_PAGES.has(city)) return { href: routes.city(city) };
  const cid = country ? countryIdByName(country) : undefined;
  if (cid && getCatalog().COUNTRY_PAGES[cid]) return { href: routes.country(cid) };
  return { soon: city };
}

/** Explorar → "Lugares para conhecer" card target (go: 'city' | 'c392' | none). */
export function placeToKnowTarget(place: PlaceToKnow): SearchTarget {
  if (place.go === 'city') return { href: routes.city(place.short) };
  if (place.go?.startsWith('c')) return { href: routes.country(place.go.slice(1)) };
  const country = place.name.split(', ')[1];
  const cid = country ? countryIdByName(country) : undefined;
  if (cid && getCatalog().COUNTRY_PAGES[cid]) return { href: routes.country(cid) };
  return { soon: place.short };
}

export type SubKey = keyof TranslationSchema['explore']['search']['sub'];
/** Builds a localized result subtitle (`explore.search.sub.*`). */
export type SubLabel = (key: SubKey, vars?: Record<string, string | number>) => string;

/** A person to search: synced `people` rows or `search_people` results. */
export type SearchPerson = {
  id: string;
  name: string;
  username: string;
  city: string;
  expertRole: string | null;
};

type IndexInput = {
  sub: SubLabel;
  visitedMap: Record<CountryId, string[]>;
  itineraries: Itinerary[];
  trips: Trip[];
  saved: SavedItem[];
  people: SearchPerson[];
};

/** People result → traveler page (experts too). Key by name: stable testIDs for demo people. */
export function personItem(p: SearchPerson, label: SubLabel): SearchItem {
  const handle = p.username ? `@${p.username}` : '';
  return {
    key: `${p.expertRole ? 'expert' : 'person'}-${p.name}`,
    cat: 'people',
    title: p.name,
    sub: p.expertRole
      ? label('expert', { role: p.expertRole })
      : [handle, p.city].filter(Boolean).join(' · '),
    lead: p.expertRole
      ? { kind: 'person', name: p.name, expert: true }
      : { kind: 'person', name: p.name },
    target: { href: routes.traveler(p.id) },
  };
}

/** Everything searchable (03_FLOWS → F10). Mock content stays pt-BR. */
export function buildSearchIndex({
  sub: label,
  visitedMap,
  itineraries,
  trips,
  saved,
  people,
}: IndexInput): SearchItem[] {
  const { COUNTRIES, PLACES, REGION, CITY_TABS, PASSEIOS, RECS } = getCatalog();
  const items: SearchItem[] = [];
  const seen = new Set<string>();
  const push = (item: SearchItem) => {
    const id = `${item.cat}:${normalize(item.title)}`;
    if (seen.has(id)) return;
    seen.add(id);
    items.push(item);
  };

  for (const [id, c] of Object.entries(COUNTRIES)) {
    push({
      key: `country-${id}`,
      cat: 'dest',
      title: c.name,
      sub: visitedMap[id]
        ? label('countryVisited')
        : label('countryCapital', { capital: c.capital }),
      lead: { kind: 'flag', flag: c.flag },
      target: countryTarget(id),
    });
  }
  for (const [name, country] of CITY_LIST) {
    push({
      key: `city-${name}`,
      cat: 'dest',
      title: name,
      sub: label('city', { country }),
      lead: { kind: 'photo', uri: img(`city-${name}`, 120, 120) },
      target: cityTarget(name, country),
    });
  }
  push({
    key: 'region-lisboa',
    cat: 'dest',
    title: 'Lisboa e Vale do Tejo',
    sub: label('region', { country: 'Portugal' }),
    lead: { kind: 'photo', uri: img('region-lisboa', 120, 120) },
    target: { href: routes.region(REGION.name) },
  });
  for (const p of PLACES) {
    if (CITY_LIST.some(([name]) => normalize(name) === normalize(p.short))) continue;
    push({
      key: `ptk-${p.short}`,
      cat: 'dest',
      title: p.name,
      sub: label('destination', { meta: p.meta }),
      lead: { kind: 'photo', uri: img(`place-${p.short}`, 120, 120) },
      target: placeToKnowTarget(p),
    });
  }
  for (const tab of Object.values(CITY_TABS)) {
    for (const it of tab.items) {
      push({
        key: `ci-${it.name}`,
        cat: 'place',
        title: it.name,
        sub: it.rating
          ? label('placeRated', {
              category: tab.l,
              city: 'Lisboa',
              rating: it.rating,
            })
          : label('place', { category: tab.l, city: 'Lisboa' }),
        lead: { kind: 'photo', uri: img(`ci-${it.name}`, 120, 120) },
        target: { href: routes.place(it.name) },
      });
    }
  }
  for (const p of PASSEIOS) {
    push({
      key: `tour-${p.id}`,
      cat: 'tour',
      title: p.name,
      sub: label('tour', {
        place: p.place,
        duration: p.dur,
        price: `${p.cur} ${p.price}`,
      }),
      lead: { kind: 'photo', uri: img(`pas-${p.id}`, 120, 120) },
      target: { href: routes.passeio(p.id) },
    });
  }
  for (const s of saved) {
    push({
      key: `saved-${s.id}`,
      cat: s.cat === 'Passeios' ? 'tour' : 'place',
      title: s.name,
      sub: label('placeRated', { category: s.cat, city: s.city, rating: s.rating }),
      lead: { kind: 'photo', uri: img(`sv-${s.name}`, 120, 120) },
      target: { href: routes.place(s.name) },
    });
  }
  for (const p of people) push(personItem(p, label));
  for (const r of RECS) {
    push({
      key: `rec-${r.id}`,
      cat: 'rot',
      title: r.title,
      sub: label('rec', {
        days: r.days.length,
        author: firstName(r.author),
      }),
      lead: { kind: 'photo', uri: img(`rec-${r.id}`, 120, 120) },
      target: { href: routes.roteiro(r.id, 'rec') },
    });
  }
  for (const r of itineraries) {
    // Demo records keep their prototype key (stable testIDs / photo seeds).
    const rKey = demoKey(r.id, 'itinerary');
    push({
      key: `rot-${rKey}`,
      cat: 'rot',
      title: r.title,
      sub: label('mine', { place: r.place }),
      lead: { kind: 'photo', uri: img(`rot-${rKey}`, 120, 120) },
      target: { href: routes.roteiro(r.id, 'mine') },
    });
  }
  for (const trip of trips) {
    const tKey = demoKey(trip.id, 'trip');
    push({
      key: `trip-${tKey}`,
      cat: 'dest',
      title: trip.title,
      sub: label('trip', { place: trip.place, year: trip.year }),
      lead: { kind: 'photo', uri: img(`${tKey}-a`, 120, 120) },
      target: { href: routes.trip(trip.id) },
    });
  }
  return items;
}

/** All-words, accent-insensitive match on title + subtitle; title prefix ranks first. */
export function searchItems(index: SearchItem[], query: string): SearchItem[] {
  const q = normalize(query);
  if (!q) return [];
  return index
    .filter((it) => matchesQuery(`${it.title} ${it.sub}`, q))
    .map((it, order) => ({ it, order, score: normalize(it.title).startsWith(q) ? 0 : 1 }))
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .map(({ it }) => it);
}
