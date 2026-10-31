import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { LocalDatabase } from './database';
import {
  type CatalogRow,
  type CollectionRow,
  type Companion,
  catalog,
  collections,
  type ItineraryRow,
  itineraries,
  type LiveLog,
  type LiveSession,
  liveLogs,
  liveSessions,
  type Profile,
  profiles,
  type SavedItemRow,
  savedItems,
  type TripExpenseRow,
  type TripRow,
  tripExpenses,
  trips,
  type VisitedCountry,
  visitedCountries,
  type WishDestination,
  wishDestinations,
} from './schema';
import { createSocialRepositories } from './social';
import { createWriter, type RepositoryOptions, requiredText, ValidationError } from './writer';

/**
 * Domain repositories. Reads are synchronous (SQLite) and return plain rows;
 * the app re-runs them when `onChange` fires (see apps/mobile `useQuery`).
 * Writes validate first, so a row the server would reject never reaches the outbox.
 */

const ISO = /^[0-9]{3}$/;
const checkIso = (iso: string | null | undefined) => {
  if (iso != null && !ISO.test(iso)) throw new ValidationError('countryIso');
  return iso ?? null;
};

type Editable<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;

export function createRepositories(db: LocalDatabase, options: RepositoryOptions) {
  const w = createWriter(db, options);
  const me = () => options.userId?.() ?? null;

  const profile = {
    /** The signed-in user's profile (created by the server on sign-up, pulled on first sync). */
    get(): Profile | undefined {
      return db.select().from(profiles).where(isNull(profiles.deletedAt)).get();
    },
    update(patch: Editable<Profile>): Profile {
      const current = profile.get();
      if (!current) throw new Error('Profile not synced yet');
      const next = { ...current, ...patch, updatedAt: w.stamp() };
      if (next.name.length > 80) throw new ValidationError('name');
      if (next.username.length > 30) throw new ValidationError('username');
      if (next.bio.length > 300) throw new ValidationError('bio');
      return w.put('profiles', next);
    },
  };

  const world = {
    visited(): VisitedCountry[] {
      return db
        .select()
        .from(visitedCountries)
        .where(isNull(visitedCountries.deletedAt))
        .orderBy(asc(visitedCountries.createdAt))
        .all();
    },
    /** Country → years. Duplicate rows (two devices offline) merge here. */
    visitedMap(): Record<string, string[]> {
      const map: Record<string, string[]> = {};
      for (const row of world.visited()) {
        map[row.countryIso] = [...new Set([...(map[row.countryIso] ?? []), ...row.years])];
      }
      return map;
    },
    /** Marks a country visited unless it already is. */
    markVisited(iso: string, year?: string) {
      checkIso(iso);
      if (world.visitedMap()[iso]) return;
      w.put('visited_countries', { ...w.fresh(), countryIso: iso, years: year ? [year] : [] });
    },
    /** Visited ↔ not visited. Turning off removes every row of that country. */
    toggleVisited(iso: string, year?: string) {
      checkIso(iso);
      const rows = world.visited().filter((r) => r.countryIso === iso);
      if (!rows.length) return world.markVisited(iso, year);
      const ts = w.stamp();
      w.batch((put) => {
        for (const row of rows) put('visited_countries', { ...row, deletedAt: ts, updatedAt: ts });
      });
    },
    /** Adds a year to a country (marking it visited if needed), never turning it off. */
    addVisitYear(iso: string, year: string) {
      checkIso(iso);
      const rows = world.visited().filter((r) => r.countryIso === iso);
      const first = rows[0];
      if (!first) return world.markVisited(iso, year);
      if (rows.some((r) => r.years.includes(year))) return;
      w.put('visited_countries', { ...first, years: [...first.years, year], updatedAt: w.stamp() });
    },
    /** Several countries at once (onboarding, trip form). */
    markManyVisited(isos: string[], year?: string) {
      const map = world.visitedMap();
      const missing = [...new Set(isos)].filter((iso) => !map[iso]);
      for (const iso of missing) checkIso(iso);
      if (!missing.length) return;
      w.batch((put) => {
        for (const iso of missing) {
          put('visited_countries', { ...w.fresh(), countryIso: iso, years: year ? [year] : [] });
        }
      });
    },

    wishes(): WishDestination[] {
      return db
        .select()
        .from(wishDestinations)
        .where(isNull(wishDestinations.deletedAt))
        .orderBy(asc(wishDestinations.createdAt))
        .all();
    },
    addWish(input: {
      name: string;
      countryIso?: string | null;
      flag?: string;
      note?: string;
      tint?: string;
      companions?: Companion[];
    }): WishDestination {
      return w.put('wish_destinations', {
        ...w.fresh(),
        name: requiredText(input.name, 120, 'name'),
        countryIso: checkIso(input.countryIso),
        flag: input.flag ?? '',
        note: input.note ?? '',
        tint: input.tint ?? '',
        companions: input.companions ?? [],
        userId: me(),
      });
    },
    updateWish(id: string, patch: Editable<WishDestination>): WishDestination {
      const next = { ...w.getOrThrow('wish_destinations', id), ...patch, updatedAt: w.stamp() };
      next.name = requiredText(next.name, 120, 'name');
      checkIso(next.countryIso);
      return w.put('wish_destinations', next);
    },
    removeWish(id: string) {
      const ts = w.stamp();
      w.put('wish_destinations', {
        ...w.getOrThrow('wish_destinations', id),
        deletedAt: ts,
        updatedAt: ts,
      });
    },
    /** "Quero ir" on a country: adds it, or removes every wish for it. */
    toggleWishCountry(iso: string, name: string, flag = '', tint = '') {
      // Only my own wishes: a shared one (someone else's plan) is not my toggle.
      const rows = world
        .wishes()
        .filter((r) => r.countryIso === iso && (r.userId == null || r.userId === me()));
      if (!rows.length) return world.addWish({ name, countryIso: iso, flag, tint });
      const ts = w.stamp();
      w.batch((put) => {
        for (const row of rows) put('wish_destinations', { ...row, deletedAt: ts, updatedAt: ts });
      });
    },
  };

  const tripsRepo = {
    list(): TripRow[] {
      return db
        .select()
        .from(trips)
        .where(isNull(trips.deletedAt))
        .orderBy(desc(trips.createdAt))
        .all();
    },
    get: (id: string) => w.get('trips', id),
    create(input: Editable<TripRow> & { title: string }): TripRow {
      return w.put('trips', {
        place: '',
        country: '',
        countryIso: null,
        flag: '',
        period: '',
        year: '',
        days: 1,
        photos: 0,
        places: 0,
        companions: [],
        people: '',
        total: '',
        tint: '',
        details: null,
        ...input,
        userId: me(),
        ...w.fresh(),
        title: requiredText(input.title, 120, 'title'),
      });
    },
    update(id: string, patch: Editable<TripRow>): TripRow {
      const next = { ...w.getOrThrow('trips', id), ...patch, updatedAt: w.stamp() };
      next.title = requiredText(next.title, 120, 'title');
      checkIso(next.countryIso);
      return w.put('trips', next);
    },
    remove(id: string) {
      const ts = w.stamp();
      w.put('trips', { ...w.getOrThrow('trips', id), deletedAt: ts, updatedAt: ts });
    },
    /** Newest first. */
    expenses(tripId: string): TripExpenseRow[] {
      return db
        .select()
        .from(tripExpenses)
        .where(and(eq(tripExpenses.tripId, tripId), isNull(tripExpenses.deletedAt)))
        .orderBy(desc(tripExpenses.createdAt))
        .all();
    },
    addExpense(
      tripId: string,
      input: Editable<TripExpenseRow> & { name: string; amount: number },
    ): TripExpenseRow {
      w.getOrThrow('trips', tripId);
      if (!(input.amount >= 0)) throw new ValidationError('amount');
      return w.put('trip_expenses', {
        category: '',
        icon: '',
        meta: '',
        amountLabel: '',
        split: [],
        receipt: false,
        ...input,
        userId: me(),
        ...w.fresh(),
        tripId,
        name: requiredText(input.name, 120, 'name'),
      });
    },
  };

  const planning = {
    itineraries(): ItineraryRow[] {
      return db
        .select()
        .from(itineraries)
        .where(isNull(itineraries.deletedAt))
        .orderBy(desc(itineraries.createdAt))
        .all();
    },
    get: (id: string) => w.get('itineraries', id),
    create(input: Editable<ItineraryRow> & { title: string }): ItineraryRow {
      return w.put('itineraries', {
        place: '',
        flag: '',
        dates: '',
        status: '',
        suggestionKey: 'generic',
        days: [],
        sourceRecommendationId: null,
        ...input,
        ...w.fresh(),
        title: requiredText(input.title, 120, 'title'),
      });
    },
    update(id: string, patch: Editable<ItineraryRow>): ItineraryRow {
      const next = { ...w.getOrThrow('itineraries', id), ...patch, updatedAt: w.stamp() };
      next.title = requiredText(next.title, 120, 'title');
      return w.put('itineraries', next);
    },
    remove(id: string) {
      const ts = w.stamp();
      w.put('itineraries', { ...w.getOrThrow('itineraries', id), deletedAt: ts, updatedAt: ts });
    },

    /** The newest travel-mode session (active or not). */
    currentSession(): LiveSession | undefined {
      return db
        .select()
        .from(liveSessions)
        .where(isNull(liveSessions.deletedAt))
        .orderBy(desc(liveSessions.startedAt), desc(liveSessions.createdAt))
        .get();
    },
    /** Resumes the current session if it is for this itinerary, else starts fresh. */
    startLive(itineraryId: string): LiveSession {
      w.getOrThrow('itineraries', itineraryId);
      const current = planning.currentSession();
      if (current?.itineraryId === itineraryId) {
        return w.put('live_sessions', { ...current, active: true, updatedAt: w.stamp() });
      }
      const fresh = w.fresh();
      return w.batch((put) => {
        if (current?.active) {
          put('live_sessions', { ...current, active: false, updatedAt: fresh.updatedAt });
        }
        return put('live_sessions', {
          ...fresh,
          itineraryId,
          active: true,
          day: 1,
          done: {},
          spent: 0,
          startedAt: fresh.createdAt,
        });
      });
    },
    updateSession(patch: Partial<Pick<LiveSession, 'active' | 'day' | 'done'>>) {
      const current = planning.currentSession();
      if (!current) throw new Error('No travel-mode session');
      if (patch.day !== undefined && patch.day < 1) throw new ValidationError('day');
      return w.put('live_sessions', { ...current, ...patch, updatedAt: w.stamp() });
    },
    /** Newest first. */
    logs(sessionId: string): LiveLog[] {
      return db
        .select()
        .from(liveLogs)
        .where(and(eq(liveLogs.sessionId, sessionId), isNull(liveLogs.deletedAt)))
        .orderBy(desc(liveLogs.createdAt))
        .all();
    },
    /** Adds an entry to the current session; `amount` also adds to what was spent. */
    addLog(entry: Pick<LiveLog, 'type' | 'text'> & Editable<LiveLog>): LiveLog {
      const session = planning.currentSession();
      if (!session) throw new Error('No travel-mode session');
      if (entry.text.length > 500) throw new ValidationError('text');
      const fresh = w.fresh();
      const amount = entry.amount ?? 0;
      return w.batch((put) => {
        if (amount) {
          put('live_sessions', {
            ...session,
            spent: session.spent + amount,
            updatedAt: fresh.updatedAt,
          });
        }
        return put('live_logs', {
          detail: null,
          photo: null,
          time: '',
          author: 'me',
          ...entry,
          ...fresh,
          amount,
          sessionId: session.id,
        });
      });
    },
  };

  const saved = {
    items(): SavedItemRow[] {
      return db
        .select()
        .from(savedItems)
        .where(isNull(savedItems.deletedAt))
        .orderBy(desc(savedItems.createdAt))
        .all();
    },
    isSaved: (refId: string) => saved.items().some((i) => i.refId === refId),
    /** Saves a catalog item, or unsaves it and drops it from every collection (03_FLOWS → F8). */
    toggle(item: Editable<SavedItemRow> & { refId: string }) {
      const rows = saved.items().filter((i) => i.refId === item.refId);
      if (!rows.length) {
        return w.put('saved_items', {
          name: '',
          category: '',
          city: '',
          flag: '',
          meta: '',
          rating: '',
          ...item,
          ...w.fresh(),
          refId: requiredText(item.refId, 120, 'refId'),
        });
      }
      const ts = w.stamp();
      w.batch((put) => {
        for (const row of rows) put('saved_items', { ...row, deletedAt: ts, updatedAt: ts });
        for (const c of saved.collections()) {
          if (c.itemIds.includes(item.refId)) {
            put('collections', {
              ...c,
              itemIds: c.itemIds.filter((id) => id !== item.refId),
              updatedAt: ts,
            });
          }
        }
      });
    },
    collections(): CollectionRow[] {
      return db
        .select()
        .from(collections)
        .where(isNull(collections.deletedAt))
        .orderBy(asc(collections.createdAt))
        .all();
    },
    createCollection(name: string, firstRefId?: string): CollectionRow {
      return w.put('collections', {
        ...w.fresh(),
        name: requiredText(name, 60, 'name'),
        itemIds: firstRefId ? [firstRefId] : [],
      });
    },
    toggleInCollection(collectionId: string, refId: string): CollectionRow {
      const c = w.getOrThrow('collections', collectionId);
      const itemIds = c.itemIds.includes(refId)
        ? c.itemIds.filter((id) => id !== refId)
        : [...c.itemIds, refId];
      return w.put('collections', { ...c, itemIds, updatedAt: w.stamp() });
    },
  };

  const catalogRepo = {
    /** Every visible catalog row, grouped order: kind, then sort. */
    rows(): CatalogRow[] {
      return db
        .select()
        .from(catalog)
        .where(isNull(catalog.deletedAt))
        .orderBy(asc(catalog.kind), asc(catalog.sort))
        .all();
    },
  };

  return {
    profile,
    world,
    trips: tripsRepo,
    planning,
    saved,
    catalog: catalogRepo,
    ...createSocialRepositories(db, w, me),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
