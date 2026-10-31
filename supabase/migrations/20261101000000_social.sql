-- Worlo phase 2: people, collaboration, notifications, community, chat,
-- photos, devices and 2FA.
--
-- Two kinds of data:
--   * synced to the device (offline first, docs/offline-first.md): people,
--     follows, memberships, activities, notifications, chat, photos, devices.
--     Visibility here depends on relationships, so whenever a relationship
--     starts (invite, follow, chat) the rows it reveals are "touched"
--     (updated_at bumped): the cursor-based pull only sees rows that changed.
--   * online only (RPCs below): the community feed, posts, comments, votes,
--     public traveler profiles and people search. Too large to sync to every
--     phone; the app caches what it has seen.

-- ── Access helpers ──────────────────────────────────────────────────────────

-- Who owns a shared entity ('trip' → trips, 'wish' → wish_destinations).
create or replace function public.owner_of(p_type text, p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'trip' then (select user_id from public.trips where id = p_id)
    when 'wish' then (select user_id from public.wish_destinations where id = p_id)
  end;
$$;

-- ── Memberships (collaboration on trips and wishes) ─────────────────────────

create table public.memberships (
  id uuid primary key,
  -- The member (not the author of the row: owners invite other people).
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('trip', 'wish')),
  entity_id uuid not null,
  role text not null default 'collaborator' check (role in ('collaborator')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'removed')),
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create index memberships_entity_idx on public.memberships (entity_type, entity_id);

create or replace function public.is_member(p_type text, p_id uuid, p_statuses text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.entity_type = p_type and m.entity_id = p_id
      and m.user_id = (select auth.uid())
      and m.status = any (p_statuses) and m.deleted_at is null
  );
$$;

