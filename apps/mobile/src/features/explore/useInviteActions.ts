import { useTranslation } from '@worlo/i18n';
import { useToast } from '@worlo/ui';
import { useCallback } from 'react';
import { firstName } from '@/lib/people';
import { INVITES } from '@/mocks/data.generated';
import { useStore } from '@/store';

/** Accept/decline a collaboration invite with the F4 toasts (Notificações and Convite). */
export function useInviteActions() {
  const { t } = useTranslation();
  const toast = useToast();
  const acceptInvite = useStore((s) => s.acceptInvite);
  const declineInvite = useStore((s) => s.declineInvite);

  const accept = useCallback(
    (id: string) => {
      const invite = INVITES[id];
      if (!invite) return;
      acceptInvite(id);
      toast.show(t('explore.invite.joinedToast', { title: invite.title }));
    },
    [acceptInvite, t, toast],
  );

  const decline = useCallback(
    (id: string) => {
      const invite = INVITES[id];
      if (!invite) return;
      declineInvite(id);
      toast.show(t('explore.invite.declinedToast', { name: firstName(invite.from) }), 'info');
    },
    [declineInvite, t, toast],
  );

  return { accept, decline };
}
