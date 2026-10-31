begin;
create extension if not exists pgtap with schema extensions;

select plan(39);

-- Ana (owner), Bia (invited), Caio (stranger).
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', '{"name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', 'bia@example.com', '{"name": "Bia"}'),
  ('33333333-3333-3333-3333-333333333333', 'caio@example.com', '{"name": "Caio"}');

create function pg_temp.as_user(uid text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'aal', aal)::text, true);
$$;

set local role authenticated;

-- ── Collaboration ──────────────────────────────────────────────────────────
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.trips (id, title) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Jeri');
insert into public.trip_expenses (id, trip_id, name, amount)
  values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Pousada', 900);

select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select is_empty($$ select 1 from public.trips $$, 'not invited: trip is invisible');
select is_empty($$ select 1 from public.people where id = '11111111-1111-1111-1111-111111111111' $$,
  'strangers do not see each other''s profile');

select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select throws_ok(
  $$ insert into public.memberships (id, user_id, entity_type, entity_id)
     values ('bbbbbbbb-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', 'trip', 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'strangers cannot invite (themselves or anyone)');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.memberships (id, user_id, entity_type, entity_id)
  values ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'trip', 'aaaaaaaa-0000-0000-0000-000000000001');
select is(
  (select invited_by from public.memberships where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid, 'invited_by defaults to the inviter');

select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select is((select title from public.trips), 'Jeri', 'pending invitee sees the trip preview');
select is_empty($$ select 1 from public.trip_expenses $$, 'pending invitee does not see expenses');
select is((select type from public.notifications), 'invite', 'invitee is notified');
select is((select name from public.people where id = '11111111-1111-1111-1111-111111111111'), 'Ana',
  'invitee sees the owner''s public profile');
select throws_ok(
  $$ insert into public.trip_expenses (id, trip_id, name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'x') $$,
  '42501', null, 'pending invitee cannot add expenses');

update public.memberships set status = 'accepted' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select is((select count(*)::int from public.trip_expenses), 1, 'accepted member sees expenses');
insert into public.trip_expenses (id, trip_id, name, amount, amount_label)
  values ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Buggy', 300, 'R$ 300');
update public.trips set title = 'Réveillon em Jeri' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select title from public.trips), 'Réveillon em Jeri', 'members edit the trip');
select throws_ok(
  $$ update public.trips set deleted_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'only the owner deletes');
select throws_ok(
  $$ update public.memberships set status = 'pending' where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  '42501', null, 'membership transitions are guarded');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select ok(exists (select 1 from public.notifications where type = 'invite_accepted'), 'owner hears the invite was accepted');
select is(
  (select data ->> 'name' from public.notifications where type = 'activity'), 'Buggy',
  'owner is notified of expenses added by members');
select is(
  (select array_agg(kind order by created_at) from public.activities),
  array['joined', 'expense'], 'trip activity is logged');

-- Upserting a notification (mark read) cannot rewrite it.
update public.notifications set read_at = now(), type = 'follow', data = '{"x": 1}' where type = 'activity';
select is(
  (select type || (data ->> 'name') from public.notifications where read_at is not null),
  'activityBuggy', 'marking read keeps the notification content');

