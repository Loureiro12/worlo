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
  useState,
  useSyncExternalStore,
} from 'react';
import { AppState } from 'react-native';
import { db } from '@/lib/database';
import { supabase } from '@/lib/supabase';

const PERIODIC_SYNC_MS = 60_000;

type SyncContextValue = {
  status: SyncStatus;
  /** Network reachable, backend configured and session ready. */
  online: boolean;
  /** Call after local writes. */
  notifyLocalChange: () => void;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const offlineRemote = {
  upsert: () => Promise.reject(new Error('Backend not configured')),
  pull: () => Promise.reject(new Error('Backend not configured')),
};

export function SyncProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(
    () =>
      new SyncEngine({
        local: createLocalStore(db),
        remote: supabase ? createSupabaseRemoteStore(supabase) : offlineRemote,
        tables: syncOrder,
      }),
  );
  const [scheduler] = useState(() => createSyncScheduler({ sync: () => engine.sync() }));
  const status = useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.getStatus(),
  );

  const [isConnected, setConnected] = useState(false);
  /** `null` until the persisted session has been read from storage. */
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const online = supabase !== null && isConnected && hasSession === true;

  useEffect(
    () =>
      NetInfo.addEventListener((state) =>
        setConnected(Boolean(state.isConnected) && state.isInternetReachable !== false),
      ),
    [],
  );

  useEffect(() => {
    if (!supabase) return;
    // Fires INITIAL_SESSION once the stored session is loaded.
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setHasSession(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  // Anonymous account: data syncs without a sign-up wall. Link an email/OAuth
  // identity later with `supabase.auth.updateUser` / `linkIdentity`.
  useEffect(() => {
    if (supabase && isConnected && hasSession === false) void supabase.auth.signInAnonymously();
  }, [isConnected, hasSession]);

  useEffect(() => {
    scheduler.setOnline(online);
    if (!online) return;
    const interval = setInterval(() => scheduler.request(), PERIODIC_SYNC_MS);
    return () => clearInterval(interval);
  }, [online, scheduler]);

  useEffect(() => {
    void engine.refreshPending();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase?.auth.startAutoRefresh();
        scheduler.request();
      } else {
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
      notifyLocalChange() {
        void engine.refreshPending();
        scheduler.request();
      },
    }),
    [engine, scheduler, status, online],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside <SyncProvider>');
  return context;
}
