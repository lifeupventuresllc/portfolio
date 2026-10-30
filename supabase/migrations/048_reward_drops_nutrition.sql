-- 048: allow the 'nutrition' reward (a day she ended on her food target),
-- given the next morning (2026-10-29). Same one-per-day rule as the others.
alter table public.reward_drops drop constraint if exists reward_drops_trigger_check;
alter table public.reward_drops add constraint reward_drops_trigger_check check (trigger in ('workout', 'meal', 'nutrition'));
