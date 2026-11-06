begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'ana@example.com');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

insert into public.wish_destinations (id, name)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Japão');
select lives_ok(
  $$ update public.wish_destinations
       set cover_url = 'https://x.supabase.co/storage/v1/object/public/post-photos/11111111-1111-1111-1111-111111111111/a.jpg'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'a wish takes a cover photo');
select lives_ok(
  $$ update public.wish_destinations set cover_url = null
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '… or none (solid color)');
select throws_ok(
  $$ update public.wish_destinations set cover_url = 'file:///private/x.jpg'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'only web URLs (uploaded photos)');

select * from finish();
rollback;
