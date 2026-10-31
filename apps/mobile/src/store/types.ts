import type { StateCreator } from 'zustand';
import type { CommunitySlice } from './slices/community';
import type { DiscoverySlice } from './slices/discovery';
import type { NotificationsSlice } from './slices/notifications';
import type { PlanningSlice } from './slices/planning';
import type { SavedSlice } from './slices/saved';
import type { SessionSlice } from './slices/session';
import type { SettingsSlice } from './slices/settings';
import type { TripsSlice } from './slices/trips';
import type { UiSlice } from './slices/ui';
import type { WorldSlice } from './slices/world';

export type AppStore = SessionSlice &
  UiSlice &
  WorldSlice &
  TripsSlice &
  PlanningSlice &
  DiscoverySlice &
  SavedSlice &
  CommunitySlice &
  NotificationsSlice &
  SettingsSlice;

/** Each area owns one slice file; slices may read the whole store via `get`. */
export type Slice<T> = StateCreator<AppStore, [], [], T>;
