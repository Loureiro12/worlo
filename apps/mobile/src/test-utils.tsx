import { act, render } from '@testing-library/react-native';
import { createI18n, I18nextProvider, type Language } from '@worlo/i18n';
import { ToastProvider } from '@worlo/ui';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Renders a screen/component with real translations (pt-BR by default, like
 * the handoff copy), safe area and toasts. For screens that navigate, prefer
 * `renderRouter` from `expo-router/testing-library`.
 */
export function renderWithProviders(ui: ReactElement, { language = 'pt-BR' as Language } = {}) {
  return render(<Providers language={language}>{ui}</Providers>);
}

export function Providers({
  children,
  language = 'pt-BR',
}: {
  children: ReactElement;
  language?: Language;
}) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nextProvider i18n={createI18n(language)}>
        <ToastProvider>{children}</ToastProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}

/**
 * Fake clock for tests with timers (splash, chat replies, toasts, uploads).
 * Keeps setImmediate/microtasks real: RNTL's async render and cleanup flush
 * through them, and faking them makes the *next* test hang. Call inside a
 * describe block.
 */
export function useFakeClock() {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask', 'nextTick'] });
  });
  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });
}

/** Moves the fake clock forward inside act (state updates flushed). */
export function elapse(ms: number) {
  return act(async () => {
    jest.advanceTimersByTime(ms);
  });
}
