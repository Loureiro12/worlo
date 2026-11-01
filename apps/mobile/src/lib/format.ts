/** pt-BR money: "R$ 4.860", "€ 1.940" (thousands with dot, decimals with comma). */
export function formatMoney(value: number, currency = 'R$', decimals = 0): string {
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currency} ${formatted}`;
}

/** A YYYY-MM-DD date as chip parts in the app language: "sáb", "7", "nov" (no trailing dots). */
export function dateParts(date: string, language: string) {
  const day = new Date(`${date}T00:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).format(day).replace('.', '');
  return {
    weekday: part({ weekday: 'short' }),
    day: String(day.getUTCDate()),
    month: part({ month: 'short' }),
  };
}

/** Removes accents and lowercases, for search matching (03_FLOWS → F10). */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Every word of the query must appear in the text, accent-insensitive. */
export function matchesQuery(text: string, query: string): boolean {
  const haystack = normalize(text);
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
