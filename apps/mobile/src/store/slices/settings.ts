import type { Slice } from '../types';

type SettingsActions = 'setSettings' | 'addRecentSearch' | 'clearRecentSearches';

/**
 * Device/UI settings. 2FA and connected devices are server/synced state (see
 * `@/data/twoFactor`, `@/data/devices`). Account preferences (currency, units, privacy,
 * notifications, photo organizing) live on the profile: see `@/data/profile`.
 */
export type SettingsSlice = {
  recentSearches: string[];
  setSettings: (patch: Partial<Omit<SettingsSlice, SettingsActions>>) => void;
  /** Keeps the 5 most recent, newest first, without duplicates. */
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
};

export const createSettingsSlice: Slice<SettingsSlice> = (set) => ({
  recentSearches: ['Lisboa', 'Kyoto', 'veleiro'],
  setSettings: (patch) => set(patch),
  addRecentSearch: (query) =>
    set((s) => {
      const q = query.trim();
      if (!q) return s;
      return {
        recentSearches: [
          q,
          ...s.recentSearches.filter((x) => x.toLowerCase() !== q.toLowerCase()),
        ].slice(0, 5),
      };
    }),
  clearRecentSearches: () => set({ recentSearches: [] }),
});
