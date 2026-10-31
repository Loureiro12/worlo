import type { Language } from '@worlo/i18n';
import { isLanguage } from '@worlo/i18n';
import Storage from 'expo-sqlite/kv-store';

/** User preferences, read synchronously at startup so the first frame is right. */

const KEYS = { language: 'pref.language', lastUserId: 'session.lastUserId' } as const;

export const preferences = {
  getLanguage(): Language | null {
    const value = Storage.getItemSync(KEYS.language);
    return isLanguage(value) ? value : null;
  },
  setLanguage(language: Language) {
    Storage.setItemSync(KEYS.language, language);
  },
  /** Account whose data is in the local database (a different one wipes it). */
  getLastUserId(): string | null {
    return Storage.getItemSync(KEYS.lastUserId);
  },
  setLastUserId(id: string | null) {
    if (id) Storage.setItemSync(KEYS.lastUserId, id);
    else Storage.removeItemSync(KEYS.lastUserId);
  },
};
