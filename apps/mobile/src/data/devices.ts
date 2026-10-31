import type { Device } from '@worlo/db';
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
import { supabase } from '@/lib/supabase';
import { routes } from '@/navigation/routes';
import { getCurrentUserId, repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * Senha e segurança › Aparelhos conectados. Devices are synced rows (`devices`,
 * own rows only); this phone registers itself on sign-in and refreshes
 * `lastSeenAt` on app start. Disconnecting another device is the online RPC
 * `revoke_device` (it deletes that device's auth session on the server).
 */

export type ConnectedDevice = Device & { current: boolean };

export function useDevices(): ConnectedDevice[] {
  return useQuery(() => {
    const userId = getCurrentUserId();
    const mine = userId ? knownDeviceId(userId) : null;
    return repos.devices.list().map((d) => ({ ...d, current: d.id === mine }));
  }, []);
}

/** Registers (or refreshes) this phone. Skipped while the 2FA code is pending (AAL1). */
export async function registerThisDevice(): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId || (await mfa.needsChallenge())) return;
  const sessionId = await currentSessionId();
  if (getCurrentUserId() !== userId) return;
  repos.devices.register({
    id: deviceId(userId),
    name: deviceName(),
    platform: devicePlatform(),
    sessionId,
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
export function useDeviceSession(userId: string | null, online: boolean) {
  useEffect(() => {
    if (userId && online) void registerThisDevice().catch(() => {});
  }, [userId, online]);

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
