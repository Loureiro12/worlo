import { countryById } from '@worlo/ui';
import { COUNTRIES } from '@/mocks/data.generated';
import type { CountryId } from '@/mocks/types';
import { useStore } from '@/store';

/** Name in pt-BR from the mock data, then the one learned from the globe, then English. */
export function countryName(id: CountryId, learned: Record<CountryId, string> = {}): string {
  return COUNTRIES[id]?.name ?? learned[id] ?? countryById(id)?.properties.name ?? id;
}

export function useCountryName() {
  const learned = useStore((s) => s.countryNames);
  return (id: CountryId) => countryName(id, learned);
}

/** 🇧🇷 from mock data (flags for other countries are not in the 110m dataset). */
export function countryFlag(id: CountryId): string {
  return COUNTRIES[id]?.flag ?? '🏳️';
}

export const WORLD_COUNTRIES = 195;
