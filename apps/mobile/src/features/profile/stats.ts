import { WORLD_COUNTRIES } from '@/lib/countries';

/** "% do mundo" = visited countries / 195, one decimal in the app language (3,1%). */
export function worldPercent(visited: number, language: string): string {
  const pct = (visited / WORLD_COUNTRIES) * 100;
  return `${pct.toLocaleString(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** Thousands separator of the app language ("1.284" in pt-BR). */
export function formatNumber(value: number, language: string): string {
  return value.toLocaleString(language);
}
