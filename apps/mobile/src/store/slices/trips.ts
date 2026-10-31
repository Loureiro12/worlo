import { TRIPS } from '@/mocks/data.generated';
import type { Collaborator, ExpenseItem, Trip } from '@/mocks/types';
import type { Slice } from '../types';

export type InviteStatus = 'pending' | 'accepted' | 'declined';

/** Segments of the Viagens tab (B3). */
export type TripsSegment = 'past' | 'wish' | 'rot';

/**
 * A collaborator, optionally flagged as the trip owner (trips the current user
 * joined through an invite). Without an owner in the list, the user owns it.
 */
export type Member = Collaborator & { owner?: boolean };

/** Expense added in the app: the mock row plus the numbers used for totals. */
export type TripExpense = ExpenseItem & {
  /** Amount in the trip currency. */
  amount?: number;
  /** Category name as in the mock data ("Comida", "Hospedagem"…). */
  cat?: string;
  /** Collaborators the expense is split with (equal split with the author). */
  split?: string[];
};

export type TripsSlice = {
  trips: Trip[];
  /** Expenses added in the app, per trip (on top of the mock ones), newest first. */
  expenses: Record<string, TripExpense[]>;
  invites: Record<string, InviteStatus>;
  /** Selected segment on the Viagens tab (forms send the user back to the right one). */
  tripsSegment: TripsSegment;
  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  setCollaborators: (tripId: string, collab: Member[]) => void;
  /** "Quem vai" of a wishlist destination (futures live in the world slice). */
  setFutureCollaborators: (futureId: string, collab: Member[]) => void;
  addExpense: (tripId: string, expense: TripExpense) => void;
  setInvite: (inviteId: string, status: InviteStatus) => void;
  setTripsSegment: (segment: TripsSegment) => void;
};

export const createTripsSlice: Slice<TripsSlice> = (set) => ({
  trips: TRIPS.slice(),
  expenses: {},
  invites: { jeri: 'pending', seul: 'pending' },
  tripsSegment: 'past',
  addTrip: (trip) => set((s) => ({ trips: [trip, ...s.trips] })),
  updateTrip: (id, patch) =>
    set((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  setCollaborators: (tripId, collab) =>
    set((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? { ...t, collab } : t)) })),
  setFutureCollaborators: (futureId, collab) =>
    set((s) => ({ futures: s.futures.map((f) => (f.id === futureId ? { ...f, collab } : f)) })),
  addExpense: (tripId, expense) =>
    set((s) => ({
      expenses: { ...s.expenses, [tripId]: [expense, ...(s.expenses[tripId] ?? [])] },
    })),
  setInvite: (inviteId, status) => set((s) => ({ invites: { ...s.invites, [inviteId]: status } })),
  setTripsSegment: (tripsSegment) => set({ tripsSegment }),
});
