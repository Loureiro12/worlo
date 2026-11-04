import type { EntityType, NotificationType } from '@worlo/db';
import type { Href } from 'expo-router';
import { myMembership } from '@/data/collab';
import { isEntityType, type NotificationView } from '@/data/notifications';
import { repos } from '@/data/repositories';
import type { PushPayload } from '@/lib/push';
import { routes } from '@/navigation/routes';

export type NotificationTargetInput = Pick<
  NotificationView,
  'type' | 'entityType' | 'entityId' | 'actorId' | 'data'
>;

/** Where a tap goes (null: just marks it read). */
export function notificationTarget(
  n: NotificationTargetInput,
  inviteId: string | undefined,
): Href | null {
  const id = n.entityId;
  switch (n.type) {
    case 'invite':
      return inviteId ? routes.invite(inviteId) : null;
    case 'follow':
      return n.actorId ? routes.traveler(n.actorId) : null;
    case 'comment':
    case 'community':
      return id ? routes.post(id) : null;
    case 'reminder':
      if (n.entityType === 'booking') {
        return typeof n.data.tour_id === 'string' ? routes.passeio(n.data.tour_id) : null;
      }
      return id ? routes.roteiro(id) : null;
    default:
      if (!id) return null;
      if (n.entityType === 'trip') return repos.trips.get(id) ? routes.trip(id) : null;
      if (n.entityType === 'wish') return routes.future(id);
      return null;
  }
}

/**
 * A tapped push: the same target as the row in Notificações, read from the
 * payload (the row may not be on the device yet). Falls back to Notificações.
 */
export function pushTarget(push: PushPayload): Href {
  const n: NotificationTargetInput = {
    type: push.type as NotificationType,
    entityType: push.entity_type,
    entityId: push.entity_id,
    actorId: push.actor_id,
    data: push.data,
  };
  const invite =
    n.type === 'invite' && isEntityType(n.entityType) && n.entityId
      ? myMembership(n.entityType as EntityType, n.entityId)?.id
      : undefined;
  return notificationTarget(n, invite) ?? routes.notifs;
}
