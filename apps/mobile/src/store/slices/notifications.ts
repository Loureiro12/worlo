import { palette } from '@worlo/ui';
import { COUNTRIES, INVITES, NOTIFS } from '@/mocks/data.generated';
import type { Collaborator, CountryId, Future, Invite, Notification, Trip } from '@/mocks/types';
import type { AppStore, Slice } from '../types';

export type NotificationsSlice = {
  readIds: Record<string, boolean>;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  /**
   * Accepts a collaboration invite (03_FLOWS → F4): a past trip joins "Realizadas"
   * and its country lights up on the map; a future trip joins "Quero ir".
   */
  acceptInvite: (inviteId: string) => void;
  declineInvite: (inviteId: string) => void;
};

function countryIdByName(name?: string): CountryId | undefined {
  return Object.entries(COUNTRIES).find(([, c]) => c.name === name)?.[0];
}

function countryIdByFlag(flag: string): CountryId | undefined {
  return Object.entries(COUNTRIES).find(([, c]) => c.flag === flag)?.[0];
}

function inviteCrew(invite: Invite): Collaborator[] {
  // The inviter owns the trip: the user joins as a collaborator (03_FLOWS → F4).
  return [invite.from, ...invite.others].map((name, i) => ({
    name,
    status: 'ok' as const,
    owner: i === 0,
  }));
}

/** Past-trip invite → the Trip the user now collaborates on. */
export function inviteToTrip(invite: Invite): Trip {
  return {
    id: invite.id,
    title: invite.title,
    place: invite.place,
    country: invite.country ?? '',
    flag: invite.flag,
    period: invite.period,
    year: invite.year ?? '',
    days: invite.days ?? 0,
    photos: invite.photos ?? 0,
    places: invite.places ?? 0,
    collab: inviteCrew(invite),
    people: '',
    total: invite.total ?? '',
    tint: palette.coral300,
  };
}

/** Future-trip invite → a "Quero ir" destination planned together. */
export function inviteToFuture(invite: Invite): Future {
  return {
    id: invite.id,
    cid: countryIdByFlag(invite.flag) ?? '',
    name: invite.title,
    flag: invite.flag,
    collab: inviteCrew(invite),
    note: invite.note,
    // Mock content stays pt-BR (like the rest of the data).
    saved: `Convite de ${invite.from.split(' ')[0]}`,
    tint: palette.coral100,
  };
}

/** Invite notifications stay unread while the invite is pending. */
export function isNotificationUnread(
  n: Notification,
  state: Pick<AppStore, 'readIds' | 'invites'>,
): boolean {
  if (state.readIds[n.id]) return false;
  if (n.type === 'invite') return state.invites[n.inv ?? ''] === 'pending';
  return true;
}

export function selectUnreadCount(state: Pick<AppStore, 'readIds' | 'invites'>): number {
  return NOTIFS.filter((n) => isNotificationUnread(n, state)).length;
}

export const createNotificationsSlice: Slice<NotificationsSlice> = (set, get) => ({
  readIds: {},
  markRead: (id) => set((s) => ({ readIds: { ...s.readIds, [id]: true } })),
  markAllRead: (ids) =>
    set((s) => ({ readIds: { ...s.readIds, ...Object.fromEntries(ids.map((id) => [id, true])) } })),
  acceptInvite: (inviteId) => {
    const invite = INVITES[inviteId];
    if (!invite) return;
    const s = get();
    s.setInvite(inviteId, 'accepted');
    if (invite.kind === 'past') {
      if (!s.trips.some((t) => t.id === invite.id)) s.addTrip(inviteToTrip(invite));
      const cid = countryIdByName(invite.country);
      if (cid) {
        // Adds the year without toggling the country off when it is already visited.
        set((st) => {
          const years = st.visitedMap[cid] ?? [];
          const year = invite.year ?? String(new Date().getFullYear());
          if (years.includes(year)) return {};
          return { visitedMap: { ...st.visitedMap, [cid]: [...years, year] } };
        });
      }
    } else if (!s.futures.some((f) => f.id === invite.id)) {
      // Newest first, like a just-accepted invite in Viagens → Quero ir.
      set((st) => ({ futures: [inviteToFuture(invite), ...st.futures] }));
    }
  },
  declineInvite: (inviteId) => get().setInvite(inviteId, 'declined'),
});
