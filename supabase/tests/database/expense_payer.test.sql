begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'ana@example.com');
insert into public.trips (id, user_id, title)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Lisboa');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

select lives_ok(
  $$ insert into public.trip_expenses (id, trip_id, name, amount, paid_by, split)
     values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'Jantar', 120,
             'name:Bia', '["11111111-1111-1111-1111-111111111111", "name:Bia"]') $$,
  'an expense says who paid and who took part');
select lives_ok(
  $$ insert into public.trip_expenses (id, trip_id, name, amount)
     values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'Táxi', 30) $$,
  'older apps (no payer) still sync');
select throws_ok(
  $$ insert into public.trip_expenses (id, trip_id, name, amount, paid_by)
     values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'X', 1, '') $$,
  '23514', null, 'an empty payer is not a payer');

select * from finish();
rollback;
