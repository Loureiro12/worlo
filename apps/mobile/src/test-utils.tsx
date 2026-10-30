import { render } from '@testing-library/react-native';
import { createI18n, I18nextProvider, type Language } from '@worlo/i18n';
import { ThemeProvider } from '@worlo/ui';
import type { ReactElement } from 'react';

/** Renders with the real theme and translations (no native modules needed). */
export function renderWithProviders(ui: ReactElement, { language = 'en' as Language } = {}) {
  return render(
    <I18nextProvider i18n={createI18n(language)}>
      <ThemeProvider preference="light">{ui}</ThemeProvider>
    </I18nextProvider>,
  );
}
