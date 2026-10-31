import { DEFAULT_VISITED, FUTURES } from '@/mocks/data.generated';
import type { CountryId, Future } from '@/mocks/types';
import type { Slice } from '../types';

export type WorldSlice = {
  /** Visited countries → years visited. */
  visitedMap: Record<CountryId, string[]>;
  /** Wishlist destinations ("Quero ir"). */
  futures: Future[];
  /** Names learned from the globe for countries without mock data. */
  countryNames: Record<CountryId, string>;
  /** Countries tapped during onboarding. */
  onboardingVisited: CountryId[];
  /**
   * Country whose summary panel is open on the Mapa tab. Kept in the store so
   * other screens (e.g. Explorar → popular destination without a page) can
   * open the map focused on a country: `selectMapCountry(id)` + navigate.
   */
  mapSelection: CountryId | null;
  selectMapCountry: (id: CountryId | null) => void;
  rememberCountryName: (id: CountryId, name: string) => void;
  toggleVisited: (id: CountryId, year?: string) => void;
  toggleWishlist: (id: CountryId, name?: string, flag?: string) => void;
  toggleOnboardingCountry: (id: CountryId, name?: string) => void;
  addFuture: (future: Future) => void;
};

export const createWorldSlice: Slice<WorldSlice> = (set) => ({
  visitedMap: { ...DEFAULT_VISITED },
  futures: FUTURES.slice(),
  countryNames: {},
  onboardingVisited: [],
  mapSelection: null,
  selectMapCountry: (id) => set({ mapSelection: id }),
  rememberCountryName: (id, name) =>
    set((s) => ({ countryNames: { ...s.countryNames, [id]: name } })),
  toggleVisited: (id, year = String(new Date().getFullYear())) =>
    set((s) => {
      const visitedMap = { ...s.visitedMap };
      if (visitedMap[id]) delete visitedMap[id];
      else visitedMap[id] = [year];
      return { visitedMap };
    }),
  toggleWishlist: (id, name = '', flag = '') =>
    set((s) =>
      s.futures.some((f) => f.cid === id)
        ? { futures: s.futures.filter((f) => f.cid !== id) }
        : {
            futures: [
              ...s.futures,
              { id, cid: id, name, flag, note: '', saved: '', tint: '#FAD9CE' },
            ],
          },
    ),
  toggleOnboardingCountry: (id, name) =>
    set((s) => ({
      onboardingVisited: s.onboardingVisited.includes(id)
        ? s.onboardingVisited.filter((x) => x !== id)
        : [...s.onboardingVisited, id],
      countryNames: name ? { ...s.countryNames, [id]: name } : s.countryNames,
    })),
  addFuture: (future) => set((s) => ({ futures: [...s.futures, future] })),
});
