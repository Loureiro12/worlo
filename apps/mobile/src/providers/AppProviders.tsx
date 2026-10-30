import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SyncProvider } from '@/features/sync/SyncProvider';
import { DatabaseGate } from './DatabaseGate';
import { PreferencesProvider } from './PreferencesProvider';
import { RepositoriesProvider } from './RepositoriesProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <DatabaseGate>
          <SyncProvider>
            <RepositoriesProvider>{children}</RepositoriesProvider>
          </SyncProvider>
        </DatabaseGate>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
