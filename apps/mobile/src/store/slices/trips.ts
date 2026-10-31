import type { Collaborator, ExpenseItem } from '@/mocks/types';
import type { Slice } from '../types';

/** Segments of the Viagens tab (B3). */
export type TripsSegment = 'past' | 'wish' | 'rot';

/**
 * A collaborator, optionally flagged as the trip owner (trips the current user
 * joined through an invite). Without an owner in the list, the user owns it.
 */
export type Member = Collaborator;

/** Expense added in the app: the mock row plus the numbers used for totals. */
export type TripExpense = ExpenseItem & {
  /** Amount in the trip currency. */
  amount?: number;
  /** Category name as in the mock data ("Comida", "Hospedagem"…). */
  cat?: string;
  /** Collaborators the expense is split with (equal split with the author). */
  split?: string[];
};

/**
 * Viagens UI state. Trips, expenses, the wishlist and collaboration live in
 * SQLite (`@/data/trips`, `@/data/world`, `@/data/collab`).
 */
export type TripsSlice = {
  /** Selected segment on the Viagens tab (forms send the user back to the right one). */
  tripsSegment: TripsSegment;
  setTripsSegment: (segment: TripsSegment) => void;
};

export const createTripsSlice: Slice<TripsSlice> = (set) => ({
  tripsSegment: 'past',
  setTripsSegment: (tripsSegment) => set({ tripsSegment }),
});
