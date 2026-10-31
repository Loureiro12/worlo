import type { Person } from '@worlo/db';
import { getCurrentUserId, repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * People the user is related to (follows, trip/wish companions, chats) and the
 * experts, synced to the device (`people` table, pull only). Strangers come from
 * the online RPCs (search, traveler page) in `@/data/community`.
 */

export type { Person } from '@worlo/db';

export function usePerson(id: string | null | undefined): Person | undefined {
  return useQuery(() => (id ? repos.people.get(id) : undefined), [id]);
}

/** Everyone the device knows except me, by name. */
export function usePeople(): Person[] {
  return useQuery(() => repos.people.list().filter((p) => p.id !== getCurrentUserId()), []);
}

/** People I follow ("amigos" when picking who went / who to invite). */
export function useFollowing(): Person[] {
  return useQuery(() => repos.people.byIds(repos.follows.following()), []);
}

export function useFollowers(): string[] {
  return useQuery(() => repos.follows.followers(), []);
}

export function useIsFollowing(personId: string | null | undefined): boolean {
  return useQuery(() => (personId ? repos.follows.isFollowing(personId) : false), [personId]);
}

/** Follow ↔ unfollow (offline: synced later). Returns the new state. */
export function toggleFollow(personId: string): boolean {
  return repos.follows.toggle(personId);
}

export function useExperts(): Person[] {
  return useQuery(() => repos.people.experts(), []);
}
