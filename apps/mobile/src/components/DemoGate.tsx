import { useTranslation } from '@worlo/i18n';
import { FullScreenState, SkeletonScreen } from '@worlo/ui';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';

export type DemoGateProps = {
  children: ReactNode;
  /** Screen needs the network (Comunidade, Busca, Passeios…): blocked offline. */
  network?: boolean;
  /** Shows the server-error state (Explorar, Mapa, Viagens, Comunidade, Perfil, Busca). */
  error?: boolean;
  /** Shows the loading skeleton. */
  loading?: boolean;
  /** Carvão screens (Mapa) use the dark skeleton/state. */
  dark?: boolean;
  /** Shows a back button on the blocking states (stack screens). */
  onBack?: () => void;
};

/**
 * Applies the demo states of 04_INTERACTIONS (loading / offline / error) to a
 * screen. "empty" is handled by each screen with `useIsEmpty()`.
 */
export function DemoGate({
  children,
  network = false,
  error = false,
  loading = false,
  dark = false,
  onBack,
}: DemoGateProps) {
  const demo = useStore((s) => s.demo);
  const setDemo = useStore((s) => s.setDemo);
  const router = useRouter();
  const { t } = useTranslation();

  if (demo === 'loading' && loading) {
    return <SkeletonScreen onDark={dark} label={t('common.states.loading')} />;
  }
  if (demo === 'error' && error) {
    return (
      <FullScreenState
        kind="error"
        onDark={dark}
        title={t('common.states.errorTitle')}
        text={t('common.states.errorText')}
        retryLabel={t('common.actions.retry')}
        onRetry={() => setDemo('normal')}
        secondary={{
          label: t('common.states.errorSecondary'),
          onPress: () => router.push(routes.chat('support')),
        }}
        code={t('common.states.errorCode', { code: 'WRL-503' })}
        onBack={onBack}
        backLabel={t('common.actions.back')}
      />
    );
  }
  if (demo === 'offline' && network) {
    return (
      <FullScreenState
        kind="offline"
        onDark={dark}
        title={t('common.states.offlineTitle')}
        text={t('common.states.offlineText')}
        retryLabel={t('common.actions.retry')}
        onRetry={() => setDemo('normal')}
        secondary={{
          label: t('common.states.offlineSecondary'),
          onPress: () => router.navigate(routes.trips),
        }}
        onBack={onBack}
        backLabel={t('common.actions.back')}
      />
    );
  }
  return children;
}

/** First-use state: screens hide/replace content with their empty states. */
export function useIsEmpty(): boolean {
  return useStore((s) => s.demo === 'empty');
}
