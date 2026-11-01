import type { Booking, TourSlot } from '@worlo/db';
import type { RemoteRow } from '@worlo/sync';
import { randomUUID } from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * Passeios › datas e reservas. Dates (`tour_slots`) and my bookings are synced
 * (pull only), so the tour page shows them offline. Booking and cancelling are
 * online RPCs: the server checks the seats left and prices the booking.
 * No online payment: the traveler pays the host on the day.
 */

export type SlotView = TourSlot & { left: number; soldOut: boolean };

/** Today in UTC (YYYY-MM-DD), the server's `current_date`: only later dates can be booked. */
export const todayISO = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

export function useTourSlots(tourId: string): SlotView[] {
  return useQuery(
    () =>
      repos.tours.slots(tourId, todayISO()).map((s) => {
        const left = Math.max(0, s.capacity - s.booked);
        return { ...s, left, soldOut: left === 0 };
      }),
    [tourId],
  );
}

/** My active booking of this tour. */
export function useBooking(tourId: string): Booking | undefined {
  return useQuery(() => repos.bookings.forTour(tourId), [tourId]);
}

/** Tours with an active booking ("Reservado" on the list). */
export function useBookedTours(): ReadonlySet<string> {
  return useQuery(() => new Set(repos.bookings.list().map((b) => b.tourId)), []);
}

export type BookingFailure = 'offline' | 'soldOut' | 'alreadyBooked' | 'closed' | 'error';
export type BookingResult = { ok: true; booking: Booking } | { ok: false; reason: BookingFailure };

const REASONS: Record<string, BookingFailure> = {
  sold_out: 'soldOut',
  already_booked: 'alreadyBooked',
  closed: 'closed',
};

async function call(
  fn: 'book_tour' | 'cancel_booking',
  args: Record<string, unknown>,
  online: boolean,
): Promise<BookingResult> {
  if (!supabase || !online) return { ok: false, reason: 'offline' };
  try {
    // biome-ignore lint/suspicious/noExplicitAny: both RPCs return a bookings row
    const { data, error } = await (supabase.rpc as any)(fn, args);
    if (error || !data) return { ok: false, reason: REASONS[error?.message ?? ''] ?? 'error' };
    const booking = repos.bookings.applyBooking(data as RemoteRow);
    return booking ? { ok: true, booking } : { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

/** Reservar: holds `people` seats on that date. */
export function bookTour(slotId: string, people: number, online: boolean) {
  return call('book_tour', { p_id: randomUUID(), p_slot: slotId, p_people: people }, online);
}

/** Cancelar reserva: frees the seats (not on the day of the tour). */
export function cancelBooking(id: string, online: boolean) {
  return call('cancel_booking', { p_id: id }, online);
}
