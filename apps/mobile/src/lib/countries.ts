import { countryById } from '@worlo/ui';
import { getCatalog } from '@/data/catalog';
import type { CountryId } from '@/mocks/types';
import { useStore } from '@/store';

/** Name in pt-BR from the catalog, then the one learned from the globe, then English. */
export function countryName(id: CountryId, learned: Record<CountryId, string> = {}): string {
  return getCatalog().COUNTRIES[id]?.name ?? learned[id] ?? countryById(id)?.properties.name ?? id;
}

export function useCountryName() {
  const learned = useStore((s) => s.countryNames);
  return (id: CountryId) => countryName(id, learned);
}

/** 🇧🇷 from the catalog (flags for other countries are not in the 110m dataset). */
export function countryFlag(id: CountryId): string {
  return getCatalog().COUNTRIES[id]?.flag ?? '🏳️';
}

export const WORLD_COUNTRIES = 195;
