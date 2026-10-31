import type { TripExpenseRow, TripRow } from '@worlo/db';
import type { IconName } from '@worlo/ui';
import type { Collaborator, Trip, TripDetails } from '@/mocks/types';
import type { TripExpense } from '@/store/slices/trips';
import { accessOf, collaboratorsOf, companionsOf, isListed } from './collab';
import { repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * The user's trips ("Realizadas") and their expenses, from SQLite.
 * `details` (places, diary, timeline, money summary) is the row's json; new
 * trips have none, so screens show their empty states.
 */

export type TripView = Trip & {
  countryIso: string | null;
  details: TripDetails | null;
  createdAt: string;
  /** Owner (null on rows created before phase 2 = me). */
  userId: string | null;
  isOwner: boolean;
  /** Owner or accepted member. */
  canEdit: boolean;
};

/**
 * Row → view. `collab` = owner (when someone else) + memberships + legacy
 * companions (see `collaboratorsOf`); call inside `useQuery` so it refreshes.
 */
export function toTrip(row: TripRow): TripView {
  return {
    id: row.id,
    title: row.title,
    place: row.place,
    country: row.country,
    countryIso: row.countryIso,
    flag: row.flag,
    period: row.period,
    year: row.year,
    days: row.days,
    photos: row.photos,
    places: row.places,
    collab: collaboratorsOf('trip', row),
    people: row.people,
    total: row.total,
    tint: row.tint,
    details: (row.details as TripDetails | null) ?? null,
    createdAt: row.createdAt,
    userId: row.userId,
    ...accessOf('trip', row.id),
  };
}

export function toExpense(row: TripExpenseRow): TripExpense {
  return {
    icon: row.icon as IconName,
    name: row.name,
    meta: row.meta,
    val: row.amountLabel,
    receipt: row.receipt,
    amount: row.amount,
    cat: row.category,
    split: row.split,
  };
}

/** My trips and the ones I joined, newest first (pending invites stay out). */
export function useTrips(): TripView[] {
  return useQuery(
    () =>
      repos.trips
        .list()
        .filter((r) => isListed('trip', r))
        .map(toTrip),
    [],
  );
}

export function useTrip(id: string | undefined): TripView | undefined {
  return useQuery(() => {
    const row = id ? repos.trips.get(id) : undefined;
    return row && !row.deletedAt ? toTrip(row) : undefined;
  }, [id]);
}

/** Expenses added in the app (on top of `details.money`), newest first. */
export function useTripExpenses(id: string | undefined): TripExpense[] {
  return useQuery(() => (id ? repos.trips.expenses(id).map(toExpense) : []), [id]);
}

type TripInput = Partial<Omit<Trip, 'id' | 'collab'>> & {
  title: string;
  collab?: Collaborator[];
  countryIso?: string | null;
  details?: Record<string, unknown> | null;
};

const toRow = ({ collab, ...rest }: Partial<TripInput>) => ({
  ...rest,
  ...(collab ? { companions: companionsOf(collab) } : {}),
});

export const tripsData = {
  addTrip: (input: TripInput) =>
    toTrip(repos.trips.create({ ...toRow(input), title: input.title })),
  updateTrip: (id: string, patch: Partial<TripInput>) =>
    toTrip(repos.trips.update(id, toRow(patch))),
  /** Legacy free-text companions (people without a Worlo account). */
  setCompanions: (id: string, collab: Collaborator[]) =>
    repos.trips.update(id, { companions: companionsOf(collab) }),
  addExpense: (tripId: string, expense: TripExpense) =>
    repos.trips.addExpense(tripId, {
      name: expense.name,
      icon: expense.icon,
      meta: expense.meta,
      amountLabel: expense.val,
      amount: expense.amount ?? 0,
      category: expense.cat ?? '',
      split: expense.split ?? [],
      receipt: expense.receipt ?? false,
    }),
};
