import type { Photo } from '@worlo/db';
import { tripPhotoCount } from '@/data/photos';
import { WORLD_COUNTRIES } from '@/lib/countries';
import { normalize } from '@/lib/format';

/** "% do mundo" = visited countries / 195, one decimal in the app language (3,1%). */
export function worldPercent(visited: number, language: string): string {
  const pct = (visited / WORLD_COUNTRIES) * 100;
  return `${pct.toLocaleString(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** Thousands separator of the app language ("1.284" in pt-BR). */
export function formatNumber(value: number, language: string): string {
  return value.toLocaleString(language);
}

type TripLike = { id: string; place: string; photos: number };

/** Different cities across my trips ("Lisboa" and "Lisboa, Portugal" are one). */
export function countCities(trips: readonly Pick<TripLike, 'place'>[]): number {
  const cities = trips.map((trip) => normalize(trip.place.split(',')[0] ?? '').trim());
  return new Set(cities.filter(Boolean)).size;
}

/** Photos of each trip (real ones, else its legacy number) + the ones without a trip. */
export function countPhotos(trips: readonly TripLike[], photos: readonly Photo[]): number {
  const inTrips = trips.reduce(
    (sum, trip) =>
      sum +
      tripPhotoCount(
        trip,
        photos.filter((p) => p.tripId === trip.id),
      ),
    0,
  );
  return inTrips + photos.filter((p) => !p.tripId).length;
}
