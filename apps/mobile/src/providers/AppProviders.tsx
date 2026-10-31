import { ToastProvider } from '@worlo/ui';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreferencesProvider } from './PreferencesProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <ToastProvider>{children}</ToastProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
