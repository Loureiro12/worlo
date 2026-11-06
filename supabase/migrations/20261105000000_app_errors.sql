-- Worlo: crash and error reports from the app.
--
-- The app keeps every unexpected error (render errors, fatal JS errors, sync
-- rows the server rejected) on the device and sends them here once signed in.
-- The team reads them in the dashboard; nobody reads them through the API.

create table public.app_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  platform text not null default '' check (char_length(platform) <= 20),
  app_version text not null default '' check (char_length(app_version) <= 40),
  -- Where it happened: 'render', 'global', 'sync.rejected:itineraries'…
  context text not null default '' check (char_length(context) <= 80),
  fatal boolean not null default false,
  message text not null check (char_length(message) between 1 and 2000),
  stack text not null default '' check (char_length(stack) <= 8000)
);

create index app_errors_created_idx on public.app_errors (created_at desc);

alter table public.app_errors enable row level security;

-- Write-only: a signed-in user reports their own errors; no select/update/delete.
create policy "app_errors: report own" on public.app_errors
  for insert to authenticated
  with check (user_id = (select auth.uid()));
