import type { Slice } from '../types';

export type ShareFormat = 'story' | 'post' | 'square';
export type ShareTheme = 'dark' | 'coral' | 'sand';
export type ShareOptions = { format: ShareFormat; theme: ShareTheme; showHandle: boolean };

/**
 * "Quero ir" places from Explorar are wish destinations in SQLite (`@/data/world`),
 * (tours are booked on the supplier's site, see PasseioScreen).
 */
export type DiscoverySlice = {
  /** Last format/theme/@ picked on Compartilhar (kept across visits, like the prototype). */
  shareOptions: ShareOptions;
  setShareOptions: (patch: Partial<ShareOptions>) => void;
};

export const createDiscoverySlice: Slice<DiscoverySlice> = (set) => ({
  shareOptions: { format: 'story', theme: 'dark', showHandle: true },
  setShareOptions: (patch) => set((s) => ({ shareOptions: { ...s.shareOptions, ...patch } })),
});
