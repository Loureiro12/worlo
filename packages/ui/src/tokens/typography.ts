import type { TextStyle } from 'react-native';

/**
 * Bricolage Grotesque (titles) + Plus Jakarta Sans (UI). React Native picks the
 * weight by font file, so every style names its family explicitly.
 * Fonts are loaded by the app with `fontAssets` (see ./fonts.ts).
 */
export const fontFamily = {
  title500: 'BricolageGrotesque_500Medium',
  title700: 'BricolageGrotesque_700Bold',
  title800: 'BricolageGrotesque_800ExtraBold',
  ui400: 'PlusJakartaSans_400Regular',
  ui500: 'PlusJakartaSans_500Medium',
  ui600: 'PlusJakartaSans_600SemiBold',
  ui700: 'PlusJakartaSans_700Bold',
  ui800: 'PlusJakartaSans_800ExtraBold',
} as const;

export type UiWeight = 400 | 500 | 600 | 700 | 800;

export const uiFont: Record<UiWeight, string> = {
  400: fontFamily.ui400,
  500: fontFamily.ui500,
  600: fontFamily.ui600,
  700: fontFamily.ui700,
  800: fontFamily.ui800,
};

const em = (size: number, value: number) => size * value;

/** Type scale from README → Tipografia. Sizes/line heights in pt. */
export const textVariants = {
  display: {
    fontFamily: fontFamily.title800,
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: em(46, -0.02),
  },
  displayL: {
    fontFamily: fontFamily.title800,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: em(40, -0.02),
  },
  h1: {
    fontFamily: fontFamily.title700,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: em(30, -0.01),
  },
  h1Detail: { fontFamily: fontFamily.title700, fontSize: 28, lineHeight: 34 },
  h1Large: { fontFamily: fontFamily.title700, fontSize: 34, lineHeight: 40 },
  h2: { fontFamily: fontFamily.title700, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: fontFamily.title700, fontSize: 20, lineHeight: 26 },
  cardTitle: { fontFamily: fontFamily.title700, fontSize: 18, lineHeight: 24 },
  cardTitleS: { fontFamily: fontFamily.title700, fontSize: 17, lineHeight: 22 },
  statL: { fontFamily: fontFamily.title800, fontSize: 44, lineHeight: 48 },
  stat: { fontFamily: fontFamily.title800, fontSize: 32, lineHeight: 36 },
  statS: { fontFamily: fontFamily.title800, fontSize: 22, lineHeight: 28 },
  bodyL: { fontFamily: fontFamily.ui400, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fontFamily.ui400, fontSize: 15, lineHeight: 22 },
  bodyS: { fontFamily: fontFamily.ui500, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fontFamily.ui600, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.ui500, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fontFamily.ui700,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: em(12, 0.12),
    textTransform: 'uppercase',
  },
  micro: { fontFamily: fontFamily.ui600, fontSize: 11, lineHeight: 14 },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;

/** Variants set in Bricolage; `weight` overrides only apply to Jakarta ones. */
export const titleVariants: ReadonlySet<TextVariant> = new Set<TextVariant>([
  'display',
  'displayL',
  'h1',
  'h1Detail',
  'h1Large',
  'h2',
  'h3',
  'cardTitle',
  'cardTitleS',
  'statL',
  'stat',
  'statS',
]);
