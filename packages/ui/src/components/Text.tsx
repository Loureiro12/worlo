import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, palette } from '../tokens/colors';
import {
  type TextVariant,
  textVariants,
  titleVariants,
  type UiWeight,
  uiFont,
} from '../tokens/typography';

export const textTones = {
  default: colors.text,
  support: colors.textSupport,
  muted: colors.textMuted,
  link: colors.link,
  inverse: colors.textInverse,
  inverseMuted: colors.textInverseMuted,
  accentOnDark: colors.accentOnDark,
  success: colors.success,
  error: colors.error,
  info: colors.info,
  onPrimary: colors.onPrimary,
  subtle: palette.cinza600,
} as const;

export type TextTone = keyof typeof textTones;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Overrides the weight of Plus Jakarta variants (ignored for Bricolage titles). */
  weight?: UiWeight;
  align?: 'left' | 'center' | 'right';
  /** Overrides tone with a raw token color (e.g. inside a themed share card). */
  color?: string;
};

export function Text({
  variant = 'body',
  tone = 'default',
  weight,
  align,
  color,
  style,
  ...rest
}: TextProps) {
  const isTitle = titleVariants.has(variant);
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      accessibilityRole={isTitle && variant.startsWith('h') ? 'header' : undefined}
      style={[
        textVariants[variant],
        { color: color ?? textTones[tone] },
        weight && !isTitle ? { fontFamily: uiFont[weight] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
