import { StyleSheet } from 'react-native';
import { alpha, colors, palette } from '../tokens/colors';
import { iconSize, layout, motion, opacity, radius, shadow, size } from '../tokens/layout';
import { textVariants } from '../tokens/typography';

export const theme = {
  colors,
  palette,
  alpha,
  layout,
  radius,
  size,
  iconSize,
  shadow,
  motion,
  opacity,
  text: textVariants,
} as const;

export type Theme = typeof theme;

type NamedStyles = Parameters<typeof StyleSheet.create>[0];

/**
 * Declares token-based styles once, outside the component:
 *
 *   const useStyles = makeStyles((t) => ({ card: { borderRadius: t.radius.r16 } }));
 *
 * Kept as a hook so a future dark theme only needs a provider here.
 */
export function makeStyles<S extends NamedStyles>(
  factory: (t: Theme) => S & NamedStyles,
): () => Readonly<S> {
  let styles: Readonly<S> | null = null;
  return function useStyles() {
    styles ??= StyleSheet.create(factory(theme));
    return styles;
  };
}
