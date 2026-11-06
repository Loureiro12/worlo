-- Worlo QA round 1: who paid each trip expense (divisão de gastos).
--
-- paid_by: the payer — a user id, or "name:<companion>" for someone without an
-- account. When set, `split` lists every participant (user ids / "name:…")
-- including the payer if they took part. Null = older rows: the author paid
-- and split with the names in `split`.

alter table public.trip_expenses
  add column paid_by text check (paid_by is null or char_length(paid_by) between 1 and 160);
