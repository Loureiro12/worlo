import './augment';
import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import es from './locales/es';
import ptBR from './locales/pt-BR';

export { I18nextProvider, Trans, useTranslation } from 'react-i18next';
export type { TranslationSchema } from './types';

export const resources = {
  'pt-BR': { translation: ptBR },
  en: { translation: en },
  es: { translation: es },
} as const;

export type Language = keyof typeof resources;

export const supportedLanguages = Object.keys(resources) as Language[];
export const defaultLanguage: Language = 'pt-BR';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && value in resources;
}

/**
 * Picks the best supported language for an ordered list of BCP-47 tags (e.g. the
 * device locales). The user's order wins; within one tag an exact match beats
 * a same-base match (`pt-PT` → `pt-BR`).
 */
export function resolveLanguage(preferred: readonly (string | null | undefined)[]): Language {
  for (const tag of preferred) {
    if (!tag) continue;
    const exact = supportedLanguages.find((lang) => lang.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const base = tag.split('-')[0]?.toLowerCase();
    const sameBase = supportedLanguages.find((lang) => lang.split('-')[0] === base);
    if (sameBase) return sameBase;
  }
  return defaultLanguage;
}

/** Creates an isolated, synchronously initialised instance (no global state). */
export function createI18n(language: Language = defaultLanguage): i18n {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    resources,
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return instance;
}
