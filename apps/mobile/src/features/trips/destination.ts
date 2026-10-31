import { normalize } from '@/lib/format';
import { COUNTRIES } from '@/mocks/data.generated';
import type { CountryId } from '@/mocks/types';

/** "Florianópolis, Brasil" → { place: "Florianópolis", country: "Brasil" }. */
export function splitDestination(dest: string): { place: string; country: string } {
  const [place = '', country = ''] = dest.split(',').map((part) => part.trim());
  return { place, country };
}

/**
 * Finds a known country in a free-text destination (any comma part, accents and
 * case ignored): mock countries first, then names learned from the globe.
 */
export function matchCountry(
  dest: string,
  learned: Record<CountryId, string> = {},
): CountryId | undefined {
  const parts = dest.split(',').map(normalize).filter(Boolean);
  const names: [CountryId, string][] = [
    ...Object.entries(COUNTRIES).map(([id, c]) => [id, c.name] as [CountryId, string]),
    ...Object.entries(learned),
  ];
  return names.find(([, name]) => parts.includes(normalize(name)))?.[0];
}

/** First 4-digit year in "Julho de 2025". */
export function yearOf(when: string): string | undefined {
  return when.match(/\d{4}/)?.[0];
}

export type TripFormError = 'dest' | 'name';

/** 04 → Cadastro de viagem: destino, then nome. */
export function tripFormError(values: { dest: string; name: string }): TripFormError | null {
  if (!values.dest.trim()) return 'dest';
  if (!values.name.trim()) return 'name';
  return null;
}
