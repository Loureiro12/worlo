import { QueryClient } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import { createI18n, I18nextProvider, type Language } from '@worlo/i18n';
import { ToastProvider } from '@worlo/ui';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SyncProvider } from '@/features/sync/SyncProvider';
import { DEMO_USER } from '@/mocks/demo';
import { AuthProvider, type AuthState } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';

/** Default session in tests: the demo account (its data is seeded before each test). */
export const DEMO_SESSION: AuthState = {
  status: 'signedIn',
  user: { id: DEMO_USER.id, email: DEMO_USER.email },
};
export const SIGNED_OUT: AuthState = { status: 'signedOut', user: null };

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Fresh per render: no retries, nothing shared between tests. */
export function testQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  });
}

type ProviderOptions = { language?: Language; session?: AuthState };

/**
 * Renders a screen/component with real translations (pt-BR by default, like
 * the handoff copy), safe area, toasts and a session (the demo account by
 * default; its data is in SQLite). For screens that navigate, prefer
 * `renderRouter` from `expo-router/testing-library` with `wrapper: Providers`.
 */
export function renderWithProviders(ui: ReactElement, options: ProviderOptions = {}) {
  return render(<Providers {...options}>{ui}</Providers>);
}

export function Providers({
  children,
  language = 'pt-BR',
  session = DEMO_SESSION,
}: { children: ReactElement } & ProviderOptions) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nextProvider i18n={createI18n(language)}>
        <AuthProvider initial={session}>
          <SyncProvider>
            <QueryProvider client={testQueryClient()}>
              <ToastProvider>{children}</ToastProvider>
            </QueryProvider>
          </SyncProvider>
        </AuthProvider>
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
