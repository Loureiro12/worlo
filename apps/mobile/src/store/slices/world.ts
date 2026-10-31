import type { CountryId } from '@/mocks/types';
import type { Slice } from '../types';

/**
 * Map UI state. Visited countries and the wishlist live in SQLite
 * (`@/data/world`); this keeps only what is not personal data.
 */
export type WorldSlice = {
  /** Names learned from the globe for countries without catalog data. */
  countryNames: Record<CountryId, string>;
  /** Countries tapped during onboarding (saved when the first trip is). */
  onboardingVisited: CountryId[];
  /**
   * Country whose summary panel is open on the Mapa tab. Kept in the store so
   * other screens (e.g. Explorar → popular destination without a page) can
   * open the map focused on a country: `selectMapCountry(id)` + navigate.
   */
  mapSelection: CountryId | null;
  selectMapCountry: (id: CountryId | null) => void;
  rememberCountryName: (id: CountryId, name: string) => void;
  toggleOnboardingCountry: (id: CountryId, name?: string) => void;
};

export const createWorldSlice: Slice<WorldSlice> = (set) => ({
  countryNames: {},
  onboardingVisited: [],
  mapSelection: null,
  selectMapCountry: (id) => set({ mapSelection: id }),
  rememberCountryName: (id, name) =>
    set((s) => ({ countryNames: { ...s.countryNames, [id]: name } })),
  toggleOnboardingCountry: (id, name) =>
    set((s) => ({
      onboardingVisited: s.onboardingVisited.includes(id)
        ? s.onboardingVisited.filter((x) => x !== id)
        : [...s.onboardingVisited, id],
      countryNames: name ? { ...s.countryNames, [id]: name } : s.countryNames,
    })),
});
