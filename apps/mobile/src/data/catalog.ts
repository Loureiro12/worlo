import { buildCatalog, type Catalog } from './catalogSpec';
import { dataEvents } from './events';
import { repos } from './repositories';
import { useQuery } from './useQuery';

export type { Catalog } from './catalogSpec';

let cache: { version: number; catalog: Catalog } | null = null;

/**
 * Reference content (countries, cities, tours…) pulled from Supabase into SQLite.
 * For code outside components (search index, helpers). Rebuilt only when data changed.
 */
export function getCatalog(): Catalog {
  const version = dataEvents.version();
  if (cache?.version !== version) cache = { version, catalog: buildCatalog(repos.catalog.rows()) };
  return cache.catalog;
}

/** Same as `getCatalog`, re-rendering when sync brings new content. */
export function useCatalog(): Catalog {
  return useQuery(getCatalog, []);
}
