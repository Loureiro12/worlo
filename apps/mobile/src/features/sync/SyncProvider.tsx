import NetInfo from '@react-native-community/netinfo';
import { createLocalStore, syncOrder } from '@worlo/db';
import { createSyncScheduler, SyncEngine, type SyncStatus } from '@worlo/sync';
import { createSupabaseRemoteStore } from '@worlo/sync/supabase';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AppState } from 'react-native';
import { useDeviceSession } from '@/data/devices';
import { dataEvents } from '@/data/events';
import { repos, setSyncRequester } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { db } from '@/lib/database';
import { flushErrorReports, recordError } from '@/lib/errorLog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const PERIODIC_SYNC_MS = 60_000;
const REALTIME_TABLES = ['messages', 'notifications', 'memberships', 'chat_members'] as const;

type SyncContextValue = {
  status: SyncStatus;
  /** Network reachable and signed in: changes are being pushed and pulled. */
  online: boolean;
  /**
   * The device has the data screens need (catalog + profile). False right after
   * the first sign-in on a device until the first pull lands.
   */
  ready: boolean;
  /** Try again now (e.g. "Tentar de novo" after the first pull failed). */
  retry: () => void;
};

const SyncContext = createContext<SyncContextValue | null>(null);

type PendingFlusher = (timeoutMs: number) => Promise<number>;
let pendingFlusher: PendingFlusher | null = null;
function setPendingFlusher(fn: PendingFlusher | null) {
  pendingFlusher = fn;
}

/**
 * Tries to push the outbox (up to `timeoutMs`) and resolves how many changes
 * are still only on this device. Used before signing out, which erases them.
 */
export async function flushPendingChanges(timeoutMs = 8000): Promise<number> {
  return pendingFlusher ? pendingFlusher(timeoutMs) : 0;
}

const notConfigured = {
  upsert: () => Promise.reject(new Error('Backend not configured')),
  pull: () => Promise.reject(new Error('Backend not configured')),
};

export function SyncProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(
    () =>
      new SyncEngine({
        local: createLocalStore(db, { onChange: () => dataEvents.emit() }),
        remote: supabase ? createSupabaseRemoteStore(supabase) : notConfigured,
        tables: syncOrder,
        // A rejected row never reaches the server: keep a trace for the team.
        onRejected: (table, error, count) =>
          recordError(new Error(`${count} row(s): ${error}`), `sync.rejected:${table}`),
      }),
  );
  // After every sync, drop what the user can no longer see (removed from a trip…).
  const [run] = useState(
    () => () =>
      engine.sync().finally(() => {
        repos.collab.prune();
        void flushErrorReports();
      }),
  );
  const [scheduler] = useState(() => createSyncScheduler({ sync: run }));
  const status = useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.getStatus(),
  );

  const { status: authStatus, user } = useAuth();
  const [isConnected, setConnected] = useState(false);
  const online = supabase !== null && isConnected && authStatus === 'signedIn';
  // Aparelhos conectados: register this phone, sign out if another device revoked it.
  useDeviceSession(user?.id ?? null, online);

  const ready = useQuery(
    () => repos.profile.get() !== undefined && repos.catalog.rows().length > 0,
    [],
  );

  // Sair da conta: give pending changes a last chance to reach the server.
  const onlineNow = useRef(online);
  onlineNow.current = online;
  useEffect(() => {
    setPendingFlusher(async (timeoutMs) => {
      if (onlineNow.current) {
        await Promise.race([
          run().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, timeoutMs)),
        ]);
      }
      await engine.refreshPending().catch(() => {});
      return engine.getStatus().pending;
    });
    return () => setPendingFlusher(null);
  }, [engine, run]);

  useEffect(() => {
    setSyncRequester(() => {
      void engine.refreshPending();
      scheduler.request();
    });
    return () => setSyncRequester(() => {});
  }, [engine, scheduler]);

  useEffect(
    () =>
      NetInfo.addEventListener((state) =>
        setConnected(Boolean(state.isConnected) && state.isInternetReachable !== false),
      ),
    [],
  );

  useEffect(() => {
    scheduler.setOnline(online);
    if (!online) return;
    const interval = setInterval(() => scheduler.request(), PERIODIC_SYNC_MS);
    return () => clearInterval(interval);
  }, [online, scheduler]);

  // Messages, notifications and invites arrive in real time: pull right away
  // instead of waiting for the periodic sync. Realtime applies the same RLS.
  useEffect(() => {
    const client = supabase;
    if (!online || !client) return;
    const channel = client.channel('worlo-sync');
    for (const table of REALTIME_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () =>
        scheduler.request(),
      );
    }
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [online, scheduler]);

  useEffect(() => {
    void engine.refreshPending();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase?.auth.startAutoRefresh();
        scheduler.request();
      } else {
        // Leaving the app: send what is waiting now, the system may close it later.
        if (state === 'background') scheduler.request();
        supabase?.auth.stopAutoRefresh();
      }
    });
    return () => {
      subscription.remove();
      scheduler.dispose();
    };
  }, [engine, scheduler]);

  const value = useMemo<SyncContextValue>(
    () => ({
      status,
      online,
      ready,
      retry: () => {
        if (online) void run().catch(() => {});
      },
    }),
    [run, status, online, ready],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside <SyncProvider>');
  return context;
}
