import type { StateCreator } from 'zustand';
import type { DiscoverySlice } from './slices/discovery';
import type { SettingsSlice } from './slices/settings';
import type { TripsSlice } from './slices/trips';
import type { UiSlice } from './slices/ui';
import type { WorldSlice } from './slices/world';

export type AppStore = UiSlice & WorldSlice & TripsSlice & DiscoverySlice & SettingsSlice;

/** Each area owns one slice file; slices may read the whole store via `get`. */
export type Slice<T> = StateCreator<AppStore, [], [], T>;
