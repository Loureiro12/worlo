-- Worlo core schema (phase 1: auth + personal data + catalog).
--
-- Sync conventions (see docs/offline-first.md):
--   * id         uuid generated on the device, so rows can be created offline
--   * updated_at set by the server on every write; used as the pull cursor
--   * deleted_at soft delete, so deletions reach other devices
--   * user_id    defaults to auth.uid(); RLS scopes every row to its owner
--
-- Checks mirror the validation in @worlo/db repositories: a row the server
-- rejects would block the device outbox.

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

-- ── Profile & preferences (one row per user, id = auth.uid()) ─────────────

create table public.profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  username text not null default '' check (char_length(username) <= 30),
  city text not null default '' check (char_length(city) <= 80),
  bio text not null default '' check (char_length(bio) <= 300),
  avatar_url text,
  currency text not null default 'BRL' check (currency in ('BRL', 'EUR', 'USD')),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  privacy text not null default 'friends' check (privacy in ('private', 'friends', 'public')),
  privacy_detail jsonb not null default '{"map": true, "trips": true, "photos": false, "search": true}',
  notification_prefs jsonb not null default '{"memories": true, "community": true, "itineraries": true, "promos": false}',
  auto_organize_photos boolean not null default true,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

-- ── Map ────────────────────────────────────────────────────────────────────

-- Toggling a country off soft deletes its row(s); readers group by country_iso,
-- so two devices marking the same country offline never conflict.
create table public.visited_countries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  country_iso text not null check (country_iso ~ '^[0-9]{3}$'),
  years jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

-- "Quero ir": a country or a free-text destination.
create table public.wish_destinations (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  country_iso text check (country_iso ~ '^[0-9]{3}$'),
  name text not null check (char_length(name) between 1 and 120),
  flag text not null default '',
  note text not null default '',
  -- Who goes along: [{ name, status: 'ok' | 'pending' }] (real invites: phase 2).
  companions jsonb not null default '[]',
  tint text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

-- ── Trips ──────────────────────────────────────────────────────────────────

create table public.trips (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  place text not null default '',
  country text not null default '',
  country_iso text check (country_iso ~ '^[0-9]{3}$'),
  flag text not null default '',
  period text not null default '',
  year text not null default '',
  days integer not null default 1 check (days >= 0),
  photos integer not null default 0 check (photos >= 0),
  places integer not null default 0 check (places >= 0),
  companions jsonb not null default '[]',
  people text not null default '',
  total text not null default '',
  tint text not null default '',
  -- Places, diary, timeline and money summary (shape: TripDetails in the app).
  details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create table public.trip_expenses (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text not null default '',
  icon text not null default '',
  meta text not null default '',
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  amount_label text not null default '',
  split jsonb not null default '[]',
  receipt boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

-- ── Planning ───────────────────────────────────────────────────────────────

create table public.itineraries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  place text not null default '',
  flag text not null default '',
  dates text not null default '',
  status text not null default '',
  suggestion_key text not null default 'generic',
  -- [{ label, items: Stop[] }]: edited as a whole (last write wins per itinerary).
  days jsonb not null default '[]',
  source_recommendation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

-- Travel mode. The newest session is the current one; `active` = mode on.
create table public.live_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  itinerary_id uuid not null references public.itineraries (id) on delete cascade,
  active boolean not null default true,
  day integer not null default 1 check (day >= 1),
  -- "dayIndex-stopIndex" → done.
  done jsonb not null default '{}',
  spent numeric(12, 2) not null default 0,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

-- Append-only, so entries logged offline on two phones never overwrite each other.
create table public.live_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  type text not null check (type in ('checkin', 'photo', 'expense', 'note', 'done')),
  text text not null check (char_length(text) <= 500),
  detail text,
  photo text,
  time text not null default '',
  author text not null default 'me',
  amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

-- ── Saved ──────────────────────────────────────────────────────────────────

-- Snapshot of the catalog item, so the list renders without the catalog.
create table public.saved_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ref_id text not null check (char_length(ref_id) between 1 and 120),
  name text not null default '',
  category text not null default '',
  city text not null default '',
  flag text not null default '',
  meta text not null default '',
  rating text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create table public.collections (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- saved_items.ref_id values, in order.
  item_ids jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

-- ── Shared plumbing for every per-user table ────────────────────────────────

do $$
declare
  t text;
  owner_col text;
begin
  foreach t in array array[
    'profiles', 'visited_countries', 'wish_destinations', 'trips', 'trip_expenses',
    'itineraries', 'live_sessions', 'live_logs', 'saved_items', 'collections'
  ] loop
    owner_col := case when t = 'profiles' then 'id' else 'user_id' end;

    execute format('create index %I on public.%I (%I, updated_at, id)', t || '_sync_idx', t, owner_col);
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = %I)',
      t || ': owner can read', t, owner_col);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = %I)',
      t || ': owner can insert', t, owner_col);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)',
      t || ': owner can update', t, owner_col, owner_col);
    -- No delete policy: clients soft delete via deleted_at.
  end loop;
end;
$$;

-- Children must belong to a parent the caller owns (ids are client generated,
-- and an upsert may take the update path).
do $$
declare
  child record;
  cmd text;
begin
  for child in
    select * from (values
      ('trip_expenses', 'trip_id', 'trips'),
      ('live_sessions', 'itinerary_id', 'itineraries'),
      ('live_logs', 'session_id', 'live_sessions')
    ) as c (tbl, fk, parent)
  loop
    foreach cmd in array array['insert', 'update'] loop
      execute format(
        'create policy %I on public.%I as restrictive for %s to authenticated
           with check (exists (select 1 from public.%I p where p.id = %I and p.user_id = (select auth.uid())))',
        child.tbl || ': parent is mine on ' || cmd, child.tbl, cmd, child.parent, child.fk);
    end loop;
  end loop;
end;
$$;

-- ── Catalog (read-only reference content) ─────────────────────────────────

-- One row per entity: id = '<kind>:<key>'. The app assembles rows by kind.
-- Edit content here (dashboard or seeds/catalog.sql); devices pull changes.
create table public.catalog (
  id text primary key,
  kind text not null,
  key text not null,
  sort integer not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  unique (kind, key)
);

create index catalog_sync_idx on public.catalog (updated_at, id);

create trigger catalog_set_updated_at
  before insert or update on public.catalog
  for each row execute function public.set_updated_at();

alter table public.catalog enable row level security;

create policy "catalog: signed-in users can read"
  on public.catalog for select to authenticated
  using (true);

-- ── Auth hooks ─────────────────────────────────────────────────────────────

-- Every new account gets a profile. Name comes from sign-up metadata (e-mail)
-- or from Apple/Google; the username starts from the e-mail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, username)
  values (
    new.id,
    left(coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      ''
    ), 80),
    left(lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_.]', '', 'g')), 30)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Settings → Excluir conta. Cascades to every table above.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