update public.memberships set status = 'removed' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select is_empty($$ select 1 from public.trips $$, 'removed member loses access');
select is(
  (select status from public.memberships where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 'removed',
  'removed member still sees the membership (to clean the device)');

-- Invite link.
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.invite_links (token, entity_type, entity_id) values ('tok', 'trip', 'aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select is((select entity_type from public.accept_invite_link('tok')), 'trip', 'invite link resolves');
select is((select count(*)::int from public.trip_expenses), 2, 'joining by link gives full access');
select throws_ok($$ select public.accept_invite_link('nope') $$, 'P0002', null, 'unknown links fail');

-- ── Follows and people ─────────────────────────────────────────────────────
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
insert into public.follows (id, followee_id) values ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select ok(exists (select 1 from public.notifications where type = 'follow'), 'followee is notified');
select ok(exists (select 1 from public.people where id = '22222222-2222-2222-2222-222222222222'), 'followers are visible');
select is(
  (select count(*)::int from public.search_people('bi') where id = '22222222-2222-2222-2222-222222222222'), 1,
  'people search finds searchable users');

-- ── Community ──────────────────────────────────────────────────────────────
insert into public.posts (id, type, place_label, text) values
  ('dddddddd-0000-0000-0000-000000000001', 'tip', 'Lisboa', 'Elétrico 28 cedo');
insert into public.posts (id, type, place_label, text, visibility) values
  ('dddddddd-0000-0000-0000-000000000002', 'tip', 'Lisboa', 'Só amigos', 'friends');
insert into public.follows (id, followee_id) values ('cccccccc-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222');

select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select is((select count(*)::int from public.posts where id::text like 'dddddddd%'), 1,
  'friends-only posts are hidden from others');
insert into public.post_votes (post_id, value) values ('dddddddd-0000-0000-0000-000000000001', 'yes');
insert into public.comments (post_id, text) values ('dddddddd-0000-0000-0000-000000000001', 'Confirmo!');
select is(
  (select yes || '/' || no || '/' || my_vote || '/' || comments
   from public.community_feed() where id = 'dddddddd-0000-0000-0000-000000000001'),
  '1/0/yes/1', 'feed aggregates votes and comments');
select throws_ok(
  $$ insert into public.post_votes (post_id, user_id, value) values ('dddddddd-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'no') $$,
  '42501', null, 'cannot vote as someone else');

select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select is((select count(*)::int from public.community_feed() where id::text like 'dddddddd%'), 2,
  'people the author follows see friends-only posts');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select is(
  (select array_agg(type order by type) from public.notifications where entity_type = 'post'),
  array['comment', 'community'], 'author hears about comments and confirmations');

-- Traveler page respects privacy.
update public.profiles set privacy = 'private' where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select is(
  (public.traveler_profile('11111111-1111-1111-1111-111111111111') ->> 'restricted')::boolean, true,
  'private profiles hide countries and trips');

-- ── Chat ───────────────────────────────────────────────────────────────────
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select ok(public.open_direct_thread('22222222-2222-2222-2222-222222222222') is not null, 'direct thread opens');
select is(public.open_direct_thread('22222222-2222-2222-2222-222222222222'),
  (select id from public.chat_threads where kind = 'direct'), 'the same thread is reused');
insert into public.messages (id, thread_id, text)
  select 'eeeeeeee-0000-0000-0000-000000000001', id, 'Oi Bia' from public.chat_threads where kind = 'direct';
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select is((select text from public.messages), 'Oi Bia', 'the other member reads the message');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select is_empty($$ select 1 from public.messages $$, 'outsiders cannot read the thread');

-- ── Devices ────────────────────────────────────────────────────────────────
reset role;
insert into auth.sessions (id, user_id, created_at, updated_at)
  values ('ffffffff-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now(), now());
set local role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.devices (id, name, session_id) values ('ffffffff-0000-0000-0000-000000000002', 'iPad', 'ffffffff-0000-0000-0000-000000000001');
select public.revoke_device('ffffffff-0000-0000-0000-000000000002');
select isnt((select revoked_at from public.devices), null, 'device is marked revoked');
reset role;
select is_empty($$ select 1 from auth.sessions where id = 'ffffffff-0000-0000-0000-000000000001' $$,
  'its auth session is gone');

-- ── 2FA ────────────────────────────────────────────────────────────────────
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
  values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'app', 'totp', 'verified', now(), now());
set local role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', 'aal1');
select is_empty($$ select 1 from public.trips $$, 'with 2FA on, an aal1 session sees nothing');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', 'aal2');
select is((select count(*)::int from public.trips), 1, 'after the TOTP challenge (aal2) data is back');

select * from finish();
rollback;
