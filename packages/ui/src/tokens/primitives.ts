/**
 * Primitive tokens: raw values with no meaning attached.
 * Components must NOT use these directly — go through the semantic theme
 * (`theme.colors.*`, `theme.space.*`), so light/dark and rebrands stay a
 * one-file change.
 */

export const palette = {
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  brand: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  green: {
    100: '#DCFCE7',
    200: '#BBF7D0',
    400: '#4ADE80',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  amber: {
    100: '#FEF3C7',
    200: '#FDE68A',
    400: '#FBBF24',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  red: {
    100: '#FEE2E2',
    200: '#FECACA',
    400: '#F87171',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  blue: { 100: '#DBEAFE', 200: '#BFDBFE', 400: '#60A5FA', 800: '#1E40AF', 900: '#1E3A8A' },
} as const;

/** 4pt grid. */
export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Control heights. `md` (44) is the minimum touch target on iOS. */
export const size = {
  controlSm: 36,
  controlMd: 44,
  controlLg: 52,
  checkbox: 22,
} as const;

export const duration = {
  fast: 120,
  normal: 200,
  slow: 320,
} as const;

export const borderWidth = {
  hairline: 1,
  thick: 2,
} as const;
