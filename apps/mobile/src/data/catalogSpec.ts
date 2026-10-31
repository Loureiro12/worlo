import type {
  City,
  CityTab,
  CityTabKey,
  Country,
  CountryId,
  CountryPage,
  Experience,
  PlaceInfo,
  PlaceToKnow,
  Popular,
  Recommendation,
  Region,
  Suggestion,
  SuggestionKey,
  Tour,
} from '../mocks/types';

/**
 * Read-only reference content (Supabase `catalog` table, pulled into SQLite).
 * Each dataset is one `kind`; rows are one entity each (`id` = '<kind>:<key>'),
 * so content can be edited row by row without an app release.
 *
 * Kept free of app imports: the seed generator (scripts/generate-seed.ts) uses it too.
 */
export type Catalog = {
  COUNTRIES: Record<CountryId, Country>;
  CITIES: City[];
  PLACES: PlaceToKnow[];
  POPULAR: Popular[];
  EXPERIENCES: Experience[];
  COUNTRY_PAGES: Record<CountryId, CountryPage>;
  CITY_TABS: Record<CityTabKey, CityTab>;
  RECS: Recommendation[];
  SUG: Record<SuggestionKey, Suggestion[]>;
  PASSEIOS: Tour[];
  REGION: Region;
  PLACE_INFO: Record<string, PlaceInfo>;
  PDATES: [string, string][];
};

type Shape = 'record' | 'list' | 'single';

/** Dataset → storage shape. The kind stored in the table is the lowercase name. */
export const CATALOG_SPEC: Record<keyof Catalog, Shape> = {
  COUNTRIES: 'record',
  CITIES: 'list',
  PLACES: 'list',
  POPULAR: 'list',
  EXPERIENCES: 'list',
  COUNTRY_PAGES: 'record',
  CITY_TABS: 'record',
  RECS: 'list',
  SUG: 'record',
  PASSEIOS: 'list',
  REGION: 'single',
  PLACE_INFO: 'record',
  PDATES: 'list',
};

export type CatalogEntry = { id: string; kind: string; key: string; sort: number; data: unknown };

const kindOf = (name: keyof Catalog) => name.toLowerCase();

/** Datasets → rows (seed generator). */
export function catalogEntries(source: Catalog): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const name of Object.keys(CATALOG_SPEC) as (keyof Catalog)[]) {
    const kind = kindOf(name);
    const value = source[name] as unknown;
    const push = (key: string, sort: number, data: unknown) =>
      entries.push({ id: `${kind}:${key}`, kind, key, sort, data });

    switch (CATALOG_SPEC[name]) {
      case 'record':
        Object.entries(value as Record<string, unknown>).forEach(([key, data], i) => {
          push(key, i, data);
        });
        break;
      case 'list':
        (value as unknown[]).forEach((data, i) => {
          const id = (data as { id?: unknown }).id;
          push(typeof id === 'string' ? id : String(i), i, data);
        });
        break;
      case 'single':
        push('main', 0, value);
        break;
    }
  }
  return entries;
}

/** Rows (any order) → datasets. Missing kinds come back empty. */
export function buildCatalog(
  rows: readonly Pick<CatalogEntry, 'kind' | 'key' | 'sort' | 'data'>[],
): Catalog {
  const byKind = new Map<string, Pick<CatalogEntry, 'key' | 'sort' | 'data'>[]>();
  for (const row of rows) {
    const list = byKind.get(row.kind) ?? [];
    list.push(row);
    byKind.set(row.kind, list);
  }

  const out: Record<string, unknown> = {};
  for (const name of Object.keys(CATALOG_SPEC) as (keyof Catalog)[]) {
    const list = (byKind.get(kindOf(name)) ?? []).slice().sort((a, b) => a.sort - b.sort);
    switch (CATALOG_SPEC[name]) {
      case 'record':
        out[name] = Object.fromEntries(list.map((r) => [r.key, r.data]));
        break;
      case 'list':
        out[name] = list.map((r) => r.data);
        break;
      case 'single':
        out[name] = list[0]?.data ?? EMPTY_REGION;
        break;
    }
  }
  return out as Catalog;
}

const EMPTY_REGION: Region = { name: '', tagline: '', facts: [], cities: [], highlights: [] };
