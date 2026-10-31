import type { Slice } from '../types';

export type Booking = { dateIndex: number; people: number };

export type ShareFormat = 'story' | 'post' | 'square';
export type ShareTheme = 'dark' | 'coral' | 'sand';
export type ShareOptions = { format: ShareFormat; theme: ShareTheme; showHandle: boolean };

export type DiscoverySlice = {
  bookings: Record<string, Booking>;
  /** Places marked "Quero ir" from Explorar → Lugares para conhecer. */
  wishPlaces: Record<string, boolean>;
  /** Last format/theme/@ picked on Compartilhar (kept across visits, like the prototype). */
  shareOptions: ShareOptions;
  book: (tourId: string, booking: Booking) => void;
  toggleWishPlace: (name: string) => void;
  setShareOptions: (patch: Partial<ShareOptions>) => void;
};

export const createDiscoverySlice: Slice<DiscoverySlice> = (set) => ({
  bookings: {},
  wishPlaces: {},
  shareOptions: { format: 'story', theme: 'dark', showHandle: true },
  book: (tourId, booking) => set((s) => ({ bookings: { ...s.bookings, [tourId]: booking } })),
  toggleWishPlace: (name) =>
    set((s) => ({ wishPlaces: { ...s.wishPlaces, [name]: !s.wishPlaces[name] } })),
  setShareOptions: (patch) => set((s) => ({ shareOptions: { ...s.shareOptions, ...patch } })),
});
