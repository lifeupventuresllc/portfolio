-- 039: Progression memory + real-time intraworkout adjustment (2026-09-01,
-- Asa's explicit directive as part of the two-layer workout-engine rebuild).
-- No per-set performance data existed anywhere in this app before this —
-- challenge_progress only ever tracked workout-done/nutrition-done booleans.
-- These two tables are the real, honest foundation that capability needs:
--
-- workout_set_logs: every set she reports on, tagged with a simple effort
-- signal (easy/right/hard) via the full-screen rest-timer tap screen —
-- real, logged history, never a fabricated number.
--
-- progression_state: one row per (enrollment, movement pattern) — the LIVE
-- dynamic skill/intensity state lib/progression.ts computes FROM that
-- logged history, and lib/workout-assembly.ts reads to make progressive
-- overload happen automatically within the attribute-matching itself,
-- exactly as specified, rather than as a separate bolted-on system.

create table if not exists workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  exercise_name text not null,
  movement_pattern text not null,
  muscle_groups text[] not null default '{}',
  effort text not null check (effort in ('easy', 'right', 'hard')),
  set_index integer not null default 1,
  logged_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now()
);
create index if not exists idx_workout_set_logs_enrollment on workout_set_logs(enrollment_id, movement_pattern, created_at desc);

alter table workout_set_logs enable row level security;
drop policy if exists "own read workout_set_logs" on workout_set_logs;
create policy "own read workout_set_logs" on workout_set_logs for select using (auth.uid() = user_id);
drop policy if exists "own write workout_set_logs" on workout_set_logs;
create policy "own write workout_set_logs" on workout_set_logs for insert with check (auth.uid() = user_id);
drop policy if exists "service workout_set_logs" on workout_set_logs;
create policy "service workout_set_logs" on workout_set_logs for all using (true) with check (true);

create table if not exists progression_state (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  movement_pattern text not null,
  -- Cold-start defaults (skill 1, intensity 2) match a fresh beginner
  -- assembly-engine request exactly — a member with no logged history yet
  -- gets identical behavior to before this table existed.
  skill_level integer not null default 1 check (skill_level between 1 and 3),
  intensity_level integer not null default 2 check (intensity_level between 1 and 5),
  consecutive_easy integer not null default 0,
  consecutive_hard integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (enrollment_id, movement_pattern)
);
create index if not exists idx_progression_state_enrollment on progression_state(enrollment_id);

alter table progression_state enable row level security;
drop policy if exists "own read progression_state" on progression_state;
create policy "own read progression_state" on progression_state for select using (
  enrollment_id in (select id from challenge_enrollments where user_id = auth.uid())
);
drop policy if exists "service progression_state" on progression_state;
create policy "service progression_state" on progression_state for all using (true) with check (true);
