import type { Language } from '@worlo/i18n';
import { isLanguage } from '@worlo/i18n';
import type { ThemePreference } from '@worlo/ui';
import Storage from 'expo-sqlite/kv-store';

/** User preferences, read synchronously at startup so the first frame is right. */

const KEYS = { language: 'pref.language', theme: 'pref.theme' } as const;
const themes: readonly ThemePreference[] = ['system', 'light', 'dark'];

export const preferences = {
  getLanguage(): Language | null {
    const value = Storage.getItemSync(KEYS.language);
    return isLanguage(value) ? value : null;
  },
  setLanguage(language: Language) {
    Storage.setItemSync(KEYS.language, language);
  },
  getTheme(): ThemePreference {
    const value = Storage.getItemSync(KEYS.theme) as ThemePreference | null;
    return value && themes.includes(value) ? value : 'system';
  },
  setTheme(theme: ThemePreference) {
    Storage.setItemSync(KEYS.theme, theme);
  },
};
