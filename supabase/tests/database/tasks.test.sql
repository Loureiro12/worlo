begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bia@example.com');

-- Ana writes a task (user_id comes from auth.uid()).
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111"}';

insert into public.tasks (id, title)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana task');

select is(
  (select user_id from public.tasks where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaults to the caller'
);

select isnt(
  (select updated_at from public.tasks where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  null,
  'updated_at is stamped by the server'
);

select throws_ok(
  $$ insert into public.tasks (id, title, user_id)
     values ('aaaaaaaa-0000-0000-0000-000000000002', 'spoof', '22222222-2222-2222-2222-222222222222') $$,
  '42501',
  null,
  'cannot create tasks for someone else'
);

-- Bia cannot see or change Ana's task.
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222"}';

select is_empty(
  $$ select 1 from public.tasks $$,
  'other users see nothing'
);

update public.tasks set title = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.tasks where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- Back to Ana.
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111"}';

select is(
  (select title from public.tasks where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Ana task',
  'other users cannot update or hard delete'
);

-- Upsert (what the sync engine sends) bumps updated_at.
select pg_sleep(0.01);
insert into public.tasks (id, title, completed)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana task', true)
on conflict (id) do update set completed = excluded.completed;

select ok(
  (select completed and updated_at > created_at
   from public.tasks where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'upsert updates the row and its updated_at'
);

select throws_ok(
  $$ insert into public.tasks (id, title) values ('aaaaaaaa-0000-0000-0000-000000000003', '') $$,
  '23514',
  null,
  'empty titles are rejected'
);

select * from finish();
rollback;
