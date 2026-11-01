import type { RemoteRow } from '@worlo/sync';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { LocalDatabase } from './database';
import { type BusinessType, bookings, businesses, tourSlots } from './schema';
import { syncedTables } from './synced-tables';
import { requiredText, ValidationError, type Writer } from './writer';

const EMAIL = /.+@.+\..+/;

/**
 * Phase 3 repositories: tour dates, bookings and Anuncie sign-ups.
 * Dates and bookings are pull only (the server checks capacity in `book_tour`);
 * the app stores the row the RPC returns with `applyBooking`, without the outbox.
 */
export function createCommerceRepositories(db: LocalDatabase, w: Writer, me: () => string | null) {
  const requireMe = () => {
    const id = me();
    if (!id) throw new Error('Not signed in');
    return id;
  };

  const tours = {
    /** Open dates of a tour after `today` (YYYY-MM-DD), soonest first. */
    slots: (tourId: string, today: string) =>
      db
        .select()
        .from(tourSlots)
        .where(and(eq(tourSlots.tourId, tourId), isNull(tourSlots.deletedAt)))
        .orderBy(asc(tourSlots.date))
        .all()
        .filter((s) => s.date > today),
    slot: (id: string) => db.select().from(tourSlots).where(eq(tourSlots.id, id)).get(),
  };

  const bookingsRepo = {
    /** My confirmed bookings, soonest first. */
    list: () =>
      db
        .select()
        .from(bookings)
        .where(and(eq(bookings.status, 'confirmed'), isNull(bookings.deletedAt)))
        .orderBy(asc(bookings.date))
        .all()
        .filter((b) => b.userId === me()),
    get: (id: string) => db.select().from(bookings).where(eq(bookings.id, id)).get(),
    /** The active booking of a tour (one per tour). */
    forTour: (tourId: string) => bookingsRepo.list().find((b) => b.tourId === tourId),
    /** Stores a row returned by `book_tour` / `cancel_booking`, like a pull would. */
    applyBooking(remote: RemoteRow) {
      const row = syncedTables.bookings.toLocal(remote) as typeof bookings.$inferInsert;
      const before = bookingsRepo.get(row.id)?.status;
      // The server also moved the seats of that date; mirror it until the next pull.
      const delta =
        row.status === 'confirmed' && before !== 'confirmed'
          ? row.people
          : row.status === 'cancelled' && before === 'confirmed'
            ? -row.people
            : 0;
      db.transaction((tx) => {
        tx.insert(bookings).values(row).onConflictDoUpdate({ target: bookings.id, set: row }).run();
        const slot = tx.select().from(tourSlots).where(eq(tourSlots.id, row.slotId)).get();
        if (slot && delta) {
          tx.update(tourSlots)
            .set({ booked: Math.max(0, slot.booked + delta) })
            .where(eq(tourSlots.id, slot.id))
            .run();
        }
      });
      w.notify(['bookings', 'tour_slots']);
      return bookingsRepo.get(row.id);
    },
  };

  const businessesRepo = {
    /** My Anuncie sign-ups, newest first. */
    mine: () =>
      db
        .select()
        .from(businesses)
        .where(isNull(businesses.deletedAt))
        .orderBy(desc(businesses.createdAt))
        .all()
        .filter((b) => b.userId === me()),
    /** Anuncie › Enviar: goes out with the next sync; the team reviews it. */
    submit(input: {
      name: string;
      type: BusinessType;
      city: string;
      description?: string;
      email: string;
    }) {
      const userId = requireMe();
      const email = input.email.trim();
      if (!EMAIL.test(email)) throw new ValidationError('email');
      return w.put('businesses', {
        ...w.fresh(),
        userId,
        name: requiredText(input.name, 120, 'name'),
        type: input.type,
        city: requiredText(input.city, 120, 'city'),
        description: (input.description ?? '').trim().slice(0, 500),
        email,
        status: 'review',
      });
    },
  };

  return { tours, bookings: bookingsRepo, businesses: businessesRepo };
}
