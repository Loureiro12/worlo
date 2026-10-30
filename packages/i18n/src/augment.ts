import type { TranslationSchema } from './types';

// Typed `t()` keys and interpolation across the whole monorepo.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: TranslationSchema };
  }
}
