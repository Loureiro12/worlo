import type { Slice } from '../types';

export type Booking = { dateIndex: number; people: number };

export type ShareFormat = 'story' | 'post' | 'square';
export type ShareTheme = 'dark' | 'coral' | 'sand';
export type ShareOptions = { format: ShareFormat; theme: ShareTheme; showHandle: boolean };

/** "Quero ir" places from Explorar are wish destinations in SQLite (`@/data/world`). */
export type DiscoverySlice = {
  bookings: Record<string, Booking>;
  /** Last format/theme/@ picked on Compartilhar (kept across visits, like the prototype). */
  shareOptions: ShareOptions;
  book: (tourId: string, booking: Booking) => void;
  setShareOptions: (patch: Partial<ShareOptions>) => void;
};

export const createDiscoverySlice: Slice<DiscoverySlice> = (set) => ({
  bookings: {},
  shareOptions: { format: 'story', theme: 'dark', showHandle: true },
  book: (tourId, booking) => set((s) => ({ bookings: { ...s.bookings, [tourId]: booking } })),
  setShareOptions: (patch) => set((s) => ({ shareOptions: { ...s.shareOptions, ...patch } })),
});
