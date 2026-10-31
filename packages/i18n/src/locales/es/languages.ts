import type { TranslationSchema } from '../../types';

// Language names are always written in their own language.
const languages: TranslationSchema['languages'] = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
  es: 'Español',
};

export default languages;
