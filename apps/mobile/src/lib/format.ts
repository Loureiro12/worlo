/** pt-BR money: "R$ 4.860", "€ 1.940" (thousands with dot, decimals with comma). */
export function formatMoney(value: number, currency = 'R$', decimals = 0): string {
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currency} ${formatted}`;
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
