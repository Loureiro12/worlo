import { create } from 'zustand';
import { createCommunitySlice } from './slices/community';
import { createDiscoverySlice } from './slices/discovery';
import { createNotificationsSlice } from './slices/notifications';
import { createPlanningSlice } from './slices/planning';
import { createSavedSlice } from './slices/saved';
import { createSessionSlice } from './slices/session';
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
  ...createSessionSlice(...a),
  ...createUiSlice(...a),
  ...createWorldSlice(...a),
  ...createTripsSlice(...a),
  ...createPlanningSlice(...a),
  ...createDiscoverySlice(...a),
  ...createSavedSlice(...a),
  ...createCommunitySlice(...a),
  ...createNotificationsSlice(...a),
  ...createSettingsSlice(...a),
}));

/** Resets the store between tests. */
export const initialStoreState = useStore.getState();
export function resetStore() {
  useStore.setState(initialStoreState, true);
}
