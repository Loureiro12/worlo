import type { IconName } from '@worlo/ui';

/**
 * Achievements from the prototype (B5 · Conquistas). Unlocked ones carry their
 * mock "when/where" line (pt-BR content); locked ones carry how many are left.
 */
export type Achievement = {
  id: 'firstTrip' | 'fiveCountries' | 'endOfWorld' | 'twentyCities' | 'threeContinents';
  icon: IconName;
} & ({ unlocked: true; meta: string } | { unlocked: false; remaining: number });

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'firstTrip', icon: 'airplane-takeoff', unlocked: true, meta: 'Rio · 2019' },
  { id: 'fiveCountries', icon: 'globe-hemisphere-west', unlocked: true, meta: 'mar 2024' },
  { id: 'endOfWorld', icon: 'mountains', unlocked: true, meta: 'Patagônia · 2024' },
  { id: 'twentyCities', icon: 'buildings', unlocked: false, remaining: 10 },
  { id: 'threeContinents', icon: 'compass', unlocked: false, remaining: 1 },
];
