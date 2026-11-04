import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Push notifications (Expo). The server sends one for every notification row
 * (see supabase/migrations/*_push.sql); this phone only registers its token
 * (`devices.push_token`), opens the right screen on tap and keeps the badge.
 * Simulators have no token: everything here is a no-op there.
 */

/** Android channel the server sends to (`channelId` in push_notification()). */
export const PUSH_CHANNEL = 'default';

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

// While the app is open the bell updates too: banner, no sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function pushPermission(): Promise<{ status: PushPermission; canAsk: boolean }> {
  if (!Device.isDevice) return { status: 'unavailable', canAsk: false };
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return { status, canAsk: status !== 'granted' && canAskAgain };
  } catch {
    return { status: 'unavailable', canAsk: false };
  }
}

/**
 * This phone's Expo push token, asking for permission first when `ask` (the
 * system prompt shows once). Null without permission, on a simulator, or when
 * the build has no push credentials (Android without google-services.json).
 */
export async function pushToken({
  ask,
  channelName,
}: {
  ask: boolean;
  channelName: string;
}): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    // Android 13+ only shows the prompt once a channel exists.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(PUSH_CHANNEL, {
        name: channelName,
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let { status, canAsk } = await pushPermission();
    if (status !== 'granted' && ask && canAsk) {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;
    const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

/** App icon badge = unread notifications (0 clears it). */
export function setBadge(count: number) {
  void Notifications.setBadgeCountAsync(count).catch(() => {});
}

/** The notification row a push carries (`data` in push_notification()). */
export type PushPayload = {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  data: Record<string, unknown>;
};

export function pushPayload(response: Notifications.NotificationResponse): PushPayload | null {
  const data = response.notification.request.content.data as Partial<PushPayload> | undefined;
  if (!data || typeof data.id !== 'string' || typeof data.type !== 'string') return null;
  return {
    id: data.id,
    type: data.type,
    entity_type: data.entity_type ?? null,
    entity_id: data.entity_id ?? null,
    actor_id: data.actor_id ?? null,
    data: data.data && typeof data.data === 'object' ? data.data : {},
  };
}
