import { type DependencyList, useMemo, useSyncExternalStore } from 'react';
import { dataEvents } from './events';

/**
 * Reads from SQLite and re-renders whenever local data changes (a write here or
 * rows pulled by sync). Reads are synchronous, so the first render already has data.
 *
 *   const trips = useQuery(() => repos.trips.list(), []);
 */
export function useQuery<T>(read: () => T, deps: DependencyList): T {
  const version = useSyncExternalStore(dataEvents.subscribe, dataEvents.version);
  // `read` is described by `deps`; `version` re-runs it after every change.
  return useMemo(read, [version, ...deps]);
}
