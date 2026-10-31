import type { EntityType } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import { useToast } from '@worlo/ui';
import { useCallback } from 'react';
import { collab } from '@/data/collab';
import { entityLabel } from '@/data/notifications';
import { repos } from '@/data/repositories';
import { firstName } from '@/lib/people';

/**
 * Accept/decline a collaboration invite with the F4 toasts (Notificações and
 * Convite). Answers are memberships: offline OK, synced later.
 */
export function useInviteActions() {
  const { t } = useTranslation();
  const toast = useToast();

  const accept = useCallback(
    (type: EntityType, id: string) => {
      const title = entityLabel(type, id).name;
      collab.accept(type, id);
      toast.show(t('explore.invite.joinedToast', { title }));
    },
    [t, toast],
  );

  const decline = useCallback(
    (type: EntityType, id: string) => {
      const inviter = repos.collab.mine(type, id)?.invitedBy ?? repos.collab.ownerOf(type, id);
      const name = (inviter && repos.people.get(inviter)?.name) || '';
      collab.decline(type, id);
      toast.show(t('explore.invite.declinedToast', { name: firstName(name) }), 'info');
    },
    [t, toast],
  );

  return { accept, decline };
}
