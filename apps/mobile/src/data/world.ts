import type { WishDestination } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import { palette } from '@worlo/ui';
import { useMemo } from 'react';
import { FUTURES } from '@/mocks/data.generated';
import { demoId } from '@/mocks/demo';
import type { Collaborator, CountryId, Future } from '@/mocks/types';
import { accessOf, collaboratorsOf, companionsOf, isListed } from './collab';
import { getCurrentUserId, repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * Visited countries and the wishlist ("Quero ir"), from SQLite.
 * Reads re-render on any local write or sync pull; writes go through `repos`
 * (row + outbox in one transaction).
 */

/** Prototype id of a demo wish (`392`, used in testIDs), or the uuid itself. */
export function wishKey(id: string): string {
  return FUTURES.find((f) => demoId(`wish:${f.id}`) === id)?.id ?? id;
}

const DAY = 24 * 60 * 60 * 1000;

export type SavedLabel =
  | { key: 'invitedBy'; name: string }
  | { key: 'savedNow' }
  | { key: 'savedOn'; month: string };

/**
 * "Convite de Marina" (someone else's wish I joined), "Salvo agora" (last 24h)
 * or "Salvo em ago 2025" (month in the app language).
 */
export function savedLabel(
  row: Pick<WishDestination, 'createdAt'>,
  language: string,
  now = Date.now(),
  ownerName?: string | null,
): SavedLabel {
  if (ownerName) return { key: 'invitedBy', name: ownerName.split(' ')[0] ?? ownerName };
  const created = Date.parse(row.createdAt);
  if (!Number.isFinite(created) || now - created < DAY) return { key: 'savedNow' };
  const date = new Date(created);
  const month = new Intl.DateTimeFormat(language, { month: 'short', timeZone: 'UTC' })
    .format(date)
    .replace('.', '');
  return { key: 'savedOn', month: `${month} ${date.getUTCFullYear()}` };
}

export type FutureView = Future & {
  /** Owner (null on rows created before phase 2 = me). */
  userId: string | null;
  isOwner: boolean;
  canEdit: boolean;
};

export function toFuture(row: WishDestination, saved: string): FutureView {
  return {
    id: row.id,
    cid: row.countryIso ?? '',
    name: row.name,
    flag: row.flag,
    note: row.note,
    tint: row.tint,
    cover: row.coverUrl ?? null,
    collab: collaboratorsOf('wish', row),
    saved,
    userId: row.userId,
    ...accessOf('wish', row.id),
  };
}

/** Country → years visited. */
export function useVisitedMap(): Record<CountryId, string[]> {
  return useQuery(() => repos.world.visitedMap(), []);
}

function useFutureRows(filter: (row: WishDestination) => boolean): FutureView[] {
  const { t, i18n } = useTranslation();
  return useQuery(
    () =>
      repos.world
        .wishes()
        .filter(filter)
        .map((row) => {
          const me = getCurrentUserId();
          const owner =
            row.userId && row.userId !== me ? repos.people.get(row.userId)?.name : undefined;
          const label = savedLabel(row, i18n.language, Date.now(), owner);
          const saved =
            label.key === 'invitedBy'
              ? t('tripForm.defaults.invitedBy', { name: label.name })
              : label.key === 'savedOn'
                ? t('tripForm.defaults.savedOn', { month: label.month })
                : t('tripForm.defaults.savedNow');
          return toFuture(row, saved);
        }),
    [filter, t, i18n.language],
  );
}

const listed = (row: WishDestination) => isListed('wish', row);

/** Wishlist destinations (mine and the ones I joined), oldest first like the prototype. */
export function useFutures(): FutureView[] {
  return useFutureRows(listed);
}

/** One destination by id (also a pending invite's preview). */
export function useFuture(id: string | undefined): FutureView | undefined {
  const byId = useMemo(() => (row: WishDestination) => row.id === id, [id]);
  return useFutureRows(byId)[0];
}

export const world = {
  toggleVisited: (id: CountryId, year = String(new Date().getFullYear())) =>
    repos.world.toggleVisited(id, year),
  markVisited: (id: CountryId, year?: string) => repos.world.markVisited(id, year),
  markManyVisited: (ids: CountryId[], year?: string) => repos.world.markManyVisited(ids, year),
  /** "Quero ir" on a country (map, country page). */
  toggleWishlist: (id: CountryId, name: string, flag = '') =>
    repos.world.toggleWishCountry(id, name || id, flag, palette.coral100),
  addFuture: (input: {
    name: string;
    countryIso?: CountryId | null;
    flag?: string;
    note?: string;
    tint?: string;
    collab?: Collaborator[];
  }) =>
    repos.world.addWish({
      name: input.name,
      countryIso: input.countryIso || null,
      flag: input.flag,
      note: input.note,
      tint: input.tint,
      companions: input.collab ? companionsOf(input.collab) : undefined,
    }),
  /** Capa do "Quero ir" (an uploaded photo's URL), or null for the solid color. */
  setFutureCover: (id: string, url: string | null) => repos.world.updateWish(id, { coverUrl: url }),
  /** Legacy free-text companions (people without a Worlo account). */
  setFutureCompanions: (id: string, collab: Collaborator[]) =>
    repos.world.updateWish(id, { companions: companionsOf(collab) }),
  /** Wish without a country (Explorar → Lugares para conhecer): matched by name. */
  placeWish: (name: string) =>
    repos.world.wishes().find((w) => w.countryIso == null && w.name === name),
  togglePlaceWish: (name: string, note = '', tint: string = palette.coral100) => {
    const existing = world.placeWish(name);
    if (existing) repos.world.removeWish(existing.id);
    else repos.world.addWish({ name, note, tint, flag: '📍' });
  },
};

/** Whether a place from Explorar is on the wishlist. */
export function usePlaceWished(name: string): boolean {
  return useQuery(() => Boolean(world.placeWish(name)), [name]);
}