-- See it (pending invitees get the preview); edit it (owner + accepted members).
create or replace function public.can_view(p_type text, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.owner_of(p_type, p_id) = (select auth.uid())
      or public.is_member(p_type, p_id, array['accepted', 'pending']);
$$;

create or replace function public.can_edit(p_type text, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.owner_of(p_type, p_id) = (select auth.uid())
      or public.is_member(p_type, p_id, array['accepted']);
$$;

-- Trips and wishes: owner or members (phase 1 was owner only).
drop policy "trips: owner can read" on public.trips;
drop policy "trips: owner can update" on public.trips;
drop policy "wish_destinations: owner can read" on public.wish_destinations;
drop policy "wish_destinations: owner can update" on public.wish_destinations;

create policy "trips: owner and members can read" on public.trips
  for select to authenticated
  using ((select auth.uid()) = user_id or public.can_view('trip', id));
create policy "trips: owner and members can update" on public.trips
  for update to authenticated
  using ((select auth.uid()) = user_id or public.can_edit('trip', id))
  with check ((select auth.uid()) = user_id or public.can_edit('trip', id));
create policy "wish_destinations: owner and members can read" on public.wish_destinations
  for select to authenticated
  using ((select auth.uid()) = user_id or public.can_view('wish', id));
create policy "wish_destinations: owner and members can update" on public.wish_destinations
  for update to authenticated
  using ((select auth.uid()) = user_id or public.can_edit('wish', id))
  with check ((select auth.uid()) = user_id or public.can_edit('wish', id));

-- The sync engine pushes with upsert, and Postgres checks the INSERT policy
-- against the proposed row even when it ends up updating. Rows already on the
-- server that the caller may edit pass here; the UPDATE policies decide.
drop policy "trips: owner can insert" on public.trips;
drop policy "wish_destinations: owner can insert" on public.wish_destinations;
drop policy "trip_expenses: owner can insert" on public.trip_expenses;

create policy "trips: owner inserts, editors upsert" on public.trips
  for insert to authenticated
  with check ((select auth.uid()) = user_id or public.can_edit('trip', id));
create policy "wish_destinations: owner inserts, editors upsert" on public.wish_destinations
  for insert to authenticated
  with check ((select auth.uid()) = user_id or public.can_edit('wish', id));

create or replace function public.expense_editable(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.trip_expenses e
                 where e.id = p_id
                   and (e.user_id = (select auth.uid())
                        or public.owner_of('trip', e.trip_id) = (select auth.uid())));
$$;

create policy "trip_expenses: author inserts, editors upsert" on public.trip_expenses
  for insert to authenticated
  with check ((select auth.uid()) = user_id or public.expense_editable(id));

-- Members edit, only the owner deletes; nobody changes the owner.
create or replace function public.guard_shared_entity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'owner cannot change' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at and old.user_id <> (select auth.uid()) then
    raise exception 'only the owner can delete' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trips_guard before update on public.trips
  for each row execute function public.guard_shared_entity();
create trigger wish_destinations_guard before update on public.wish_destinations
  for each row execute function public.guard_shared_entity();

-- Expenses: owner and accepted members (pending invitees don't see money).
drop policy "trip_expenses: owner can read" on public.trip_expenses;
drop policy "trip_expenses: owner can update" on public.trip_expenses;
drop policy "trip_expenses: parent is mine on insert" on public.trip_expenses;
drop policy "trip_expenses: parent is mine on update" on public.trip_expenses;

create policy "trip_expenses: trip editors can read" on public.trip_expenses
  for select to authenticated
  using (public.can_edit('trip', trip_id));
create policy "trip_expenses: author or trip owner can update" on public.trip_expenses
  for update to authenticated
  using ((select auth.uid()) = user_id or public.owner_of('trip', trip_id) = (select auth.uid()))
  with check ((select auth.uid()) = user_id or public.owner_of('trip', trip_id) = (select auth.uid()));
create policy "trip_expenses: trip is editable on insert" on public.trip_expenses
  as restrictive for insert to authenticated
  with check (public.can_edit('trip', trip_id));

-- Memberships: visible to whoever sees the entity, and to the member.
create policy "memberships: member and entity viewers can read" on public.memberships
  for select to authenticated
  using ((select auth.uid()) = user_id or public.can_view(entity_type, entity_id));
-- Editors invite other people (always as pending).
create policy "memberships: editors invite" on public.memberships
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and user_id <> (select auth.uid())
    and status = 'pending'
    and public.can_edit(entity_type, entity_id)
  );
-- Upsert of an existing membership by the member or the owner (answer, leave,
-- remove): see the note on upserts above.
create or replace function public.membership_updatable(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.memberships m
                 where m.id = p_id
                   and (m.user_id = (select auth.uid())
                        or public.owner_of(m.entity_type, m.entity_id) = (select auth.uid())));
$$;

create policy "memberships: member or owner upsert" on public.memberships
  for insert to authenticated
  with check (public.membership_updatable(id));

-- The member answers / leaves; the owner removes. Transitions: guard below.
create policy "memberships: member or owner can update" on public.memberships
  for update to authenticated
  using ((select auth.uid()) = user_id or public.owner_of(entity_type, entity_id) = (select auth.uid()))
  with check ((select auth.uid()) = user_id or public.owner_of(entity_type, entity_id) = (select auth.uid()));

create or replace function public.guard_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then return new; end if;
  if new.user_id <> old.user_id or new.entity_type <> old.entity_type
     or new.entity_id <> old.entity_id or new.invited_by is distinct from old.invited_by
     or new.role <> old.role then
    raise exception 'membership identity cannot change' using errcode = '42501';
  end if;
  if new.status = old.status then return new; end if;
  if me = old.user_id and (
       (old.status = 'pending' and new.status in ('accepted', 'declined'))
       or (old.status = 'accepted' and new.status = 'removed')) then
    return new;
  end if;
  if me = public.owner_of(old.entity_type, old.entity_id) and new.status = 'removed' then
    return new;
  end if;
  raise exception 'invalid membership transition % → %', old.status, new.status
    using errcode = '42501';
end;
$$;

create trigger memberships_guard before update on public.memberships
  for each row execute function public.guard_membership();

-- Invite links (Convidar › Copiar link). Accepting is an online RPC.
create table public.invite_links (
  token text primary key default encode(extensions.gen_random_bytes(12), 'hex'),
  entity_type text not null check (entity_type in ('trip', 'wish')),
  entity_id uuid not null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);

alter table public.invite_links enable row level security;

create policy "invite_links: editors create" on public.invite_links
  for insert to authenticated
  with check (created_by = (select auth.uid()) and public.can_edit(entity_type, entity_id));
create policy "invite_links: creator reads" on public.invite_links
  for select to authenticated
  using (created_by = (select auth.uid()));

-- ── People (public profile mirror) and follows ──────────────────────────────

-- What other users may see of a profile. Kept in sync from `profiles` by a
-- trigger; expert fields are set by the team (dashboard). Pull only.
create table public.people (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  username text not null default '',
  city text not null default '',
  bio text not null default '',
  avatar_url text,
  expert_role text,
  expert_area text,
  -- Appears in search / can be found by strangers (Privacidade).
  searchable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create or replace function public.sync_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.people (id, name, username, city, bio, avatar_url, searchable, deleted_at)
  values (
    new.id, new.name, new.username, new.city, new.bio, new.avatar_url,
    new.privacy <> 'private' and coalesce((new.privacy_detail ->> 'search')::boolean, true),
    new.deleted_at
  )
  on conflict (id) do update set
    name = excluded.name, username = excluded.username, city = excluded.city,
    bio = excluded.bio, avatar_url = excluded.avatar_url,
    searchable = excluded.searchable, deleted_at = excluded.deleted_at;
  return new;
end;
$$;

create trigger profiles_sync_person after insert or update on public.profiles
  for each row execute function public.sync_person();

insert into public.people (id, name, username, city, bio, avatar_url, searchable)
select id, name, username, city, bio, avatar_url,
       privacy <> 'private' and coalesce((privacy_detail ->> 'search')::boolean, true)
from public.profiles
on conflict (id) do nothing;

create table public.follows (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  check (user_id <> followee_id)
);

create index follows_followee_idx on public.follows (followee_id);

create policy "follows: both sides can read" on public.follows
  for select to authenticated
  using ((select auth.uid()) in (user_id, followee_id));

-- ── Activity and notifications (written by the server) ───────────────────────

-- "Marina adicionou 12 fotos no Dia 2" on a shared trip.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade, -- actor
  entity_type text not null check (entity_type in ('trip', 'wish')),
  entity_id uuid not null,
  kind text not null check (kind in ('expense', 'photos', 'joined', 'diary')),
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create index activities_entity_idx on public.activities (entity_type, entity_id);

create policy "activities: entity viewers can read" on public.activities
  for select to authenticated
  using (public.can_view(entity_type, entity_id));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade, -- recipient
  type text not null check (type in (
    'invite', 'invite_accepted', 'invite_pending', 'activity', 'follow', 'comment', 'community',
    'memory', 'reminder'
  )),
  actor_id uuid references auth.users (id) on delete cascade,
  entity_type text,
  entity_id uuid,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

-- The device marks notifications read (outbox upsert of the whole row): only
-- read_at / deleted_at may actually change.
create or replace function public.guard_notification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Server functions (security definer) run as their owner, the app as `authenticated`.
  if current_user <> 'authenticated' then return new; end if;
  if tg_op = 'INSERT' then
    raise exception 'notifications are created by the server' using errcode = '42501';
  end if;
  new.type := old.type; new.actor_id := old.actor_id; new.entity_type := old.entity_type;
  new.entity_id := old.entity_id; new.data := old.data; new.created_at := old.created_at;
  return new;
end;
$$;

create trigger notifications_guard before insert or update on public.notifications
  for each row execute function public.guard_notification();

create policy "notifications: recipient can read" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);
-- Needed by the upsert the sync engine sends; the guard rejects real inserts.
create policy "notifications: recipient upserts" on public.notifications
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "notifications: recipient can update" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.notify(
  p_recipient uuid, p_type text, p_actor uuid, p_entity_type text, p_entity_id uuid, p_data jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, actor_id, entity_type, entity_id, data)
  select p_recipient, p_type, p_actor, p_entity_type, p_entity_id, coalesce(p_data, '{}')
  where p_recipient is not null and p_recipient is distinct from p_actor;
$$;

-- Everyone on a trip/wish except `p_except`.
create or replace function public.entity_people(p_type text, p_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select public.owner_of(p_type, p_id)
  union
  select user_id from public.memberships
    where entity_type = p_type and entity_id = p_id
      and status = 'accepted' and deleted_at is null;
$$;

-- ── Community (online) ──────────────────────────────────────────────────────

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('tip', 'review', 'itinerary', 'question')),
  -- "Lisboa", "Miradouro da Graça"…; place_ref links to the catalog when known.
  place_label text not null default '' check (char_length(place_label) <= 120),
  place_ref jsonb,
  title text check (char_length(title) <= 120),
  text text not null check (char_length(text) between 1 and 2000),
  rating smallint check (rating between 1 and 5),
  photo_paths jsonb not null default '[]',
  trip_id uuid references public.trips (id) on delete set null,
  visibility text not null default 'public' check (visibility in ('public', 'friends')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create index posts_feed_idx on public.posts (created_at desc) where deleted_at is null;
create index posts_author_idx on public.posts (user_id, created_at desc);

create trigger posts_set_updated_at before insert or update on public.posts
  for each row execute function public.set_updated_at();

-- Public, or "friends": people the author follows.
create or replace function public.post_visible(p_author uuid, p_visibility text, p_deleted timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_deleted is null and (
    p_author = (select auth.uid())
    or p_visibility = 'public'
    or exists (select 1 from public.follows f
               where f.user_id = p_author and f.followee_id = (select auth.uid()) and f.deleted_at is null)
  );
$$;

alter table public.posts enable row level security;
create policy "posts: visible to the audience" on public.posts
  for select to authenticated using (public.post_visible(user_id, visibility, deleted_at));
create policy "posts: author writes" on public.posts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "posts: author edits" on public.posts
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- "Está correto / Está errado". One per person and post.
create table public.post_votes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value text not null check (value in ('yes', 'no')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_votes enable row level security;
create policy "post_votes: own" on public.post_votes
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create index comments_post_idx on public.comments (post_id, created_at);

create trigger comments_set_updated_at before insert or update on public.comments
  for each row execute function public.set_updated_at();

alter table public.comments enable row level security;
create policy "comments: visible with the post" on public.comments
  for select to authenticated
  using (deleted_at is null and exists (select 1 from public.posts p where p.id = post_id));
create policy "comments: author writes on visible posts" on public.comments
  for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.posts p where p.id = post_id));
create policy "comments: author edits" on public.comments
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ── Chat (synced: offline send queue) ───────────────────────────────────────

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'support')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create table public.chat_members (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  unique (thread_id, user_id)
);

create table public.messages (
  id uuid primary key,
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create index messages_thread_idx on public.messages (thread_id, created_at);

create or replace function public.in_thread(p_thread uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.chat_members
                 where thread_id = p_thread and user_id = (select auth.uid()) and deleted_at is null);
$$;

create policy "chat_threads: members read" on public.chat_threads
  for select to authenticated using (public.in_thread(id));
create policy "chat_members: thread members read" on public.chat_members
  for select to authenticated using (public.in_thread(thread_id));
-- Upsert of the own row (last_read_at); new members only through the RPCs.
create policy "chat_members: own row upsert" on public.chat_members
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.in_thread(thread_id));
create policy "chat_members: own row update" on public.chat_members
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "messages: thread members read" on public.messages
  for select to authenticated using (public.in_thread(thread_id));
create policy "messages: members write as themselves" on public.messages
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.in_thread(thread_id));
create policy "messages: author edits" on public.messages
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- a and b know each other: a follow either way, the same trip/wish, or a chat.
create or replace function public.related(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with entities_of_a as (
    select entity_type, entity_id from public.memberships
      where user_id = a and status in ('pending', 'accepted') and deleted_at is null
    union select 'trip', id from public.trips where user_id = a and deleted_at is null
    union select 'wish', id from public.wish_destinations where user_id = a and deleted_at is null
  )
  select a = b
    or exists (select 1 from public.follows f
               where f.deleted_at is null
                 and ((f.user_id = a and f.followee_id = b) or (f.user_id = b and f.followee_id = a)))
    or exists (select 1 from entities_of_a e
               join public.memberships m on m.entity_type = e.entity_type and m.entity_id = e.entity_id
               where m.user_id = b and m.status in ('pending', 'accepted') and m.deleted_at is null)
    or exists (select 1 from entities_of_a e
               where public.owner_of(e.entity_type, e.entity_id) = b)
    or exists (select 1 from public.chat_members x join public.chat_members y using (thread_id)
               where x.user_id = a and y.user_id = b);
$$;

-- ── Photos (Storage + synced metadata) ──────────────────────────────────────

create table public.photos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  -- '<user id>/<photo id>.jpg' in the private `photos` bucket.
  storage_path text not null check (char_length(storage_path) <= 200),
  width integer,
  height integer,
  taken_at timestamptz,
  lat double precision,
  lng double precision,
  caption text check (char_length(caption) <= 500),
  -- False until the file is in Storage; other people only see uploaded photos.
  uploaded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create index photos_trip_idx on public.photos (trip_id);

create policy "photos: owner and trip editors read" on public.photos
  for select to authenticated
  using ((select auth.uid()) = user_id or (uploaded and trip_id is not null and public.can_edit('trip', trip_id)));
create policy "photos: trip must be editable" on public.photos
  as restrictive for insert to authenticated
  with check (trip_id is null or public.can_edit('trip', trip_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 20971520, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create policy "photos bucket: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos bucket: owner manages" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos bucket: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Readable when the photo row is visible (owner, or editor of its trip).
create policy "photos bucket: visible photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and exists (select 1 from public.photos p where p.storage_path = name));

-- Community post photos: posts are public content, so is this bucket (read by
-- URL); each user uploads only to their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-photos', 'post-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "post-photos bucket: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "post-photos bucket: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Devices (Senha e segurança › Aparelhos conectados) ──────────────────────

create table public.devices (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  platform text not null default '' check (char_length(platform) <= 20),
  -- auth session of this device (JWT `session_id`), revoked by revoke_device().
  session_id uuid,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

-- ── Plumbing for the new synced tables ──────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'memberships', 'people', 'follows', 'activities', 'notifications',
    'chat_threads', 'chat_members', 'messages', 'photos', 'devices'
  ] loop
    execute format('create index %I on public.%I (updated_at, id)', t || '_sync_idx', t);
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Own rows (user_id = me): follows, photos, devices.
  foreach t in array array['photos', 'devices'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || ': owner can read', t);
  end loop;
  foreach t in array array['follows', 'photos', 'devices'] loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || ': owner can insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || ': owner can update', t);
  end loop;
end;
$$;

create policy "people: self, related people and experts" on public.people
  for select to authenticated
  using (id = (select auth.uid()) or expert_role is not null or public.related((select auth.uid()), id));

-- ── Visibility bumps ("touch") ──────────────────────────────────────────────

create or replace function public.touch_people(p_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.people set updated_at = clock_timestamp() where id = any (p_ids);
$$;

create or replace function public.touch_entity(p_type text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_type = 'trip' then
    update public.trips set updated_at = clock_timestamp() where id = p_id;
    update public.trip_expenses set updated_at = clock_timestamp() where trip_id = p_id;
    update public.photos set updated_at = clock_timestamp() where trip_id = p_id;
  else
    update public.wish_destinations set updated_at = clock_timestamp() where id = p_id;
  end if;
  update public.activities set updated_at = clock_timestamp()
    where entity_type = p_type and entity_id = p_id;
  update public.memberships set updated_at = clock_timestamp()
    where entity_type = p_type and entity_id = p_id;
  perform public.touch_people(array(
    select public.entity_people(p_type, p_id)
    union select user_id from public.memberships
      where entity_type = p_type and entity_id = p_id and status = 'pending' and deleted_at is null
  ));
end;
$$;

-- Membership changes: reveal the entity to the member, notify, log activity.
create or replace function public.on_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  became_pending boolean := new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending');
  became_accepted boolean := new.status = 'accepted' and (tg_op = 'INSERT' or old.status <> 'accepted');
begin
  -- Avoid re-entering through touch_entity (it bumps memberships).
  if pg_trigger_depth() > 1 then return null; end if;
  if tg_op = 'UPDATE' and new.status = old.status and new.deleted_at is not distinct from old.deleted_at then
    return null;
  end if;
  perform public.touch_entity(new.entity_type, new.entity_id);
  if became_pending then
    perform public.notify(new.user_id, 'invite', new.invited_by, new.entity_type, new.entity_id, '{}');
  end if;
  if became_accepted then
    perform public.notify(r, 'invite_accepted', new.user_id, new.entity_type, new.entity_id, '{}')
      from (select distinct unnest(array[new.invited_by, public.owner_of(new.entity_type, new.entity_id)]) as r) x;
    insert into public.activities (user_id, entity_type, entity_id, kind)
      values (new.user_id, new.entity_type, new.entity_id, 'joined');
  end if;
  return null;
end;
$$;

create trigger memberships_changed after insert or update on public.memberships
  for each row execute function public.on_membership_change();

create or replace function public.on_follow_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.touch_people(array[new.user_id, new.followee_id]);
  if new.deleted_at is null and (tg_op = 'INSERT' or old.deleted_at is not null) then
    perform public.notify(new.followee_id, 'follow', new.user_id, null, null, '{}');
  end if;
  return null;
end;
$$;

create trigger follows_changed after insert or update on public.follows
  for each row execute function public.on_follow_change();

-- New expense by someone on a shared trip → activity + notify the others.
create or replace function public.on_expense_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  data jsonb := jsonb_build_object('name', new.name, 'amount', new.amount_label);
begin
  if not exists (select 1 from public.memberships
                 where entity_type = 'trip' and entity_id = new.trip_id
                   and status = 'accepted' and deleted_at is null) then
    return null; -- solo trip: no feed
  end if;
  insert into public.activities (user_id, entity_type, entity_id, kind, data)
    values (new.user_id, 'trip', new.trip_id, 'expense', data);
  perform public.notify(p, 'activity', new.user_id, 'trip', new.trip_id, data || '{"kind": "expense"}')
    from public.entity_people('trip', new.trip_id) p;
  return null;
end;
$$;

create trigger trip_expenses_added after insert on public.trip_expenses
  for each row execute function public.on_expense_added();

-- Photos land in Storage → one activity per person, trip and day (count grows).
create or replace function public.on_photo_uploaded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing uuid;
begin
  if new.trip_id is null or not new.uploaded or (tg_op = 'UPDATE' and old.uploaded) then
    return null;
  end if;
  if not exists (select 1 from public.memberships
                 where entity_type = 'trip' and entity_id = new.trip_id
                   and status = 'accepted' and deleted_at is null) then
    return null;
  end if;
  select id into existing from public.activities
    where user_id = new.user_id and entity_type = 'trip' and entity_id = new.trip_id
      and kind = 'photos' and created_at::date = now()::date and deleted_at is null
    limit 1;
  if existing is null then
    insert into public.activities (user_id, entity_type, entity_id, kind, data)
      values (new.user_id, 'trip', new.trip_id, 'photos', '{"count": 1}');
    perform public.notify(p, 'activity', new.user_id, 'trip', new.trip_id, '{"kind": "photos"}')
      from public.entity_people('trip', new.trip_id) p;
  else
    update public.activities
      set data = jsonb_set(data, '{count}', to_jsonb(coalesce((data ->> 'count')::int, 0) + 1))
      where id = existing;
  end if;
  return null;
end;
$$;

create trigger photos_uploaded after insert or update of uploaded on public.photos
  for each row execute function public.on_photo_uploaded();

create or replace function public.on_comment_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify(
    (select user_id from public.posts where id = new.post_id), 'comment', new.user_id,
    'post', new.post_id, jsonb_build_object('text', left(new.text, 120)));
  return null;
end;
$$;

create trigger comments_added after insert on public.comments
  for each row execute function public.on_comment_added();

-- "128 viajantes confirmaram sua dica": one notification per post, count grows.
create or replace function public.on_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid := (select user_id from public.posts where id = new.post_id);
  yes integer := (select count(*) from public.post_votes where post_id = new.post_id and value = 'yes');
begin
  if new.value <> 'yes' or author = new.user_id then return null; end if;
  update public.notifications
    set data = jsonb_build_object('count', yes), read_at = null, created_at = now()
    where user_id = author and type = 'community' and entity_id = new.post_id and deleted_at is null;
  if not found then
    perform public.notify(author, 'community', null, 'post', new.post_id, jsonb_build_object('count', yes));
  end if;
  return null;
end;
$$;

create trigger post_votes_changed after insert or update on public.post_votes
  for each row execute function public.on_vote();

create or replace function public.on_chat_member_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_threads set updated_at = clock_timestamp() where id = new.thread_id;
  update public.messages set updated_at = clock_timestamp() where thread_id = new.thread_id;
  perform public.touch_people(array(select user_id from public.chat_members where thread_id = new.thread_id));
  return null;
end;
$$;

create trigger chat_members_added after insert on public.chat_members
  for each row execute function public.on_chat_member_added();

create or replace function public.on_message_sent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_threads set last_message_at = new.created_at where id = new.thread_id;
  return null;
end;
$$;

create trigger messages_sent after insert on public.messages
  for each row execute function public.on_message_sent();

-- ── RPCs (online) ───────────────────────────────────────────────────────────

-- Joins through a link (Convidar › Copiar link) as an accepted member.
create or replace function public.accept_invite_link(p_token text)
returns table (entity_type text, entity_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  link public.invite_links;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into link from public.invite_links l where l.token = p_token and l.expires_at > now();
  if link is null then raise exception 'invalid or expired link' using errcode = 'P0002'; end if;
  if public.owner_of(link.entity_type, link.entity_id) <> me then
    update public.memberships m set status = 'accepted'
      where m.entity_type = link.entity_type and m.entity_id = link.entity_id
        and m.user_id = me and m.status = 'pending' and m.deleted_at is null;
    if not found and not exists (
      select 1 from public.memberships m
      where m.entity_type = link.entity_type and m.entity_id = link.entity_id
        and m.user_id = me and m.status = 'accepted' and m.deleted_at is null
    ) then
      insert into public.memberships (id, user_id, entity_type, entity_id, status, invited_by)
        values (gen_random_uuid(), me, link.entity_type, link.entity_id, 'accepted', link.created_by);
    end if;
  end if;
  return query select link.entity_type, link.entity_id;
end;
$$;

-- Community feed: 'foryou' (everything visible) or 'following'.
create or replace function public.community_feed(
  p_segment text default 'foryou',
  p_place text default null,
  p_before timestamptz default null,
  p_limit integer default 20,
  p_author uuid default null
)
returns table (
  id uuid, author_id uuid, author_name text, author_username text, author_avatar text,
  author_expert_role text, type text, place_label text, place_ref jsonb, title text, text text,
  rating smallint, photo_paths jsonb, trip_id uuid, visibility text, created_at timestamptz,
  yes integer, no integer, my_vote text, comments integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.user_id, pe.name, pe.username, pe.avatar_url, pe.expert_role,
         p.type, p.place_label, p.place_ref, p.title, p.text, p.rating, p.photo_paths, p.trip_id,
         p.visibility, p.created_at,
         (select count(*)::int from public.post_votes v where v.post_id = p.id and v.value = 'yes'),
         (select count(*)::int from public.post_votes v where v.post_id = p.id and v.value = 'no'),
         (select v.value from public.post_votes v where v.post_id = p.id and v.user_id = (select auth.uid())),
         (select count(*)::int from public.comments c where c.post_id = p.id and c.deleted_at is null)
  from public.posts p
  join public.people pe on pe.id = p.user_id
  where (select auth.uid()) is not null
    and public.post_visible(p.user_id, p.visibility, p.deleted_at)
    and (p_before is null or p.created_at < p_before)
    and (p_place is null or p.place_label ilike p_place)
    and (p_author is null or p.user_id = p_author)
    and (p_segment <> 'following' or exists (
      select 1 from public.follows f
      where f.user_id = (select auth.uid()) and f.followee_id = p.user_id and f.deleted_at is null))
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.post_comments(p_post uuid)
returns table (id uuid, author_id uuid, author_name text, author_username text, author_avatar text,
               text text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.user_id, pe.name, pe.username, pe.avatar_url, c.text, c.created_at
  from public.comments c
  join public.posts p on p.id = c.post_id
  join public.people pe on pe.id = c.user_id
  where c.post_id = p_post and c.deleted_at is null
    and public.post_visible(p.user_id, p.visibility, p.deleted_at)
  order by c.created_at;
$$;

-- A traveler's public page, respecting their privacy settings.
create or replace function public.traveler_profile(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  prof public.profiles;
  person public.people;
  audience boolean;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into prof from public.profiles where id = p_user and deleted_at is null;
  select * into person from public.people where id = p_user;
  if prof is null or person is null then return null; end if;
  -- private: only self; friends: people they follow; public: everyone.
  audience := p_user = me or prof.privacy = 'public'
    or (prof.privacy = 'friends' and exists (
      select 1 from public.follows f where f.user_id = p_user and f.followee_id = me and f.deleted_at is null));
  if not audience and not person.searchable and not public.related(me, p_user) then return null; end if;
  return jsonb_build_object(
    'id', person.id, 'name', person.name, 'username', person.username, 'city', person.city,
    'bio', person.bio, 'avatarUrl', person.avatar_url,
    'expertRole', person.expert_role, 'expertArea', person.expert_area,
    'followers', (select count(*) from public.follows where followee_id = p_user and deleted_at is null),
    'following', (select count(*) from public.follows where user_id = p_user and deleted_at is null),
    'followedByMe', exists (select 1 from public.follows
                            where user_id = me and followee_id = p_user and deleted_at is null),
    'restricted', not audience,
    'countries', case when audience and coalesce((prof.privacy_detail ->> 'map')::boolean, true) then
      coalesce((select jsonb_agg(distinct country_iso) from public.visited_countries
                where user_id = p_user and deleted_at is null), '[]') else '[]' end,
    'trips', case when audience and coalesce((prof.privacy_detail ->> 'trips')::boolean, true) then
      coalesce((select jsonb_agg(jsonb_build_object(
                  'id', t.id, 'title', t.title, 'flag', t.flag, 'place', t.place, 'year', t.year)
                  order by t.created_at desc)
                from public.trips t where t.user_id = p_user and t.deleted_at is null), '[]')
      else '[]' end
  );
end;
$$;

create or replace function public.search_people(p_query text, p_limit integer default 20)
returns setof public.people
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.people
  where deleted_at is null and id <> (select auth.uid())
    and (searchable or public.related((select auth.uid()), id))
    and (name ilike '%' || p_query || '%' or username ilike '%' || p_query || '%')
    and char_length(trim(p_query)) >= 2
  order by name
  limit least(greatest(p_limit, 1), 50);
$$;

-- Opens (or finds) the 1:1 thread with someone. Online.
create or replace function public.open_direct_thread(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  thread uuid;
begin
  if me is null or p_other is null or p_other = me then
    raise exception 'invalid participants' using errcode = '22023';
  end if;
  if not exists (select 1 from public.people where id = p_other and deleted_at is null
                 and (searchable or public.related(me, p_other))) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  select t.id into thread from public.chat_threads t
    where t.kind = 'direct'
      and exists (select 1 from public.chat_members m where m.thread_id = t.id and m.user_id = me)
      and exists (select 1 from public.chat_members m where m.thread_id = t.id and m.user_id = p_other)
    limit 1;
  if thread is null then
    insert into public.chat_threads (kind) values ('direct') returning id into thread;
    insert into public.chat_members (thread_id, user_id) values (thread, me), (thread, p_other);
  end if;
  return thread;
end;
$$;

-- The user's thread with the Worlo team (replies come from the dashboard).
create or replace function public.open_support_thread()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  thread uuid;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select t.id into thread from public.chat_threads t
    join public.chat_members m on m.thread_id = t.id and m.user_id = me
    where t.kind = 'support' limit 1;
  if thread is null then
    insert into public.chat_threads (kind) values ('support') returning id into thread;
    insert into public.chat_members (thread_id, user_id) values (thread, me);
  end if;
  return thread;
end;
$$;

-- Aparelhos conectados › Desconectar: kills that device's session for real.
create or replace function public.revoke_device(p_device uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  sid uuid;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select session_id into sid from public.devices where id = p_device and user_id = me;
  if not found then raise exception 'device not found' using errcode = 'P0002'; end if;
  if sid is not null then delete from auth.sessions where id = sid and user_id = me; end if;
  update public.devices set revoked_at = now() where id = p_device and user_id = me;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'accept_invite_link(text)',
    'community_feed(text, text, timestamptz, integer, uuid)',
    'post_comments(uuid)',
    'traveler_profile(uuid)',
    'search_people(text, integer)',
    'open_direct_thread(uuid)',
    'open_support_thread()',
    'revoke_device(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- ── 2FA: with a verified TOTP factor, the session must be AAL2 ─────────────

create or replace function public.aal_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors
                     where user_id = (select auth.uid()) and status = 'verified');
$$;

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated
         using (public.aal_ok()) with check (public.aal_ok())',
      t || ': 2fa', t);
  end loop;
end;
$$;

create policy "photos bucket: 2fa" on storage.objects
  as restrictive for all to authenticated
  using (bucket_id <> 'photos' or public.aal_ok())
  with check (bucket_id <> 'photos' or public.aal_ok());

-- ── Realtime: the app pulls as soon as these change ────────────────────────

alter publication supabase_realtime add table
  public.messages, public.notifications, public.memberships, public.chat_members;
