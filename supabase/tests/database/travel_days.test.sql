begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'ana@example.com');
insert into public.itineraries (id, user_id, title)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Peru');
insert into public.live_sessions (id, user_id, itinerary_id)
  values ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
          'aaaaaaaa-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

select lives_ok(
  $$ insert into public.live_logs (id, session_id, type, text, day)
     values (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000001', 'activity', 'Almoço no mercado', 2) $$,
  'an activity is logged with its day');
select is(
  (select day from public.live_logs where type = 'activity'), 2, '… and the day is kept');
select lives_ok(
  $$ insert into public.live_logs (id, session_id, type, text)
     values (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000001', 'checkin', 'old app') $$,
  'entries from older apps (check-in, no day) still sync');
select throws_ok(
  $$ insert into public.live_logs (id, session_id, type, text, day)
     values (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000001', 'note', 'x', 0) $$,
  '23514', null, 'days start at 1');

select * from finish();
rollback;
