begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bia@example.com');

select has_table('public', 'app_errors', 'error reports have a table');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

select lives_ok(
  $$ insert into public.app_errors (occurred_at, platform, app_version, context, fatal, message, stack)
     values (now(), 'ios', '1.0.0 (3)', 'render', true, 'undefined is not a function', 'at Roteiro') $$,
  'a signed-in user reports an error');
select throws_ok(
  $$ insert into public.app_errors (user_id, occurred_at, message)
     values ('22222222-2222-2222-2222-222222222222', now(), 'x') $$,
  '42501', null, '… only as themselves');
select throws_ok(
  $$ insert into public.app_errors (occurred_at, message) values (now(), repeat('x', 2001)) $$,
  '23514', null, 'messages are bounded');
select is_empty($$ select 1 from public.app_errors $$, 'reports cannot be read back through the API');

reset role;
select is(
  (select user_id::text from public.app_errors), '11111111-1111-1111-1111-111111111111',
  'the report is tied to who sent it');

set local role anon;
select throws_ok(
  $$ insert into public.app_errors (occurred_at, message) values (now(), 'x') $$,
  '42501', null, 'signed-out clients cannot write');

select * from finish();
rollback;
