import type { EntityType, Membership, Person } from '@worlo/db';
import { supabase } from '@/lib/supabase';
import { INVITES } from '@/mocks/data.generated';
import { demoId } from '@/mocks/demo';
import type { Collaborator } from '@/mocks/types';
import { getCurrentUserId, repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * Collaboration on trips and wishes. Members are memberships (synced, offline
 * first: `repos.collab`); invite links are online only (`invite_links` insert
 * and the `accept_invite_link` RPC). Screens use these helpers, never
 * `supabase` directly.
 */

type Shared = { id: string; userId: string | null; companions: unknown };

const active = (m: Membership) => m.status === 'pending' || m.status === 'accepted';

/**
 * Everyone on a trip / wish besides me: the owner (when it is someone else),
 * members who accepted or are pending, then legacy free-text companions.
 */
export function collaboratorsOf(type: EntityType, row: Shared): Collaborator[] {
  const me = getCurrentUserId();
  const owner = row.userId && row.userId !== me ? row.userId : null;
  const members = repos.collab
    .members(type, row.id)
    .filter((m) => active(m) && m.userId !== me && m.userId !== row.userId);
  const names = new Map(
    repos.people
      .byIds([...(owner ? [owner] : []), ...members.map((m) => m.userId)])
      .map((p) => [p.id, p.name]),
  );
  const out: Collaborator[] = [];
  if (owner) out.push({ name: names.get(owner) ?? '', status: 'ok', owner: true, userId: owner });
  for (const m of members) {
    out.push({
      name: names.get(m.userId) ?? '',
      status: m.status === 'accepted' ? 'ok' : 'pending',
      userId: m.userId,
    });
  }
  for (const c of (row.companions as Collaborator[] | null) ?? []) {
    if (!out.some((o) => o.name === c.name)) out.push({ name: c.name, status: c.status });
  }
  return out;
}

/** Only free-text names are stored on the row (`companions`); accounts are memberships. */
export const companionsOf = (collab: readonly Collaborator[]) =>
  collab.filter((c) => !c.userId && !c.owner).map(({ name, status }) => ({ name, status }));

/** Shown in my lists (Realizadas / Quero ir): mine, or I accepted the invite. */
export function isListed(type: EntityType, row: Shared): boolean {
  const me = getCurrentUserId();
  if (row.userId == null || row.userId === me) return true;
  return repos.collab.mine(type, row.id)?.status === 'accepted';
}

export function accessOf(type: EntityType, id: string) {
  return { isOwner: repos.collab.isOwner(type, id), canEdit: repos.collab.canEdit(type, id) };
}

/** Prototype key of a demo invite (`jeri`, `seul`, used in testIDs), or the entity id. */
export function inviteKey(type: EntityType, entityId: string): string {
  return Object.keys(INVITES).find((k) => demoId(`${type}:${k}`) === entityId) ?? entityId;
}

export type InviteView = {
  /** My membership (route id). */
  id: string;
  key: string;
  type: EntityType;
  entityId: string;
  status: Membership['status'];
  inviterId: string | null;
  inviterName: string;
  inviterAvatar: string | null;
  note: string;
  title: string;
  place: string;
  flag: string;
  period: string;
  year: string;
  countryIso: string | null;
  days: number;
  photos: number;
  places: number;
  /** Other people on it (owner and members), without me and the inviter. */
  others: { userId: string; name: string; avatarUrl: string | null }[];
};

/** An invite to me, by my membership id (any status), with the entity preview. */
export function readInvite(membershipId: string): InviteView | undefined {
  const me = getCurrentUserId();
  const mine =
    repos.collab.pendingInvites().find((m) => m.id === membershipId) ?? findMine(membershipId);
  if (!mine || mine.userId !== me) return undefined;
  const { entityType: type, entityId } = mine;
  const trip = type === 'trip' ? repos.trips.get(entityId) : undefined;
  const wish = type === 'wish' ? repos.world.wishes().find((w) => w.id === entityId) : undefined;
  const entity = trip ?? wish;
  if (!entity || entity.deletedAt) return undefined;

  const ownerId = entity.userId;
  const inviterId = mine.invitedBy ?? ownerId;
  const otherIds = [
    ...(ownerId && ownerId !== inviterId && ownerId !== me ? [ownerId] : []),
    ...repos.collab
      .members(type, entityId)
      .filter((m) => active(m) && m.userId !== me && m.userId !== inviterId && m.userId !== ownerId)
      .map((m) => m.userId),
  ];
  const people = new Map(
    repos.people.byIds([...(inviterId ? [inviterId] : []), ...otherIds]).map((p) => [p.id, p]),
  );
  const inviter = inviterId ? people.get(inviterId) : undefined;
  const notification = repos.notifications
    .list()
    .find((n) => n.type === 'invite' && n.entityType === type && n.entityId === entityId);
  const note = notification?.data.note;

  return {
    id: mine.id,
    key: inviteKey(type, entityId),
    type,
    entityId,
    status: mine.status,
    inviterId,
    inviterName: inviter?.name ?? '',
    inviterAvatar: inviter?.avatarUrl ?? null,
    note: typeof note === 'string' ? note : '',
    title: trip?.title ?? wish?.name ?? '',
    place: trip ? trip.place || trip.country : (wish?.name ?? ''),
    flag: entity.flag,
    period: trip?.period ?? '',
    year: trip?.year ?? '',
    countryIso: entity.countryIso,
    days: trip?.days ?? 0,
    photos: trip?.photos ?? 0,
    places: trip?.places ?? 0,
    others: otherIds.map((userId) => {
      const p = people.get(userId);
      return { userId, name: p?.name ?? '', avatarUrl: p?.avatarUrl ?? null };
    }),
  };
}

/** My answered invites: the entity is still on the device until the next prune. */
function findMine(membershipId: string): Membership | undefined {
  const candidates = [
    ...repos.trips.list().map((t) => repos.collab.mine('trip', t.id)),
    ...repos.world.wishes().map((w) => repos.collab.mine('wish', w.id)),
  ];
  return candidates.find((m) => m?.id === membershipId);
}

/**
 * Who I can invite: people I follow (like `useFollowing`), in the order I
 * followed them, so the suggestions keep a stable order.
 */
export function useInviteCandidates(): Person[] {
  return useQuery(
    () =>
      repos.follows
        .following()
        .map((id) => repos.people.get(id))
        .filter((p): p is Person => Boolean(p && !p.deletedAt)),
    [],
  );
}

export function useInvite(membershipId: string | undefined): InviteView | undefined {
  return useQuery(() => (membershipId ? readInvite(membershipId) : undefined), [membershipId]);
}

/** My membership on an entity (route id of its invite), if any. */
export function myMembership(type: EntityType, id: string): Membership | undefined {
  return repos.collab.mine(type, id);
}

const currentYear = () => String(new Date().getFullYear());

/** Writes (offline OK: memberships go through the outbox). */
export const collab = {
  invite: (type: EntityType, id: string, userIds: string[]) =>
    repos.collab.invite(type, id, userIds),
  remove: (type: EntityType, id: string, userId: string) => repos.collab.remove(type, id, userId),
  /** I leave a trip / wish I joined (it disappears from this device). */
  leave: (type: EntityType, id: string) => repos.collab.leave(type, id),
  /**
   * Accepts an invite (03_FLOWS → F4): a past trip joins "Realizadas" and its
   * country lights up on the map with the trip's year; a wish joins "Quero ir".
   */
  accept(type: EntityType, id: string) {
    repos.collab.respond(type, id, true);
    if (type === 'trip') {
      const trip = repos.trips.get(id);
      if (trip?.countryIso) repos.world.addVisitYear(trip.countryIso, trip.year || currentYear());
    }
  },
  /** Declines; the entity leaves the device on the next sync (`repos.collab.prune`). */
  decline: (type: EntityType, id: string) => repos.collab.respond(type, id, false),
};

// ── Online only ──────────────────────────────────────────────────────────────

export class OfflineError extends Error {
  constructor() {
    super('offline');
  }
}

/** Creates a 14-day invite link token for a trip / wish I can edit (online). */
export async function createInviteLink(type: EntityType, id: string): Promise<string> {
  if (!supabase) throw new OfflineError();
  const { data, error } = await supabase
    .from('invite_links')
    .insert({ entity_type: type, entity_id: id })
    .select('token')
    .single();
  if (error) throw error;
  return data.token;
}

/** Joins the trip / wish of an invite link (online). */
export async function acceptInviteLink(token: string): Promise<{ type: EntityType; id: string }> {
  if (!supabase) throw new OfflineError();
  const { data, error } = await supabase.rpc('accept_invite_link', { p_token: token });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('invalid link');
  return { type: row.entity_type as EntityType, id: row.entity_id };
}
