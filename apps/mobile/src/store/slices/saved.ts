import { COLLS, SAVED } from '@/mocks/data.generated';
import type { Collection, SavedItem } from '@/mocks/types';
import type { Slice } from '../types';

export type SavedSlice = {
  saved: SavedItem[];
  collections: Collection[];
  isSaved: (id: string) => boolean;
  /** Removing also drops the item from every collection (03_FLOWS → F8). */
  toggleSaved: (item: SavedItem) => void;
  toggleInCollection: (collectionId: string, itemId: string) => void;
  createCollection: (name: string, firstItemId?: string) => Collection;
};

export const createSavedSlice: Slice<SavedSlice> = (set, get) => ({
  saved: SAVED.slice(),
  collections: COLLS.map((c) => ({ ...c, ids: c.ids.slice() })),
  isSaved: (id) => get().saved.some((s) => s.id === id),
  toggleSaved: (item) =>
    set((s) =>
      s.saved.some((x) => x.id === item.id)
        ? {
            saved: s.saved.filter((x) => x.id !== item.id),
            collections: s.collections.map((c) => ({
              ...c,
              ids: c.ids.filter((id) => id !== item.id),
            })),
          }
        : { saved: [item, ...s.saved] },
    ),
  toggleInCollection: (collectionId, itemId) =>
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id !== collectionId
          ? c
          : {
              ...c,
              ids: c.ids.includes(itemId)
                ? c.ids.filter((id) => id !== itemId)
                : [...c.ids, itemId],
            },
      ),
    })),
  createCollection: (name, firstItemId) => {
    const collection: Collection = {
      id: `c${Date.now()}`,
      name,
      ids: firstItemId ? [firstItemId] : [],
    };
    set((s) => ({ collections: [...s.collections, collection] }));
    return collection;
  },
});
