import type { IconName } from '@worlo/ui';
import type { Slice } from '../types';

export type Privacy = 'private' | 'friends' | 'public';
export type Currency = 'BRL' | 'EUR' | 'USD';
export type Units = 'metric' | 'imperial';

/** Signed-in device (Senha e segurança → Aparelhos conectados). Mock content stays pt-BR. */
export type Device = { id: string; icon: IconName; name: string; meta: string; current?: boolean };

export const DEVICES: Device[] = [
  { id: 's1', icon: 'device-mobile', name: 'iPhone 15', meta: 'São Paulo · agora', current: true },
  { id: 's2', icon: 'laptop', name: 'MacBook Air', meta: 'São Paulo · há 2 dias' },
  { id: 's3', icon: 'device-tablet', name: 'iPad', meta: 'Lisboa · há 3 semanas' },
];

type SettingsActions = 'setSettings' | 'addRecentSearch' | 'clearRecentSearches' | 'signOutDevice';

export type SettingsSlice = {
  currency: Currency;
  units: Units;
  privacy: Privacy;
  privacyDetail: { map: boolean; trips: boolean; photos: boolean; search: boolean };
  notifications: { memories: boolean; community: boolean; itineraries: boolean; promos: boolean };
  twoFactor: boolean;
  /** Fotos → "Organizar por localização" (uses the photo GPS to find the trip). */
  autoOrganizePhotos: boolean;
  devices: Device[];
  recentSearches: string[];
  setSettings: (patch: Partial<Omit<SettingsSlice, SettingsActions>>) => void;
  /** Keeps the 5 most recent, newest first, without duplicates. */
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  /** Disconnects another device; the current one can't be removed. */
  signOutDevice: (id: string) => void;
};

export const createSettingsSlice: Slice<SettingsSlice> = (set) => ({
  currency: 'BRL',
  units: 'metric',
  privacy: 'friends',
  privacyDetail: { map: true, trips: true, photos: false, search: true },
  notifications: { memories: true, community: true, itineraries: true, promos: false },
  twoFactor: false,
  autoOrganizePhotos: true,
  devices: DEVICES.slice(),
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
  signOutDevice: (id) =>
    set((s) => ({ devices: s.devices.filter((d) => d.id !== id || d.current) })),
});
