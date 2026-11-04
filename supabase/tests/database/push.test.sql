begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Ana's phone speaks Portuguese, Bia's English. Bia invites Ana to a trip.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', '{"name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', 'bia@example.com', '{"name": "Bia"}');
insert into public.trips (id, user_id, title, place)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Lisboa', 'Lisboa');
insert into public.devices (id, user_id, name, platform, push_token, language) values
  ('dddddddd-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'iPhone', 'ios',
   'ExponentPushToken[ana]', 'pt-BR'),
  ('dddddddd-0000-0000-0000-00000000000b', '22222222-2222-2222-2222-222222222222', 'Pixel', 'android',
   'ExponentPushToken[bia]', 'en');

-- The messages of the last request queued for Expo.
create function pg_temp.pushed() returns jsonb language sql as $$
  select convert_from(body, 'utf8')::jsonb from net.http_request_queue order by id desc limit 1;
$$;
create function pg_temp.queued() returns integer language sql as $$
  select count(*)::int from net.http_request_queue;
$$;
create function pg_temp.notify(uid text, type text, actor text, etype text, eid text, data jsonb)
returns void language sql as $$
  select public.notify(uid::uuid, type, actor::uuid, etype, eid::uuid, data);
$$;

-- ── What goes out ───────────────────────────────────────────────────────────
select pg_temp.notify('11111111-1111-1111-1111-111111111111', 'invite',
  '22222222-2222-2222-2222-222222222222', 'trip', 'aaaaaaaa-0000-0000-0000-000000000001', '{}');
select is(pg_temp.queued(), 1, 'a new notification queues one push request');
select is(
  (select url from net.http_request_queue order by id desc limit 1),
  'https://exp.host/--/api/v2/push/send', '… to Expo');
select is(pg_temp.pushed() -> 0 ->> 'to', 'ExponentPushToken[ana]', 'to the recipient''s phone');
select is(pg_temp.pushed() -> 0 ->> 'body', 'Bia convidou você pra a viagem “Lisboa”.',
  'with the in-app copy, in the phone''s language');
select is((pg_temp.pushed() -> 0 ->> 'badge')::int, 1, 'the badge is the unread count');
select is(pg_temp.pushed() -> 0 -> 'data' ->> 'type', 'invite', 'the app gets the row to open it');
select is((select tokens from public.push_log), array['ExponentPushToken[ana]'],
  'the request is logged for cleanup');

select pg_temp.notify('22222222-2222-2222-2222-222222222222', 'follow',
  '11111111-1111-1111-1111-111111111111', null, null, '{}');
select is(pg_temp.pushed() -> 0 ->> 'body', 'Ana started following you.', 'English phone, English copy');

select pg_temp.notify('11111111-1111-1111-1111-111111111111', 'community', null, 'post',
  'aaaaaaaa-0000-0000-0000-000000000002', '{"count": 3}');
select is(pg_temp.pushed() -> 0 ->> 'body', '3 viajantes confirmaram sua dica.', 'plurals');
select is((pg_temp.pushed() -> 0 ->> 'badge')::int, 2, 'the badge grows');

select pg_temp.notify('11111111-1111-1111-1111-111111111111', 'reminder', null, 'booking',
  'aaaaaaaa-0000-0000-0000-000000000003', '{"days": 1, "tour": "Veleiro", "tour_id": "t-veleiro"}');
select is(pg_temp.pushed() -> 0 ->> 'body', 'Amanhã tem Veleiro. Bom passeio!', 'tour reminders');

-- ── Who does not get it ─────────────────────────────────────────────────────
update public.profiles set notification_prefs = notification_prefs || '{"community": false}'
  where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.notify('11111111-1111-1111-1111-111111111111', 'follow',
  '22222222-2222-2222-2222-222222222222', null, null, '{}');
select is(pg_temp.queued(), 4, 'Configurações › Comunidade off: no push for follows');
select pg_temp.notify('11111111-1111-1111-1111-111111111111', 'reminder', null, 'booking',
  'aaaaaaaa-0000-0000-0000-000000000004', '{"days": 1, "tour": "Veleiro"}');
select is(pg_temp.queued(), 5, '… tour reminders still go out');
select is(
  (select count(*)::int from public.notifications where user_id = '11111111-1111-1111-1111-111111111111'), 5,
  'the in-app list keeps everything');

update public.devices set session_id = gen_random_uuid() where id = 'dddddddd-0000-0000-0000-00000000000b';
select pg_temp.notify('22222222-2222-2222-2222-222222222222', 'comment',
  '11111111-1111-1111-1111-111111111111', 'post', 'aaaaaaaa-0000-0000-0000-000000000002', '{}');
select is(pg_temp.queued(), 5, 'signed-out devices (auth session gone) get nothing');

-- ── Tokens ──────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222"}', true);
select throws_ok(
  $$ update public.devices set push_token = 'not-a-token' $$,
  '23514', null, 'only Expo push tokens');
select is_empty($$ select 1 from public.push_templates union all select 1 from public.push_log $$,
  'push copy and log are server only');
-- Bia signs in on Ana's phone: the token moves to Bia's account.
insert into public.devices (id, name, platform, push_token, language)
  values ('dddddddd-0000-0000-0000-00000000000c', 'iPhone', 'ios', 'ExponentPushToken[ana]', 'en');
reset role;
select is(
  (select push_token from public.devices where id = 'dddddddd-0000-0000-0000-00000000000a'), null,
  'one phone, one account: the previous account loses the token');

-- Expo answered the first request: Ana's phone uninstalled the app.
insert into net._http_response (id, status_code, content)
  select request_id, 200,
         '{"data": [{"status": "error", "details": {"error": "DeviceNotRegistered"}}]}'
  from public.push_log order by created_at, request_id limit 1;
update public.devices set push_token = 'ExponentPushToken[ana]' where id = 'dddddddd-0000-0000-0000-00000000000c';
select is(public.push_cleanup(), 1, 'cleanup forgets unregistered tokens');
select is(
  (select count(*)::int from public.devices where push_token = 'ExponentPushToken[ana]'), 0,
  '… so nothing is sent to them again');

select * from finish();
rollback;
