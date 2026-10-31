import { PASSEIOS } from '@/mocks/data.generated';
import type { SavedItem, Tour } from '@/mocks/types';

export type TourFilter = 'all' | Tour['cat'];

/** Chip order of E1 (Tudo/Barco/Gastronomia/Trilhas/Cultura) → i18n keys. */
export type TourFilterKey = 'all' | 'boat' | 'food' | 'trails' | 'culture';

export const TOUR_FILTERS: readonly { value: TourFilter; key: TourFilterKey }[] = [
  { value: 'all', key: 'all' },
  { value: 'Barco', key: 'boat' },
  { value: 'Gastronomia', key: 'food' },
  { value: 'Trilhas', key: 'trails' },
  { value: 'Cultura', key: 'culture' },
];

/** Index of the sold-out date in PDATES (prototype: always the 3rd day). */
export const SOLD_OUT_INDEX = 2;
/** Initial date/people when opening a tour (prototype: sáb 7 · 2 pessoas). */
export const DEFAULT_DATE_INDEX = 1;
export const DEFAULT_PEOPLE = 2;
export const MIN_PEOPLE = 1;
export const MAX_PEOPLE = 12;

export function findTour(id: string | undefined): Tour {
  return PASSEIOS.find((p) => p.id === id) ?? (PASSEIOS[0] as Tour);
}

export const savedIdOf = (tourId: string) => `pas-${tourId}`;

const FLAG_BY_PLACE: Record<string, string> = {
  Florianópolis: '🇧🇷',
  Cusco: '🇵🇪',
};

/** Shape stored in Lugares salvos (prototype → pasSave). */
export function tourSavedItem(tour: Tour): SavedItem {
  return {
    id: savedIdOf(tour.id),
    name: tour.name,
    cat: 'Passeios',
    city: tour.place,
    flag: FLAG_BY_PLACE[tour.place] ?? '🇵🇹',
    meta: `${tour.dur} · ${tour.cur} ${tour.price}`,
    rating: tour.rating,
  };
}
