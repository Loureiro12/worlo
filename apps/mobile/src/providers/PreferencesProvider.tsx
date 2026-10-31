import { createI18n, I18nextProvider, type Language, resolveLanguage } from '@worlo/i18n';
import { getLocales } from 'expo-localization';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { preferences } from '@/lib/preferences';

type PreferencesContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function initialLanguage(): Language {
  return (
    preferences.getLanguage() ?? resolveLanguage(getLocales().map((locale) => locale.languageTag))
  );
}

/** Language, persisted on device and applied before the first render. */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(initialLanguage);
  const [i18n] = useState(() => createI18n(language));

  const value = useMemo<PreferencesContextValue>(
    () => ({
      language,
      setLanguage(next) {
        preferences.setLanguage(next);
        setLanguageState(next);
        void i18n.changeLanguage(next);
      },
    }),
    [i18n, language],
  );

  return (
    <PreferencesContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return context;
}
