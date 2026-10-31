import NetInfo from '@react-native-community/netinfo';
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Online-only data (community feed, traveler pages, people search) goes through
 * React Query: cached in memory, refetched on reconnect/foreground, paused offline.
 * Synced data never does: it is read from SQLite (`useQuery` in `@/data`).
 */
export function QueryProvider({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [queryClient] = useState(
    () =>
      client ??
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, gcTime: 30 * 60_000, retry: 2 } },
      }),
  );

  useEffect(() => {
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) =>
        setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false),
      ),
    );
    const subscription = AppState.addEventListener('change', (status) =>
      focusManager.setFocused(status === 'active'),
    );
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
