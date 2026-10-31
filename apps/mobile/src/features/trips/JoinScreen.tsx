import type { EntityType } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import { FullScreenState, SkeletonScreen } from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { acceptInviteLink, OfflineError } from '@/data/collab';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { useSync } from '@/features/sync/SyncProvider';
import { routes } from '@/navigation/routes';
import { useAuth } from '@/providers/AuthProvider';

type JoinState =
  | { kind: 'joining' }
  | { kind: 'joined'; type: EntityType; id: string }
  | { kind: 'failed'; offline: boolean };

/**
 * `worlo://join/<token>` (Convidar › Copiar link): joins the trip / wish
 * online (`accept_invite_link`), asks for a sync and opens it once its row is
 * on the device. Signed out: back to the welcome screen.
 */
export function JoinScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { status } = useAuth();
  const sync = useSync();
  const [state, setState] = useState<JoinState>({ kind: 'joining' });
  const [attempt, setAttempt] = useState(0);
  const requestSync = useRef(sync.retry);
  requestSync.current = sync.retry;

  useEffect(() => {
    if (status === 'signedOut') router.replace(routes.welcome);
  }, [status, router]);

  // `attempt` re-runs it ("Tentar de novo").
  useEffect(() => {
    if (status !== 'signedIn' || !token) return;
    let cancelled = false;
    setState({ kind: 'joining' });
    acceptInviteLink(token)
      .then((joined) => {
        if (cancelled) return;
        setState({ kind: 'joined', ...joined });
        requestSync.current();
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ kind: 'failed', offline: error instanceof OfflineError });
      });
    return () => {
      cancelled = true;
    };
  }, [status, token, attempt]);

  const target = state.kind === 'joined' ? state : null;
  const arrived = useQuery(() => {
    if (!target) return false;
    return target.type === 'trip'
      ? Boolean(repos.trips.get(target.id))
      : repos.world.wishes().some((w) => w.id === target.id);
  }, [target?.type, target?.id]);

  useEffect(() => {
    if (!target || !arrived) return;
    router.replace(target.type === 'trip' ? routes.trip(target.id) : routes.future(target.id));
  }, [arrived, target, router]);

  // Joined on the server, but the pull failed: same as a server error.
  const syncFailed = target !== null && !arrived && sync.status.state === 'error';

  if (state.kind === 'failed' || syncFailed) {
    const offline = state.kind === 'failed' && state.offline;
    return (
      <FullScreenState
        kind={offline ? 'offline' : 'error'}
        title={offline ? t('common.states.offlineTitle') : t('trips.join.errorTitle')}
        text={offline ? t('common.states.offlineText') : t('trips.join.errorText')}
        retryLabel={t('common.actions.retry')}
        onRetry={() => (syncFailed ? sync.retry() : setAttempt((n) => n + 1))}
        secondary={{
          label: t('common.states.offlineSecondary'),
          onPress: () => router.replace(routes.trips),
        }}
      />
    );
  }
  return <SkeletonScreen label={t('trips.join.loading')} />;
}
