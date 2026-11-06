import type { IconName } from '@worlo/ui';

/**
 * Shortcuts for the "Adicionar atividade" form. They only pre-fill it: every
 * field stays editable and "Outro" takes anything (a relative's house, an
 * address, a place no catalog has).
 */
export type ActivityGroup = 'food' | 'rest' | 'lodging' | 'tour' | 'other';
export type ActivityKind =
  | 'breakfast'
  | 'afternoonCoffee'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'rest'
  | 'checkIn'
  | 'checkOut'
  | 'tour'
  | 'custom';

export const ACTIVITY_GROUPS: readonly {
  key: ActivityGroup;
  icon: IconName;
  kinds: readonly ActivityKind[];
}[] = [
  {
    key: 'food',
    icon: 'fork-knife',
    kinds: ['breakfast', 'afternoonCoffee', 'lunch', 'dinner', 'snack'],
  },
  { key: 'rest', icon: 'moon', kinds: ['rest'] },
  { key: 'lodging', icon: 'bed', kinds: ['checkIn', 'checkOut'] },
  { key: 'tour', icon: 'ticket', kinds: ['tour'] },
  { key: 'other', icon: 'map-pin', kinds: ['custom'] },
];

export const ACTIVITY_ICONS: Record<ActivityKind, IconName> = {
  breakfast: 'coffee',
  afternoonCoffee: 'coffee',
  lunch: 'fork-knife',
  dinner: 'fork-knife',
  snack: 'cookie',
  rest: 'moon',
  checkIn: 'sign-in',
  checkOut: 'sign-out',
  tour: 'ticket',
  custom: 'map-pin',
};

/** Usual time, pre-filled (editable). */
export const ACTIVITY_TIMES: Partial<Record<ActivityKind, string>> = {
  breakfast: '08:00',
  afternoonCoffee: '16:00',
  lunch: '12:30',
  dinner: '20:00',
  checkIn: '14:00',
  checkOut: '11:00',
};

/** Kinds whose name the person types (no sensible default title). */
export const NAMED_KINDS: readonly ActivityKind[] = ['tour', 'custom'];

export const groupOf = (kind: ActivityKind): ActivityGroup =>
  ACTIVITY_GROUPS.find((g) => g.kinds.includes(kind))?.key ?? 'other';

/** "HH:MM" (24 h) or empty. */
export function normalizeTime(input: string): string | null {
  const value = input.trim();
  if (!value) return '';
  const m = /^(\d{1,2})\s*(?:[:h.]\s*(\d{2})?)?$/i.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
