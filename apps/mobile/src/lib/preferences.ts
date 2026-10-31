import type { Language } from '@worlo/i18n';
import { isLanguage } from '@worlo/i18n';
import Storage from 'expo-sqlite/kv-store';

/** User preferences, read synchronously at startup so the first frame is right. */

const KEYS = { language: 'pref.language' } as const;

export const preferences = {
  getLanguage(): Language | null {
    const value = Storage.getItemSync(KEYS.language);
    return isLanguage(value) ? value : null;
  },
  setLanguage(language: Language) {
    Storage.setItemSync(KEYS.language, language);
  },
};
