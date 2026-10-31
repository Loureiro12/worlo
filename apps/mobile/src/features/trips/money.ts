import type { IconName } from '@worlo/ui';
import { palette } from '@worlo/ui';
import type { Trip, TripDetails } from '@/mocks/types';
import type { TripExpense } from '@/store/slices/trips';

/**
 * Expense categories (02_SCREENS → C1 Gastos). The mock data names categories in
 * pt-BR ("Comida"); that name stays the id so app expenses merge with mock ones.
 */
export const EXPENSE_CATEGORIES = [
  { key: 'lodging', name: 'Hospedagem', icon: 'bed', color: palette.carvao },
  { key: 'food', name: 'Comida', icon: 'fork-knife', color: palette.coral },
  { key: 'tours', name: 'Passeios', icon: 'ticket', color: palette.coral300 },
  { key: 'transport', name: 'Transporte', icon: 'car', color: palette.cinza600 },
  { key: 'shopping', name: 'Compras', icon: 'shopping-bag', color: palette.linha },
] as const satisfies readonly { key: string; name: string; icon: IconName; color: string }[];

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseCategoryKey = ExpenseCategory['key'];

export function categoryByName(name: string): ExpenseCategory | undefined {
  return EXPENSE_CATEGORIES.find((c) => c.name === name);
}

/** "R$ 4.860", "R$ 23,33" — pt-BR separators, up to 2 decimals. */
export function formatAmount(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;
}

/** Trip currency: the mock expenses one, else the prefix of the trip total ("€ 1.940"). */
export function tripCurrency(trip: Trip, details?: TripDetails): string {
  if (details?.money) return details.money.cur;
  const prefix = trip.total && trip.total !== '—' ? trip.total.split(' ')[0] : '';
  return prefix || 'R$';
}

/** Each person's share when the author splits with `others` people (04 → Gastos). */
export function splitShare(amount: number, others: number): number {
  return others > 0 ? amount / (others + 1) : amount;
}

export type MoneyCategoryRow = {
  name: string;
  key?: ExpenseCategoryKey;
  value: number;
  color: string;
  /** Rounded share, e.g. 40 (%). */
  pct: number;
  /** Exact share 0..1 for the stacked bar. */
  share: number;
};

export type MoneyItemRow = {
  icon: IconName;
  name: string;
  meta: string;
  val: string;
  receipt?: boolean;
};

export type MoneySummary = {
  currency: string;
  total: number;
  perDay: number;
  days: number;
  cats: MoneyCategoryRow[];
  items: MoneyItemRow[];
};

/**
 * Gastos tab: mock expenses + expenses added in the app, totals recalculated.
 * Returns null when the trip has no expenses at all (empty state).
 */
export function summarizeMoney(
  trip: Trip,
  details: TripDetails | undefined,
  added: readonly TripExpense[],
): MoneySummary | null {
  const base = details?.money;
  if (!base && added.length === 0) return null;
  const currency = tripCurrency(trip, details);
  const cats: { name: string; value: number; color: string }[] = (base?.cats ?? []).map((c) => ({
    name: c.name,
    value: c.val,
    color: categoryByName(c.name)?.color ?? c.color,
  }));
  for (const expense of added) {
    const name = expense.cat ?? EXPENSE_CATEGORIES[1].name;
    let cat = cats.find((c) => c.name === name);
    if (!cat) {
      cat = { name, value: 0, color: categoryByName(name)?.color ?? palette.linha };
      cats.push(cat);
    }
    cat.value += expense.amount ?? 0;
  }
  const total = cats.reduce((sum, c) => sum + c.value, 0);
  const days = Math.max(1, trip.days);
  return {
    currency,
    total,
    days,
    perDay: Math.round(total / days),
    cats: cats.map((c) => ({
      ...c,
      key: categoryByName(c.name)?.key,
      share: total > 0 ? c.value / total : 0,
      pct: total > 0 ? Math.round((c.value / total) * 100) : 0,
    })),
    items: [
      ...added.map(({ icon, name, meta, val, receipt }) => ({ icon, name, meta, val, receipt })),
      ...(base?.items ?? []),
    ],
  };
}
