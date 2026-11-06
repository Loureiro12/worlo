begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'ana@example.com');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

select lives_ok(
  $$ insert into public.businesses (id, name, type, city, email, booking_url)
     values (gen_random_uuid(), 'Barcos do Tejo', 'agency', 'Lisboa', 'a@b.pt', 'https://barcos.pt/reservar') $$,
  'a supplier sends the page where its tours are booked');
select lives_ok(
  $$ insert into public.businesses (id, name, type, city, email)
     values (gen_random_uuid(), 'Guia Ana', 'guide', 'Lisboa', 'g@b.pt') $$,
  '… or none yet');
select throws_ok(
  $$ insert into public.businesses (id, name, type, city, email, booking_url)
     values (gen_random_uuid(), 'X', 'guide', 'Lisboa', 'x@b.pt', 'javascript:alert(1)') $$,
  '23514', null, 'only web links are accepted');

select * from finish();
rollback;
