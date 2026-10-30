import { createI18n, I18nextProvider, type Language, resolveLanguage } from '@worlo/i18n';
import { type ThemePreference, ThemeProvider } from '@worlo/ui';
import { getLocales } from 'expo-localization';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { preferences } from '@/lib/preferences';

type PreferencesContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function initialLanguage(): Language {
  return (
    preferences.getLanguage() ?? resolveLanguage(getLocales().map((locale) => locale.languageTag))
  );
}

/** Language + theme, persisted on device and applied before the first render. */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(initialLanguage);
  const [theme, setThemeState] = useState(preferences.getTheme);
  const [i18n] = useState(() => createI18n(language));

  const value = useMemo<PreferencesContextValue>(
    () => ({
      language,
      theme,
      setLanguage(next) {
        preferences.setLanguage(next);
        setLanguageState(next);
        void i18n.changeLanguage(next);
      },
      setTheme(next) {
        preferences.setTheme(next);
        setThemeState(next);
      },
    }),
    [i18n, language, theme],
  );

  return (
    <PreferencesContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider preference={theme}>{children}</ThemeProvider>
      </I18nextProvider>
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return context;
}
