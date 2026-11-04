import {
  clearLastNotificationResponseAsync,
  DEFAULT_ACTION_IDENTIFIER,
  useLastNotificationResponse,
} from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { notificationsData, useUnreadCount } from '@/data/notifications';
import { pushTarget } from '@/features/explore/notificationTarget';
import { pushPayload, setBadge } from '@/lib/push';

/**
 * Mounted inside the signed-in app (tabs layout): a tapped push opens what the
 * notification is about, also when it launched the app, and the app icon
 * badge follows the unread count.
 */
export function PushHandler() {
  const router = useRouter();
  const response = useLastNotificationResponse();
  const unread = useUnreadCount();

  useEffect(() => setBadge(unread), [unread]);

  useEffect(() => {
    if (!response || response.actionIdentifier !== DEFAULT_ACTION_IDENTIFIER) return;
    // Handled once: coming back to the tabs must not open it again.
    void clearLastNotificationResponseAsync().catch(() => {});
    const push = pushPayload(response);
    if (!push) return;
    notificationsData.markRead(push.id);
    router.push(pushTarget(push));
  }, [response, router]);

  return null;
}
