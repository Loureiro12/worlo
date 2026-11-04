-- Worlo phase 4: push notifications.
--
-- Every notification row the server writes (invites, follows, comments, tour
-- reminders…) also goes out as an Expo push to the recipient's devices:
--   * devices.push_token / devices.language: registered by the app (outbox);
--   * push_templates: the in-app copy (`explore.notifs` of @worlo/i18n), seeded
--     by apps/mobile/scripts/generate-seed.ts, so push and app read the same;
--   * push_notification(): after insert on notifications, renders the text in
--     each device's language and queues one pg_net request to Expo;
--   * push_cleanup() (pg_cron): forgets tokens Expo reports as unregistered.
-- Profile notification_prefs gate the push only; the in-app list keeps everything.

create extension if not exists pg_net with schema extensions;

-- ── Devices: push token and language ───────────────────────────────────────

alter table public.devices
  add column push_token text check (push_token ~ '^Expo(nent)?PushToken\[.+\]$'),
  add column language text not null default 'pt-BR' check (language in ('pt-BR', 'en', 'es'));

create index devices_push_token_idx on public.devices (push_token) where push_token is not null;

-- One phone, one account: signing in with another account on the same phone
-- takes the token away from the previous one (it would get the new one's pushes).
create or replace function public.claim_push_token()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.push_token is not null then
    update public.devices set push_token = null
      where push_token = new.push_token and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger devices_claim_push_token after insert or update of push_token on public.devices
  for each row execute function public.claim_push_token();

-- ── Copy ───────────────────────────────────────────────────────────────────

-- `explore.notifs.<key>` per language, with i18next placeholders ({{title}}).
create table public.push_templates (
  lang text not null,
  key text not null,
  text text not null,
  primary key (lang, key)
);

alter table public.push_templates enable row level security; -- server only, no policies

-- The push body of a notification, like NotificationsScreen writes it:
-- "Marina convidou você pra a viagem “Lisboa”." (null: nothing to send).
create or replace function public.push_body(n public.notifications, p_lang text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  title text := '';
  place text := '';
  who text := '';
  k text;
  cnt integer;
  vars jsonb := '{}';
  body text;
  v record;
  -- i18next plural suffix (pt: 0 and 1 are "one").
  plural text;
begin
  if n.entity_type = 'trip' then
    select t.title, coalesce(nullif(t.place, ''), t.country) into title, place
      from public.trips t where t.id = n.entity_id;
  elsif n.entity_type = 'wish' then
    select w.name, w.name into title, place from public.wish_destinations w where w.id = n.entity_id;
  elsif n.entity_type = 'itinerary' then
    select i.title, i.place into title, place from public.itineraries i where i.id = n.entity_id;
  end if;
  title := coalesce(title, '');
  place := coalesce(place, '');

  case n.type
    when 'invite' then
      k := case when title = '' then 'inviteGone'
                  when n.entity_type = 'wish' then 'inviteFuture' else 'invitePast' end;
    when 'invite_accepted' then k := 'inviteAccepted';
    when 'invite_pending' then k := 'invitePending';
    when 'activity' then
      if n.data ->> 'kind' = 'expense' then
        k := 'activityExpense';
        vars := jsonb_build_object('amount', coalesce(n.data ->> 'amount', ''));
      elsif n.data ->> 'kind' = 'diary' then
        k := 'activityDiary';
      else
        k := 'activityPhotos';
        cnt := coalesce((n.data ->> 'count')::integer, 1);
      end if;
    when 'follow' then k := 'follow';
    when 'comment' then k := 'comment';
    when 'community' then
      k := 'community';
      cnt := coalesce((n.data ->> 'count')::integer, 1);
    when 'memory' then
      k := 'memory';
      cnt := coalesce((n.data ->> 'years')::integer, 1);
    when 'reminder' then
      if n.entity_type = 'booking' then
        k := 'tourReminder';
        title := coalesce(n.data ->> 'tour', '');
      else
        k := 'reminder';
        cnt := coalesce((n.data ->> 'days')::integer, 1);
      end if;
    when 'business' then
      k := case when n.data ->> 'status' = 'approved' then 'businessApproved' else 'businessRejected' end;
      vars := jsonb_build_object('name', coalesce(n.data ->> 'name', ''));
    else
      return null;
  end case;

  if cnt is not null then
    plural := case when cnt = 1 or (p_lang = 'pt-BR' and cnt = 0) then '_one' else '_other' end;
    if n.type = 'community' then
      select t.text into who from public.push_templates t
        where t.lang = p_lang and t.key = 'communityWho' || plural;
    end if;
    k := k || plural;
  end if;

  select t.text into body from public.push_templates t
    where t.key = k and t.lang in (p_lang, 'pt-BR')
    order by t.lang = p_lang desc limit 1;
  if body is null then return null; end if;

  vars := vars || jsonb_build_object('title', title, 'place', place, 'count', coalesce(cnt, 1));
  for v in select * from jsonb_each_text(vars) loop
    body := replace(body, '{{' || v.key || '}}', v.value);
  end loop;
  who := coalesce(who, '');
  if who <> '' then
    who := replace(who, '{{count}}', coalesce(cnt, 1)::text);
  elsif n.actor_id is not null then
    select p.name into who from public.profiles p where p.id = n.actor_id;
  end if;
  return nullif(trim(coalesce(who, '') || ' ' || body), '');
end;
$$;

-- Which Configurações › Notificações switch silences this push (null: always sent).
create or replace function public.push_pref(n public.notifications)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when n.type = 'memory' then 'memories'
    when n.type in ('community', 'comment', 'follow') then 'community'
    when n.type = 'reminder' and n.entity_type is distinct from 'booking' then 'itineraries'
  end;
$$;

-- ── Sending ────────────────────────────────────────────────────────────────

-- Requests in flight, to read Expo's answer later (push_cleanup).
create table public.push_log (
  request_id bigint primary key,
  tokens text[] not null,
  created_at timestamptz not null default now()
);

alter table public.push_log enable row level security; -- server only, no policies

create or replace function public.push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pref text := public.push_pref(new);
  messages jsonb := '[]';
  tokens text[] := '{}';
  badge integer;
  d record;
  body text;
  request bigint;
begin
  if pref is not null and not coalesce(
    (select (p.notification_prefs ->> pref)::boolean from public.profiles p where p.id = new.user_id),
    true) then
    return null;
  end if;

  select count(*) into badge from public.notifications
    where user_id = new.user_id and read_at is null and deleted_at is null;

  -- Signed-in devices only: signing out or "Desconectar" ends the auth session.
  for d in
    select dv.push_token, dv.language from public.devices dv
    where dv.user_id = new.user_id and dv.push_token is not null
      and dv.revoked_at is null and dv.deleted_at is null
      and (dv.session_id is null or exists (select 1 from auth.sessions s where s.id = dv.session_id))
  loop
    body := public.push_body(new, d.language);
    continue when body is null;
    tokens := tokens || d.push_token;
    messages := messages || jsonb_build_object(
      'to', d.push_token,
      'body', body,
      'sound', 'default',
      'badge', badge,
      'channelId', 'default',
      'data', jsonb_build_object(
        'id', new.id, 'type', new.type, 'entity_type', new.entity_type,
        'entity_id', new.entity_id, 'actor_id', new.actor_id, 'data', new.data));
  end loop;

  if cardinality(tokens) = 0 then return null; end if;
  select net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := messages,
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'
  ) into request;
  insert into public.push_log (request_id, tokens) values (request, tokens);
  return null;
exception when others then
  -- A push must never undo what created the notification (an invite, a booking…).
  raise warning 'push_notification: %', sqlerrm;
  return null;
end;
$$;

create trigger notifications_push after insert on public.notifications
  for each row execute function public.push_notification();

-- Expo answers each message in order; DeviceNotRegistered = app uninstalled.
create or replace function public.push_cleanup()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  forgotten integer := 0;
  n integer;
begin
  with answered as (
    select l.request_id, l.tokens, r.content::jsonb -> 'data' as tickets
    from public.push_log l
    join net._http_response r on r.id = l.request_id
    where r.status_code = 200 and r.content is not null
  ),
  gone as (
    select a.tokens[t.ord] as token
    from answered a, jsonb_array_elements(a.tickets) with ordinality as t(ticket, ord)
    where t.ticket -> 'details' ->> 'error' = 'DeviceNotRegistered'
  )
  update public.devices dv set push_token = null
    from gone where dv.push_token = gone.token;
  get diagnostics n = row_count;
  forgotten := n;

  -- Answered (pg_net keeps responses for 6 hours) or never will be.
  delete from public.push_log l
    where exists (select 1 from net._http_response r where r.id = l.request_id)
       or l.created_at < now() - interval '1 day';
  return forgotten;
end;
$$;

revoke execute on function public.push_cleanup() from public, anon, authenticated;
revoke execute on function public.push_body(public.notifications, text) from public, anon, authenticated;

select cron.schedule('worlo-push-cleanup', '*/15 * * * *', 'select public.push_cleanup()');
