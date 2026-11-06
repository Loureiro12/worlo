-- Worlo QA round 1: travel mode keeps each day's record.
--
-- * live_logs.day: the itinerary day an entry belongs to (1-based), so the
--   trip created at the end and its retrospective show what happened each day,
--   photos included. Older rows have no day (null).
-- * 'activity': "+" in travel mode adds an experience to the day (it replaced
--   the check-in, which stays valid for older rows).

alter table public.live_logs add column day integer check (day >= 1);

alter table public.live_logs drop constraint live_logs_type_check;
alter table public.live_logs add constraint live_logs_type_check
  check (type in ('checkin', 'photo', 'expense', 'note', 'done', 'activity'));
