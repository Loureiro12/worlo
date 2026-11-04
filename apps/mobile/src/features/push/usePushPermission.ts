import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { registerThisDevice, useRegisterOptions } from '@/data/devices';
import { type PushPermission, pushPermission } from '@/lib/push';

/**
 * Configurações › Notificações: whether this phone lets the app notify, read
 * again when coming back from the system settings. `enable` asks (first time)
 * or opens the system settings (after a "Don't allow").
 */
export function usePushPermission(): { status: PushPermission; enable: () => void } {
  const options = useRegisterOptions();
  const [state, setState] = useState<{ status: PushPermission; canAsk: boolean }>({
    status: 'unavailable',
    canAsk: false,
  });

  const refresh = useCallback(() => {
    void pushPermission().then(setState);
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const enable = useCallback(() => {
    if (!state.canAsk) {
      void Linking.openSettings();
      return;
    }
    void registerThisDevice({ ...options, ask: true })
      .catch(() => {})
      .finally(refresh);
  }, [state.canAsk, options, refresh]);

  return { status: state.status, enable };
}
