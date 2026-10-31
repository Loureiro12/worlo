import { randomUUID } from 'expo-crypto';
import * as Device from 'expo-device';
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * This phone as a row of Senha e segurança › Aparelhos conectados. The id is
 * random per account (kept on the device, survives restarts), the session id
 * comes from the access token so `revoke_device()` can kill it on the server.
 */

const key = (userId: string) => `worlo.device.${userId}`;

/** Stable id of this device for an account (created on first use). */
export function deviceId(userId: string): string {
  const stored = Storage.getItemSync(key(userId));
  if (stored) return stored;
  const id = randomUUID();
  Storage.setItemSync(key(userId), id);
  return id;
}

/** The id without creating one (null = this account never registered here). */
export const knownDeviceId = (userId: string): string | null => Storage.getItemSync(key(userId));

/** After this device was revoked: the next sign-in registers as a new device. */
export const forgetDeviceId = (userId: string) => Storage.removeItemSync(key(userId));

export type DeviceKind = 'phone' | 'tablet' | 'computer';

/** `<os>` or `<os>:tablet` / `<os>:computer` (≤ 20 chars, see the `devices` table). */
export function devicePlatform(): string {
  const kind: DeviceKind =
    Device.deviceType === Device.DeviceType.TABLET
      ? 'tablet'
      : Device.deviceType === Device.DeviceType.DESKTOP
        ? 'computer'
        : 'phone';
  return kind === 'phone' ? Platform.OS : `${Platform.OS}:${kind}`;
}

export function parsePlatform(platform: string): { os: string; kind: DeviceKind } {
  const [os = '', kind] = platform.split(':');
  return {
    os,
    kind: kind === 'tablet' || kind === 'computer' ? kind : os === 'web' ? 'computer' : 'phone',
  };
}

/** "iPhone 15", "Pixel 8" (the model: the user-set name needs an iOS entitlement). */
export function deviceName(): string {
  return Device.modelName ?? Device.deviceName ?? Device.osName ?? Platform.OS;
}

/** `session_id` claim of a Supabase access token (null if it can't be read). */
export function sessionIdOf(accessToken: string | undefined | null): string | null {
  const part = accessToken?.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(globalThis.atob(padded)) as { session_id?: unknown };
    return typeof payload.session_id === 'string' ? payload.session_id : null;
  } catch {
    return null;
  }
}

/** Session id of the current Supabase session (local read). */
export async function currentSessionId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return sessionIdOf(data.session?.access_token);
}
