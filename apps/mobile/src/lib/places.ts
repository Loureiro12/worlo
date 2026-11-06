import { normalize } from './format';

/**
 * Cities and countries for destination search and local time, from GeoNames
 * (CC BY 4.0, scripts/build-places.mjs). Offline: the list ships with the app
 * and is read on first use.
 */

type CountryRow = [numeric: string, alpha2: string, name: string, pt: string, es: string];
type CityRow = [
  name: string,
  pt: string,
  es: string,
  alternates: string,
  country: string,
  lat: number,
  lon: number,
  tz: number,
  population: number,
];
type Data = { tz: string[]; countries: CountryRow[]; cities: CityRow[] };

let data: Data | null = null;
let cityIndex: string[] | null = null;
let countryIndex: Map<string, CountryRow> | null = null;

function load(): Data {
  if (!data) data = require('@/data/places.generated.json') as Data;
  return data;
}

function countries(): Map<string, CountryRow> {
  if (!countryIndex) countryIndex = new Map(load().countries.map((row) => [row[0], row]));
  return countryIndex;
}

/** Every name of a city, normalized, '|' around each one: "|lisbon|lisboa|lisabon|". */
function cities(): string[] {
  if (!cityIndex) {
    cityIndex = load().cities.map(
      (c) => `|${[c[0], c[1], c[2], ...c[3].split('|')].filter(Boolean).map(normalize).join('|')}|`,
    );
  }
  return cityIndex;
}

export type PlaceLanguage = 'pt-BR' | 'en' | 'es' | string;

const pick = (lang: PlaceLanguage, en: string, pt: string, es: string) =>
  (lang.startsWith('pt') ? pt : lang.startsWith('es') ? es : '') || en;

/** 🇵🇹 from "PT". */
export function flagOf(alpha2: string): string {
  return /^[A-Z]{2}$/.test(alpha2)
    ? String.fromCodePoint(...[...alpha2].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
    : '📍';
}

export type CountryInfo = { id: string; name: string; flag: string };

/** A country by ISO numeric id ("620"), named in the app language. */
export function countryInfo(id: string, lang: PlaceLanguage): CountryInfo | undefined {
  const row = countries().get(id);
  return row ? { id, name: pick(lang, row[2], row[3], row[4]), flag: flagOf(row[1]) } : undefined;
}

export type Place = {
  kind: 'city' | 'country';
  /** City or country name in the app language. */
  name: string;
  countryId: string;
  countryName: string;
  flag: string;
  /** "Lisboa, Portugal" or "Portugal": what the destination field shows. */
  label: string;
  lat?: number;
  lon?: number;
  timeZone?: string;
};

function cityPlace(row: CityRow, lang: PlaceLanguage): Place {
  const country = countryInfo(row[4], lang);
  const name = pick(lang, row[0], row[1], row[2]);
  return {
    kind: 'city',
    name,
    countryId: row[4],
    countryName: country?.name ?? '',
    flag: country?.flag ?? '📍',
    label: country ? `${name}, ${country.name}` : name,
    lat: row[5],
    lon: row[6],
    timeZone: load().tz[row[7]],
  };
}

/**
 * Countries whose name starts with the query, then cities (biggest first) with
 * any name — in any of the app languages — starting with it, or with a word of
 * it ("york" finds New York).
 */
export function searchPlaces(query: string, lang: PlaceLanguage, limit = 8): Place[] {
  const q = normalize(query.split(',')[0] ?? '').trim();
  if (q.length < 2) return [];
  const out: Place[] = [];
  for (const row of load().countries) {
    const names = [row[2], row[3], row[4]].filter(Boolean).map(normalize);
    if (names.some((n) => n.startsWith(q))) {
      const info = countryInfo(row[0], lang);
      if (info) {
        out.push({
          kind: 'country',
          name: info.name,
          countryId: info.id,
          countryName: info.name,
          flag: info.flag,
          label: info.name,
        });
      }
    }
    if (out.length >= 2) break;
  }
  const index = cities();
  const rows = load().cities;
  for (let i = 0; i < index.length && out.length < limit; i++) {
    const names = index[i] ?? '';
    if (names.includes(`|${q}`) || names.includes(` ${q}`)) {
      const row = rows[i];
      if (row) out.push(cityPlace(row, lang));
    }
  }
  return out;
}

/** The city a destination text names ("Cusco, Peru" → Cusco), for its time and weather. */
export function findCity(text: string, lang: PlaceLanguage = 'pt-BR'): Place | undefined {
  const [city = '', country = ''] = text.split(',').map((part) => normalize(part).trim());
  if (!city) return undefined;
  const rows = load().cities;
  const index = cities();
  for (let i = 0; i < index.length; i++) {
    const row = rows[i];
    if (!row || !(index[i] ?? '').includes(`|${city}|`)) continue;
    if (country) {
      const info = countries().get(row[4]);
      const names = info ? [info[2], info[3], info[4]].map(normalize) : [];
      if (!names.includes(country)) continue;
    }
    return cityPlace(row, lang);
  }
  return undefined;
}

/** "14:05" in a time zone (the destination's local time). */
export function timeIn(timeZone: string, date = new Date(), lang: PlaceLanguage = 'pt-BR'): string {
  try {
    return new Intl.DateTimeFormat(lang, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    return '';
  }
}
