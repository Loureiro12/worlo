import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { type ColorScheme, createTheme, type Theme } from '../tokens/semantic';

export type ThemePreference = ColorScheme | 'system';

const themes: Record<ColorScheme, Theme> = {
  light: createTheme('light'),
  dark: createTheme('dark'),
};

type NamedStyles = Parameters<typeof StyleSheet.create>[0];

const ThemeContext = createContext<Theme>(themes.light);

export function ThemeProvider({
  preference = 'system',
  children,
}: {
  preference?: ThemePreference;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  return <ThemeContext.Provider value={themes[scheme]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Declares theme-aware styles once, outside the component:
 *
 *   const useStyles = makeStyles((t) => ({ root: { padding: t.space.lg } }));
 *   function Foo() { const styles = useStyles(); ... }
 *
 * Styles are computed once per theme and shared by every instance.
 */
export function makeStyles<S extends NamedStyles>(
  factory: (theme: Theme) => S & NamedStyles,
): () => Readonly<S> {
  const cache = new WeakMap<Theme, Readonly<S>>();
  return function useStyles() {
    const theme = useTheme();
    return useMemo(() => {
      let styles = cache.get(theme);
      if (!styles) {
        styles = StyleSheet.create(factory(theme));
        cache.set(theme, styles);
      }
      return styles;
    }, [theme]);
  };
}
