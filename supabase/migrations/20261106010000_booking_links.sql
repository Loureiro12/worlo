-- Worlo QA round 1: tours are booked on the supplier's site.
--
-- "Reservar" opens the booking page each supplier gives us; Worlo does not
-- take bookings itself any more (the app stopped using tour_slots/bookings;
-- the tables stay for the history already recorded).
--   * catalog: tours carry `bookingUrl` in their data (set by the team);
--   * businesses: the Anuncie sign-up asks for that page.

alter table public.businesses
  add column booking_url text
    check (booking_url is null or (booking_url ~ '^https?://\S+$' and char_length(booking_url) <= 500));
