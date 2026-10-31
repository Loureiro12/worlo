import { create } from 'zustand';
import { createDiscoverySlice } from './slices/discovery';
import { createSettingsSlice } from './slices/settings';
import { createTripsSlice } from './slices/trips';
import { createUiSlice } from './slices/ui';
import { createWorldSlice } from './slices/world';
import type { AppStore } from './types';

export type { AppStore } from './types';

/**
 * Client UI state for the visual phase (no backend). Screen-local state (forms,
 * tabs, open sheets) stays in components; this holds what crosses screens.
 */
export const useStore = create<AppStore>()((...a) => ({
  ...createUiSlice(...a),
  ...createWorldSlice(...a),
  ...createTripsSlice(...a),
  ...createDiscoverySlice(...a),
  ...createSettingsSlice(...a),
}));

/** Resets the store between tests. */
export const initialStoreState = useStore.getState();
export function resetStore() {
  useStore.setState(initialStoreState, true);
}
