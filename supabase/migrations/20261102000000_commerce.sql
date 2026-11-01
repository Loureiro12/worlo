-- Worlo phase 3: tour dates, bookings and business sign-ups (Anuncie).
--
-- No online payment: a booking holds seats on a date and the traveler pays the
-- host there. The team manages tours (catalog), their schedules and the
-- business reviews from the dashboard; nothing here is edited by the app
-- except its own Anuncie sign-ups.
--
--   * tour_slots    synced to every device (pull only): dates, capacity, seats taken.
--   * bookings      synced to the owner (pull only), written by book_tour / cancel_booking
--                   so capacity is checked atomically on the server.
--   * businesses    synced to the owner (outbox): Anuncie sign-ups; the team approves.
--   * tour_schedules (server only) opens new dates every day (pg_cron).

-- ── Tour dates ──────────────────────────────────────────────────────────────

create table public.tour_slots (
  id uuid primary key default gen_random_uuid(),
  tour_id text not null, -- catalog key of kind 'passeios'
  date date not null,
  capacity integer not null check (capacity > 0),
  booked integer not null default 0 check (booked >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  unique (tour_id, date)
);

create policy "tour_slots: signed-in users can read" on public.tour_slots
  for select to authenticated using (true);

-- Recurring dates per tour, edited by the team. open_tour_slots() keeps
-- `days_ahead` days of dates open; one-off dates can be added to tour_slots directly.
create table public.tour_schedules (
  tour_id text primary key,
  capacity integer not null default 12 check (capacity > 0),
  days_ahead integer not null default 14 check (days_ahead between 1 and 180),
  -- 0 = Sunday … 6 = Saturday (extract(dow …)).
  weekdays integer[] not null default '{0,1,2,3,4,5,6}',
  active boolean not null default true
);

alter table public.tour_schedules enable row level security;

create or replace function public.open_tour_slots()
returns integer
language sql
security definer
set search_path = ''
as $$
  with opened as (
    insert into public.tour_slots (tour_id, date, capacity)
    select s.tour_id, d::date, s.capacity
    from public.tour_schedules s
    cross join lateral generate_series(
      current_date + 1, current_date + s.days_ahead, interval '1 day') d
    where s.active and extract(dow from d)::integer = any (s.weekdays)
    on conflict (tour_id, date) do nothing
    returning 1
  )
  select count(*)::integer from opened;
$$;

-- ── Bookings ────────────────────────────────────────────────────────────────

create table public.bookings (
  id uuid primary key, -- generated on the device: retrying book_tour is idempotent
  user_id uuid not null references auth.users (id) on delete cascade,
  tour_id text not null,
  slot_id uuid not null references public.tour_slots (id),
  date date not null,
  people integer not null check (people between 1 and 12),
  total numeric(12, 2) not null,
  currency text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  cancelled_at timestamptz,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create index bookings_slot_idx on public.bookings (slot_id);
create index bookings_date_idx on public.bookings (date) where status = 'confirmed';
-- One active booking per tour (the tour page shows "Reservado").
create unique index bookings_one_per_tour on public.bookings (user_id, tour_id)
  where status = 'confirmed' and deleted_at is null;

create policy "bookings: owner can read" on public.bookings
  for select to authenticated using ((select auth.uid()) = user_id);

-- Errors the app maps to copy (message text): sold_out, already_booked, closed.
create or replace function public.book_tour(p_id uuid, p_slot uuid, p_people integer)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  slot public.tour_slots;
  tour jsonb;
  result public.bookings;
begin
  if me is null or not public.aal_ok() then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into result from public.bookings where id = p_id;
  if found then
    if result.user_id <> me then raise exception 'not allowed' using errcode = '42501'; end if;
    return result;
  end if;
  if p_people is null or p_people not between 1 and 12 then
    raise exception 'invalid people' using errcode = '22023';
  end if;

  select * into slot from public.tour_slots
    where id = p_slot and deleted_at is null for update;
  if not found then raise exception 'slot not found' using errcode = 'P0002'; end if;
  if slot.date <= current_date then raise exception 'closed' using errcode = 'P0001'; end if;
  if exists (select 1 from public.bookings
             where user_id = me and tour_id = slot.tour_id
               and status = 'confirmed' and deleted_at is null) then
    raise exception 'already_booked' using errcode = 'P0001';
  end if;
  if slot.capacity - slot.booked < p_people then
    raise exception 'sold_out' using errcode = 'P0001';
  end if;

  select data into tour from public.catalog
    where kind = 'passeios' and key = slot.tour_id and deleted_at is null;
  if tour is null then raise exception 'tour not found' using errcode = 'P0002'; end if;

  update public.tour_slots set booked = booked + p_people where id = slot.id;
  insert into public.bookings (id, user_id, tour_id, slot_id, date, people, total, currency)
  values (p_id, me, slot.tour_id, slot.id, slot.date, p_people,
          (tour ->> 'price')::numeric * p_people, coalesce(tour ->> 'cur', ''))
  returning * into result;
  return result;
end;
$$;

-- Frees the seats. Not on the day of the tour (talk to the host / support).
create or replace function public.cancel_booking(p_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  result public.bookings;
begin
  if me is null or not public.aal_ok() then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into result from public.bookings
    where id = p_id and user_id = me and deleted_at is null for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if result.status = 'cancelled' then return result; end if;
  if result.date <= current_date then raise exception 'closed' using errcode = 'P0001'; end if;

  update public.tour_slots set booked = greatest(0, booked - result.people)
    where id = result.slot_id;
  update public.bookings set status = 'cancelled', cancelled_at = now()
    where id = p_id
    returning * into result;
  return result;
end;
$$;

-- ── Notifications: tour reminders and business reviews ─────────────────────

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'invite', 'invite_accepted', 'invite_pending', 'activity', 'follow', 'comment', 'community',
  'memory', 'reminder', 'business'
));

-- Daily: "Seu passeio é amanhã" for tomorrow's bookings (once per booking).
create or replace function public.booking_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
  sent integer := 0;
begin
  for b in
    select bk.id, bk.user_id, bk.tour_id, bk.date, c.data ->> 'name' as tour_name
    from public.bookings bk
    left join public.catalog c on c.kind = 'passeios' and c.key = bk.tour_id
    where bk.status = 'confirmed' and bk.deleted_at is null and bk.reminded_at is null
      and bk.date = current_date + 1
    for update of bk skip locked
  loop
    perform public.notify(b.user_id, 'reminder', null, 'booking', b.id,
      jsonb_build_object('days', 1, 'tour_id', b.tour_id, 'tour', coalesce(b.tour_name, ''),
                         'date', b.date));
    update public.bookings set reminded_at = now() where id = b.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- ── Businesses (Anuncie) ────────────────────────────────────────────────────

create table public.businesses (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  type text not null check (type in ('guide', 'agency', 'restaurant', 'lodging')),
  city text not null check (char_length(city) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  email text not null check (email ~ '.+@.+\..+'),
  status text not null default 'review' check (status in ('review', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create policy "businesses: owner can read" on public.businesses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "businesses: owner can insert" on public.businesses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "businesses: owner can update" on public.businesses
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Only the team (dashboard / service role) reviews a sign-up.
create or replace function public.guard_business()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'review';
  else
    new.status := old.status;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger businesses_guard before insert or update on public.businesses
  for each row execute function public.guard_business();

create or replace function public.on_business_reviewed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform public.notify(new.user_id, 'business', null, 'business', new.id,
      jsonb_build_object('name', new.name, 'status', new.status));
  end if;
  return new;
end;
$$;

create trigger businesses_reviewed after update of status on public.businesses
  for each row execute function public.on_business_reviewed();

-- ── Plumbing ───────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array['tour_slots', 'bookings', 'businesses'] loop
    execute format('create index %I on public.%I (updated_at, id)', t || '_sync_idx', t);
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;

  foreach t in array array['tour_slots', 'bookings', 'businesses', 'tour_schedules'] loop
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated
         using (public.aal_ok()) with check (public.aal_ok())',
      t || ': 2fa', t);
  end loop;

  foreach t in array array['book_tour(uuid, uuid, integer)', 'cancel_booking(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', t);
    execute format('grant execute on function public.%s to authenticated', t);
  end loop;
  foreach t in array array['open_tour_slots()', 'booking_reminders()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', t);
  end loop;
end;
$$;

-- ── Schedules (pg_cron, UTC) ───────────────────────────────────────────────

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('worlo-open-tour-slots', '5 3 * * *', 'select public.open_tour_slots()');
-- 12:00 UTC = 9h in Brasília.
select cron.schedule('worlo-booking-reminders', '0 12 * * *', 'select public.booking_reminders()');
