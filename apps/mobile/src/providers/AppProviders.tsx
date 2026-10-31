import { ToastProvider } from '@worlo/ui';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhotoUploader } from '@/features/photos/PhotoUploader';
import { SyncProvider } from '@/features/sync/SyncProvider';
import { AuthProvider } from './AuthProvider';
import { DatabaseGate } from './DatabaseGate';
import { PreferencesProvider } from './PreferencesProvider';
import { QueryProvider } from './QueryProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <DatabaseGate>
          <AuthProvider>
            <SyncProvider>
              <PhotoUploader />
              <QueryProvider>
                <ToastProvider>{children}</ToastProvider>
              </QueryProvider>
            </SyncProvider>
          </AuthProvider>
        </DatabaseGate>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
