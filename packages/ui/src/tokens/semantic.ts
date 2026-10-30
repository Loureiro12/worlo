import type { TextStyle } from 'react-native';
import {
  borderWidth,
  duration,
  fontSize,
  fontWeight,
  palette,
  radius,
  size,
  space,
} from './primitives';

/** Semantic tokens: what a value is FOR. This is the API components consume. */

export type ColorScheme = 'light' | 'dark';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  secondary: string;
  secondaryPressed: string;
  onSecondary: string;
  danger: string;
  dangerPressed: string;
  onDanger: string;
  focus: string;
  /** Background/foreground pairs for badges, banners and inline status. */
  status: Record<StatusTone, { background: string; foreground: string }>;
};

const light: ThemeColors = {
  background: palette.neutral[50],
  surface: palette.neutral[0],
  surfaceSunken: palette.neutral[100],
  border: palette.neutral[200],
  borderStrong: palette.neutral[300],
  text: palette.neutral[900],
  textMuted: palette.neutral[600],
  textSubtle: palette.neutral[500],
  primary: palette.brand[600],
  primaryPressed: palette.brand[700],
  onPrimary: palette.neutral[0],
  secondary: palette.brand[50],
  secondaryPressed: palette.brand[100],
  onSecondary: palette.brand[800],
  danger: palette.red[700],
  dangerPressed: palette.red[800],
  onDanger: palette.neutral[0],
  focus: palette.brand[500],
  status: {
    neutral: { background: palette.neutral[100], foreground: palette.neutral[700] },
    info: { background: palette.blue[100], foreground: palette.blue[800] },
    success: { background: palette.green[100], foreground: palette.green[800] },
    warning: { background: palette.amber[100], foreground: palette.amber[800] },
    danger: { background: palette.red[100], foreground: palette.red[800] },
  },
};

const dark: ThemeColors = {
  background: palette.neutral[950],
  surface: palette.neutral[900],
  surfaceSunken: palette.neutral[800],
  border: palette.neutral[800],
  borderStrong: palette.neutral[700],
  text: palette.neutral[50],
  textMuted: palette.neutral[300],
  textSubtle: palette.neutral[400],
  primary: palette.brand[400],
  primaryPressed: palette.brand[300],
  onPrimary: palette.neutral[950],
  secondary: palette.brand[900],
  secondaryPressed: palette.brand[800],
  onSecondary: palette.brand[100],
  danger: palette.red[400],
  dangerPressed: palette.red[200],
  onDanger: palette.neutral[950],
  focus: palette.brand[300],
  status: {
    neutral: { background: palette.neutral[800], foreground: palette.neutral[200] },
    info: { background: palette.blue[900], foreground: palette.blue[200] },
    success: { background: palette.green[900], foreground: palette.green[200] },
    warning: { background: palette.amber[900], foreground: palette.amber[200] },
    danger: { background: palette.red[900], foreground: palette.red[200] },
  },
};

export const colors: Record<ColorScheme, ThemeColors> = { light, dark };

/** Typographic scale. Use `<Text variant>` instead of setting font sizes. */
export const textVariants = {
  display: { fontSize: fontSize['3xl'], lineHeight: 41, fontWeight: fontWeight.bold },
  title: { fontSize: fontSize['2xl'], lineHeight: 34, fontWeight: fontWeight.bold },
  heading: { fontSize: fontSize.lg, lineHeight: 24, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.md, lineHeight: 22, fontWeight: fontWeight.regular },
  bodyStrong: { fontSize: fontSize.md, lineHeight: 22, fontWeight: fontWeight.semibold },
  label: { fontSize: fontSize.sm, lineHeight: 18, fontWeight: fontWeight.medium },
  caption: { fontSize: fontSize.xs, lineHeight: 16, fontWeight: fontWeight.regular },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;

export function createTheme(scheme: ColorScheme) {
  return {
    scheme,
    colors: colors[scheme],
    space,
    radius,
    size,
    borderWidth,
    duration,
    text: textVariants,
  } as const;
}

export type Theme = ReturnType<typeof createTheme>;
export type SpaceToken = keyof typeof space;
