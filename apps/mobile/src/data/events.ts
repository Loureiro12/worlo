/**
 * "The local database changed": bumped after every committed write (repositories)
 * and after pulled rows are applied (sync). `useQuery` re-reads on each bump.
 */
let version = 0;
const listeners = new Set<() => void>();

export const dataEvents = {
  version: () => version,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit() {
    version += 1;
    for (const listener of listeners) listener();
  },
};
