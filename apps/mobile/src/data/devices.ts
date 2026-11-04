import type { Device } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import { addPushTokenListener } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { auth, mfa } from '@/lib/auth';
import {
  currentSessionId,
  deviceId,
  deviceName,
  devicePlatform,
  forgetDeviceId,
  knownDeviceId,
} from '@/lib/device';
import { pushToken } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { routes } from '@/navigation/routes';
import { getCurrentUserId, repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * Senha e segurança › Aparelhos conectados. Devices are synced rows (`devices`,
 * own rows only); this phone registers itself on sign-in and refreshes
 * `lastSeenAt` on app start. Disconnecting another device is the online RPC
 * `revoke_device` (it deletes that device's auth session on the server).
 * The row also carries the push token and app language (server-sent pushes).
 */

export type ConnectedDevice = Device & { current: boolean };

export function useDevices(): ConnectedDevice[] {
  return useQuery(() => {
    const userId = getCurrentUserId();
    const mine = userId ? knownDeviceId(userId) : null;
    return repos.devices.list().map((d) => ({ ...d, current: d.id === mine }));
  }, []);
}

export type RegisterOptions = {
  language: string;
  /** Android channel name (system settings), in the app language. */
  channelName: string;
  /** Ask for push permission if it was never asked (system prompt, once). */
  ask?: boolean;
};

/** Registers (or refreshes) this phone. Skipped while the 2FA code is pending (AAL1). */
export async function registerThisDevice(options: RegisterOptions): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId || (await mfa.needsChallenge())) return;
  const sessionId = await currentSessionId();
  const token = await pushToken({ ask: options.ask ?? false, channelName: options.channelName });
  if (getCurrentUserId() !== userId) return;
  repos.devices.register({
    id: deviceId(userId),
    name: deviceName(),
    platform: devicePlatform(),
    sessionId,
    pushToken: token,
    language: options.language,
  });
}

export type RevokeResult = { ok: true } | { ok: false; reason: 'offline' | 'error' };

/** Desconectar: kills that device's session for real (online). */
export async function revokeDevice(id: string, online: boolean): Promise<RevokeResult> {
  if (!supabase || !online) return { ok: false, reason: 'offline' };
  try {
    const { error } = await supabase.rpc('revoke_device', { p_device: id });
    return error ? { ok: false, reason: 'error' } : { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/**
 * Mounted once (SyncProvider): registers this device when signed in and
 * online, and signs out locally when another device revoked this one (its row
 * comes back from sync with `revokedAt`).
 */
/** Language and Android channel name for `registerThisDevice`. */
export function useRegisterOptions(): RegisterOptions {
  // i18n follows the language picked in Configurações (PreferencesProvider).
  const { t, i18n } = useTranslation();
  return { language: i18n.language, channelName: t('profile.settings.notifications.channel') };
}

export function useDeviceSession(userId: string | null, online: boolean) {
  const { language, channelName } = useRegisterOptions();

  // Signed in: register with the push token (asks for permission the first
  // time); again when the language changes, so pushes follow it.
  useEffect(() => {
    if (userId && online) {
      void registerThisDevice({ language, channelName, ask: true }).catch(() => {});
    }
  }, [userId, online, language, channelName]);

  // The system may rotate the native token (restore): fetch the Expo one again.
  useEffect(() => {
    if (!userId) return;
    const subscription = addPushTokenListener(() => {
      void registerThisDevice({ language, channelName }).catch(() => {});
    });
    return () => subscription.remove();
  }, [userId, language, channelName]);

  const revoked = useQuery(() => {
    const id = userId ? knownDeviceId(userId) : null;
    return Boolean(id && repos.devices.get(id)?.revokedAt);
  }, [userId]);

  const leaving = useRef(false);
  useEffect(() => {
    if (!revoked || leaving.current) return;
    leaving.current = true;
    if (userId) forgetDeviceId(userId);
    void auth.signOut().finally(() => {
      leaving.current = false;
      router?.replace(routes.welcome);
    });
  }, [revoked, userId]);
}
