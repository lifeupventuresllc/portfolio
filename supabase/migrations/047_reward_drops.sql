-- 047: Reward Drops (2026-10-26, rewards-plan.md phases 2-4).
--
-- One row per surprise she earned: after a finished workout or a logged /
-- ordered meal. Rolled on the server (POST /api/plan/reward-drop), never
-- for just opening the app. One drop per enrollment + trigger + local day,
-- so logging the same thing twice can't farm it.
--
--   tier    every | bonus | rare
--   kind    kind (a kind line) | selftalk | badge | shield | recipe | milestone | check
--   item_key what exactly she got (e.g. 'talk:412', 'badge:first-workout'),
--            used for the "no repeat within 14 days" rule
--   payload  what the card shows (title, body, tag, photo) so the
--            "Your wins" shelf on Progress can reopen it as-is
--
-- A 'shield' row is a banked streak shield: lib/streak.ts lets each one
-- cover one missed day after it was earned.
--
-- Until this runs, the app still works: the drop still shows (a per-day
-- roll that isn't saved), the shelf stays hidden, and no shields count.

create table if not exists reward_drops (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  user_id uuid,
  trigger text not null check (trigger in ('workout', 'meal')),
  day date not null,
  tier text not null check (tier in ('every', 'bonus', 'rare')),
  kind text not null,
  item_key text,
  payload jsonb not null default '{}'::jsonb,
  opened_at timestamptz,
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  unique (enrollment_id, trigger, day)
);
create index if not exists idx_reward_drops_enrollment on reward_drops(enrollment_id, created_at desc);

-- The app only touches this table through the server's service-role client.
alter table reward_drops enable row level security;
drop policy if exists "service reward_drops" on reward_drops;
create policy "service reward_drops" on reward_drops for all to service_role using (true) with check (true);
