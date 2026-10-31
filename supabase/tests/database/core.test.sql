begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana.ribeiro@example.com', '{"name": "Ana Ribeiro"}'),
  ('22222222-2222-2222-2222-222222222222', 'bia@example.com', '{}');

-- Sign-up creates the profile.
select is(
  (select name || '|' || username from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Ana Ribeiro|ana.ribeiro',
  'new users get a profile with name and username'
);

-- Every per-user table has RLS on.
select is(
  (select count(*)::int from pg_tables
   where schemaname = 'public' and not rowsecurity),
  0,
  'every public table has RLS enabled'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111"}';

-- Ana writes one row in each table (user_id comes from auth.uid()).
insert into public.visited_countries (id, country_iso, years)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '076', '["2024"]');
insert into public.wish_destinations (id, name, country_iso)
  values ('aaaaaaaa-0000-0000-0000-000000000002', 'Japão', '392');
insert into public.trips (id, title) values ('aaaaaaaa-0000-0000-0000-000000000003', 'Kyoto');
insert into public.trip_expenses (id, trip_id, name, amount)
  values ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000003', 'Ryokan', 820);
insert into public.itineraries (id, title) values ('aaaaaaaa-0000-0000-0000-000000000005', 'Peru');
insert into public.live_sessions (id, itinerary_id)
  values ('aaaaaaaa-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000005');
insert into public.live_logs (id, session_id, type, text)
  values ('aaaaaaaa-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000006', 'note', 'oi');
insert into public.saved_items (id, ref_id, name) values ('aaaaaaaa-0000-0000-0000-000000000008', 's1', 'Belém');
insert into public.collections (id, name) values ('aaaaaaaa-0000-0000-0000-000000000009', 'Lisboa');

select is(
  (select user_id from public.trips where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaults to the caller'
);

select isnt(
  (select updated_at from public.trips where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  null,
  'updated_at is stamped by the server'
);

select throws_ok(
  $$ insert into public.trips (id, title, user_id)
     values ('aaaaaaaa-0000-0000-0000-000000000010', 'spoof', '22222222-2222-2222-2222-222222222222') $$,
  '42501', null,
  'cannot create rows for someone else'
);

select throws_ok(
  $$ insert into public.visited_countries (id, country_iso) values ('aaaaaaaa-0000-0000-0000-000000000011', 'BR') $$,
  '23514', null,
  'country_iso must be ISO 3166 numeric'
);

-- Ana can update her profile preferences.
update public.profiles set currency = 'EUR' where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select currency from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'EUR',
  'owner can update her profile'
);

-- Bia sees and changes nothing of Ana's.
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222"}';

select is_empty($$ select 1 from public.visited_countries $$, 'visited_countries: other users see nothing');
select is_empty($$ select 1 from public.wish_destinations $$, 'wish_destinations: other users see nothing');
select is_empty($$ select 1 from public.trips $$, 'trips: other users see nothing');
select is_empty($$ select 1 from public.trip_expenses $$, 'trip_expenses: other users see nothing');
select is_empty($$ select 1 from public.itineraries $$, 'itineraries: other users see nothing');
select is_empty($$ select 1 from public.live_sessions $$, 'live_sessions: other users see nothing');
select is_empty($$ select 1 from public.live_logs $$, 'live_logs: other users see nothing');
select is_empty($$ select 1 from public.saved_items $$, 'saved_items: other users see nothing');
select is_empty($$ select 1 from public.collections $$, 'collections: other users see nothing');
select is(
  (select count(*)::int from public.profiles),
  1,
  'profiles: only your own'
);

-- Bia cannot attach children to Ana's trip, even with her own user_id.
select throws_ok(
  $$ insert into public.trip_expenses (id, trip_id, name)
     values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'x') $$,
  '42501', null,
  'cannot add an expense to someone else''s trip'
);

update public.trips set title = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000003';
delete from public.trips where id = 'aaaaaaaa-0000-0000-0000-000000000003';

-- Catalog: readable by any signed-in user, writable by nobody.
reset role;
insert into public.catalog (id, kind, key, data) values ('country:076', 'country', '076', '{"name": "Brasil"}');
set local role authenticated;

select is(
  (select data ->> 'name' from public.catalog where id = 'country:076'),
  'Brasil',
  'signed-in users read the catalog'
);

select throws_ok(
  $$ insert into public.catalog (id, kind, key, data) values ('country:999', 'country', '999', '{}') $$,
  '42501', null,
  'users cannot write the catalog'
);

-- Back to Ana: her trip is intact, then she deletes her account.
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111"}';

select is(
  (select title from public.trips where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'Kyoto',
  'other users cannot update or hard delete'
);

select public.delete_my_account();
reset role;

select is_empty(
  $$ select 1 from public.trips where user_id = '11111111-1111-1111-1111-111111111111'
     union all select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  'deleting the account removes all of the user''s data'
);

select * from finish();
rollback;
