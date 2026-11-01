begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

-- Ana and Bia book; the tour and its schedule are set up by the team.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', '{"name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', 'bia@example.com', '{"name": "Bia"}');

insert into public.catalog (id, kind, key, data) values
  ('passeios:t-veleiro', 'passeios', 't-veleiro', '{"name": "Veleiro", "price": 45, "cur": "€"}');
insert into public.tour_schedules (tour_id, capacity, days_ahead) values ('t-veleiro', 4, 3);

create function pg_temp.as_user(uid text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'aal', aal)::text, true);
$$;

-- ── Dates ───────────────────────────────────────────────────────────────────
select is(public.open_tour_slots(), 3, 'the schedule opens the next days_ahead dates');
select is(public.open_tour_slots(), 0, 'opening again is a no-op');
select is(
  (select min(date) from public.tour_slots where tour_id = 't-veleiro'), current_date + 1,
  'dates start tomorrow');
insert into public.tour_slots (id, tour_id, date, capacity)
  values ('cccccccc-0000-0000-0000-000000000000', 't-veleiro', current_date, 4);

create temp table s as
  select (select id from public.tour_slots where tour_id = 't-veleiro' and date = current_date + 1) as d1,
         (select id from public.tour_slots where tour_id = 't-veleiro' and date = current_date + 2) as d2;
grant select on s to authenticated;

set local role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');

select is((select count(*)::int from public.tour_slots where tour_id = 't-veleiro'), 4,
  'everyone signed in sees the dates');
-- No update policy: the update silently matches no row.
select is_empty($$ update public.tour_slots set booked = 4 returning 1 $$, 'the app cannot edit dates');
select is_empty($$ select 1 from public.tour_schedules $$, 'schedules are server only');

-- ── Booking ─────────────────────────────────────────────────────────────────
select throws_ok(
  $$ insert into public.bookings (id, user_id, tour_id, slot_id, date, people, total, currency)
     select 'dddddddd-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111',
            't-veleiro', d1, current_date + 1, 1, 0, '€' from s $$,
  '42501', null, 'bookings are only created by book_tour');

select is(
  (select total from public.book_tour('dddddddd-0000-0000-0000-000000000001', (select d1 from s), 3)),
  135.00::numeric, 'book_tour prices it from the catalog');
select is((select booked from public.tour_slots where id = (select d1 from s)), 3, 'seats are held');
select is((select status from public.bookings), 'confirmed', 'the owner sees the booking');
select is(
  (select people from public.book_tour('dddddddd-0000-0000-0000-000000000001', (select d1 from s), 3)),
  3, 'retrying the same id returns the same booking');
select is((select booked from public.tour_slots where id = (select d1 from s)), 3, '… without taking more seats');
select throws_ok(
  $$ select public.book_tour('dddddddd-0000-0000-0000-000000000002', (select d2 from s), 1) $$,
  'P0001', 'already_booked', 'one active booking per tour');
select throws_ok(
  $$ select public.book_tour('dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000000', 1) $$,
  'P0001', 'closed', 'today''s date is closed');

select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select is_empty($$ select 1 from public.bookings $$, 'other people''s bookings are private');
select throws_ok(
  $$ select public.book_tour('dddddddd-0000-0000-0000-000000000004', (select d1 from s), 2) $$,
  'P0001', 'sold_out', 'cannot book more seats than are left');
select throws_ok(
  $$ select public.cancel_booking('dddddddd-0000-0000-0000-000000000001') $$,
  'P0002', null, 'cannot cancel someone else''s booking');
select is(
  (select people from public.book_tour('dddddddd-0000-0000-0000-000000000005', (select d1 from s), 1)),
  1, 'the last seat can be booked');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select is(
  (select status from public.cancel_booking('dddddddd-0000-0000-0000-000000000001')), 'cancelled',
  'the owner cancels');
select is((select booked from public.tour_slots where id = (select d1 from s)), 1, 'cancelling frees the seats');

-- ── Reminders (cron) ────────────────────────────────────────────────────────
reset role;
select is(public.booking_reminders(), 1, 'tomorrow''s confirmed bookings get a reminder');
select is(public.booking_reminders(), 0, 'only once');
select is(
  (select data ->> 'tour' from public.notifications
   where user_id = '22222222-2222-2222-2222-222222222222' and type = 'reminder'),
  'Veleiro', 'the reminder names the tour');

-- ── Businesses (Anuncie) ────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.businesses (id, name, type, city, email, status)
  values ('eeeeeeee-0000-0000-0000-000000000001', 'Tejo Sailing', 'guide', 'Lisboa', 'ola@tejo.pt', 'approved');
select is((select status from public.businesses), 'review', 'sign-ups always start in review');
update public.businesses set status = 'approved', city = 'Lisboa e Cascais';
select is((select status || ' · ' || city from public.businesses), 'review · Lisboa e Cascais',
  'the owner edits the sign-up but not its status');

reset role;
update public.businesses set status = 'approved' where id = 'eeeeeeee-0000-0000-0000-000000000001';
select is(
  (select data ->> 'status' from public.notifications
   where user_id = '11111111-1111-1111-1111-111111111111' and type = 'business'),
  'approved', 'the owner hears about the review');

select * from finish();
rollback;
