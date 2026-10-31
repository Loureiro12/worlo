import type { Currency, Units } from '@/store/slices/settings';
import type { DemoState } from '@/store/slices/ui';

/** Currency symbols (06_COPY → Formatos). Codes and symbols are not translated. */
export const CURRENCIES: readonly { code: Currency; symbol: string }[] = [
  { code: 'BRL', symbol: 'R$' },
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: 'US$' },
];

export const UNITS: readonly Units[] = ['metric', 'imperial'];

/** Demo states of the prototype "Tweaks" panel (04_INTERACTIONS → Estados). */
export const DEMO_STATES: readonly DemoState[] = ['normal', 'empty', 'loading', 'offline', 'error'];

export const currencySymbol = (code: Currency) =>
  CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
