import type { EntityType, NotificationRow, NotificationType } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import { useCallback } from 'react';
import { NOTIFS } from '@/mocks/data.generated';
import { demoId } from '@/mocks/demo';
import { repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * Notifications (synced: the server writes them, the device marks them read).
 * Rows map to a view with the entity's name, so screens only pick the i18n
 * template for the type.
 */

export type NotificationGroup = 'today' | 'week' | 'earlier';

export type NotificationView = {
  id: string;
  /** Prototype id of a demo notification (`n1`, used in testIDs), or the id. */
  key: string;
  type: NotificationType;
  actorId: string | null;
  entityType: string | null;
  entityId: string | null;
  data: Record<string, unknown>;
  /** Trip title / wish name / itinerary title ('' when it is not on the device). */
  entityName: string;
  /** Trip place (memories: "Há um ano você estava em Florianópolis"). */
  entityPlace: string;
  createdAt: string;
  read: boolean;
  group: NotificationGroup;
};

const DAY = 24 * 60 * 60 * 1000;

/** Hoje (same calendar day) / Esta semana (last 7 days) / Antes. */
export function notificationGroup(createdAt: string, now = Date.now()): NotificationGroup {
  const created = Date.parse(createdAt);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (created >= startOfToday.getTime()) return 'today';
  if (created >= startOfToday.getTime() - 7 * DAY) return 'week';
  return 'earlier';
}

export function notificationKey(id: string): string {
  return NOTIFS.find((n) => demoId(`notification:${n.id}`) === id)?.id ?? id;
}

export function entityLabel(type: string | null, id: string | null) {
  if (!type || !id) return { name: '', place: '' };
  if (type === 'trip') {
    const trip = repos.trips.get(id);
    return { name: trip?.title ?? '', place: trip?.place || trip?.country || '' };
  }
  if (type === 'wish') {
    const wish = repos.world.wishes().find((w) => w.id === id);
    return { name: wish?.name ?? '', place: wish?.name ?? '' };
  }
  if (type === 'itinerary') {
    const itinerary = repos.planning.get(id);
    return { name: itinerary?.title ?? '', place: itinerary?.place ?? '' };
  }
  return { name: '', place: '' };
}

export function toNotification(row: NotificationRow, now = Date.now()): NotificationView {
  const label = entityLabel(row.entityType, row.entityId);
  return {
    id: row.id,
    key: notificationKey(row.id),
    type: row.type,
    actorId: row.actorId,
    entityType: row.entityType,
    entityId: row.entityId,
    data: row.data ?? {},
    entityName: label.name,
    entityPlace: label.place,
    createdAt: row.createdAt,
    read: Boolean(row.readAt),
    group: notificationGroup(row.createdAt, now),
  };
}

/** Newest first. */
export function useNotifications(): NotificationView[] {
  return useQuery(() => {
    const now = Date.now();
    return repos.notifications.list().map((n) => toNotification(n, now));
  }, []);
}

/** Bell badge (Explorar). */
export function useUnreadCount(): number {
  return useQuery(() => repos.notifications.unreadCount(), []);
}

export const notificationsData = {
  markRead: (id: string) => repos.notifications.markRead(id),
  markAllRead: () => repos.notifications.markAllRead(),
};

/** Invite notifications point at a trip / wish. */
export const isEntityType = (type: string | null): type is EntityType =>
  type === 'trip' || type === 'wish';

export type RelativeTime =
  | { key: 'now' }
  | { key: 'minutes' | 'hours' | 'days' | 'weeks'; count: number }
  | { key: 'yesterday' };

/** "agora", "há 20 min", "há 2 h", "ontem", "há 3 dias", "há 1 semana". */
export function relativeTime(iso: string, now = Date.now()): RelativeTime {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return { key: 'now' };
  if (minutes < 60) return { key: 'minutes', count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: 'hours', count: hours };
  const days = Math.floor(hours / 24);
  if (days === 1) return { key: 'yesterday' };
  if (days < 7) return { key: 'days', count: days };
  return { key: 'weeks', count: Math.floor(days / 7) };
}

/** Localized relative time ("há 2 h") for activity and notification rows. */
export function useTimeAgo(): (iso: string) => string {
  const { t } = useTranslation();
  return useCallback(
    (iso: string) => {
      const r = relativeTime(iso);
      return r.key === 'now' || r.key === 'yesterday'
        ? t(`explore.time.${r.key}`)
        : t(`explore.time.${r.key}`, { count: r.count });
    },
    [t],
  );
}
