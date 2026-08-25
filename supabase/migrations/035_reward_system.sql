-- 035: The reward system (prompt 7, 2026-08-25 spec) — a new component
-- inside the Next Action engine, not a separate system. Two additions:
--
-- 1. reward_preferences: her personal profile of things she actually values,
--    built from three sources (explicit statements, light-touch asked
--    questions, and inferred behavior) — see lib/next-action/reward.ts.
create table if not exists reward_preferences (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  label text not null,
  category text not null default 'other', -- nutrition | fitness | recovery | other
  source text not null default 'explicit', -- explicit | asked | inferred
  weight numeric not null default 1,
  last_offered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (enrollment_id, label)
);
create index if not exists idx_reward_preferences_enrollment on reward_preferences(enrollment_id);

alter table reward_preferences enable row level security;
drop policy if exists "own read reward_preferences" on reward_preferences;
create policy "own read reward_preferences" on reward_preferences for select using (auth.uid() = user_id);
drop policy if exists "service reward_preferences" on reward_preferences;
create policy "service reward_preferences" on reward_preferences for all using (true) with check (true);

-- 2. Two columns on the existing next_action_log so a reward moment is
-- logged the same way every other instruction is (never a parallel,
-- separately-tracked system) — needed for the variable-schedule cooldown
-- check (last time is_reward was true) and for basic auditing. Never
-- exposed to her; the API response shape is unchanged.
alter table next_action_log add column if not exists is_reward boolean not null default false;
alter table next_action_log add column if not exists reward_preference_id uuid references reward_preferences(id) on delete set null;
create index if not exists idx_next_action_log_reward on next_action_log(enrollment_id, is_reward, shown_at desc);
