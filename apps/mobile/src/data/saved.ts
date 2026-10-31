import type { CollectionRow, SavedItemRow } from '@worlo/db';
import { COLLS } from '@/mocks/data.generated';
import { demoId } from '@/mocks/demo';
import type { Collection, SavedCategory, SavedItem } from '@/mocks/types';
import { repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * Lugares salvos + coleções (03_FLOWS → F7/F8), read from SQLite. Rows map to the
 * view types the screens already use: `refId` ↔ `id`, `category` ↔ `cat`, `itemIds` ↔ `ids`.
 */

export const toSavedItem = (row: SavedItemRow): SavedItem => ({
  id: row.refId,
  name: row.name,
  cat: row.category as SavedCategory,
  city: row.city,
  flag: row.flag,
  meta: row.meta,
  rating: row.rating,
});

export const toCollection = (row: CollectionRow): Collection => ({
  id: row.id,
  name: row.name,
  ids: row.itemIds,
});

/** Newest first. */
export function useSavedItems(): SavedItem[] {
  return useQuery(() => repos.saved.items().map(toSavedItem), []);
}

export function useIsSaved(refId: string): boolean {
  return useQuery(() => repos.saved.isSaved(refId), [refId]);
}

/** Oldest first (creation order), like the prototype. */
export function useCollections(): Collection[] {
  return useQuery(() => repos.saved.collections().map(toCollection), []);
}

export const isSaved = (refId: string) => repos.saved.isSaved(refId);

/** Saves, or unsaves and drops the item from every collection (F8). */
export function toggleSaved(item: SavedItem) {
  repos.saved.toggle({
    refId: item.id,
    name: item.name,
    category: item.cat,
    city: item.city,
    flag: item.flag,
    meta: item.meta,
    rating: item.rating,
  });
}

export function toggleInCollection(collectionId: string, refId: string) {
  repos.saved.toggleInCollection(collectionId, refId);
}

/** `name` must be non-empty (≤ 60 chars): screens validate before calling. */
export function createCollection(name: string, firstRefId?: string): Collection {
  return toCollection(repos.saved.createCollection(name, firstRefId));
}

/** Prototype key (`c1`) of a demo collection, else its uuid: keeps testIDs stable. */
export function collectionKey(id: string): string {
  return COLLS.find((c) => demoId(`collection:${c.id}`) === id)?.id ?? id;
}
