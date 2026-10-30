-- Sync conventions (see docs/offline-first.md):
--   * id         uuid generated on the device, so rows can be created offline
--   * updated_at set by the server on every write; used as the pull cursor
--   * deleted_at soft delete, so deletions reach other devices
--   * user_id    defaults to auth.uid(); RLS scopes every row to its owner

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- clock_timestamp() (not now()) so rows written in one transaction still get
  -- distinct, increasing values.
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create table public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 500),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create index tasks_sync_idx on public.tasks (user_id, updated_at, id);

create trigger tasks_set_updated_at
  before insert or update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy "tasks: owner can read"
  on public.tasks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "tasks: owner can insert"
  on public.tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "tasks: owner can update"
  on public.tasks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy: clients soft delete via deleted_at.
