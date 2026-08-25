-- 032: The Next Action engine — a new, standalone build (2026-08-25 spec,
-- memory: "Next Action Engine — One Thing"). Deliberately NOT folded into
-- the older fos_* tables/files — this is its own system with its own table,
-- even though it reads existing data (fos_profile, fos_events,
-- challenge_progress, challenge_food_log, etc.) as INPUTS to its scoring.
-- Every single instruction the engine ever shows her gets one row here,
-- whether it's a workout, a meal prompt, or a fallback micro action — this
-- is the "past completion rate for similar actions" data the rules-based
-- scorer needs, and the raw material the personalized minimum-win ranking
-- learns from.

create table if not exists next_action_log (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  -- What kind of action this was, and a stable key identifying the SPECIFIC
  -- action within that kind (e.g. a workout day title, a food-log prompt, or
  -- a fallback action's own key like 'water' / 'breath_checkin' / 'stretch')
  -- — the key is what completion-rate scoring and the personalized fallback
  -- ranking group by; kind alone is too coarse (two very different fallback
  -- actions shouldn't share one completion rate).
  kind text not null,              -- workout | meal | fallback | location
  action_key text not null,
  instruction text not null,       -- the actual human-facing copy shown
  -- The state snapshot this decision was scored against — not authoritative
  -- history (challenge_progress/challenge_food_log/fos_profile own that),
  -- just enough to audit/debug why THIS action won at THIS moment, and to
  -- compute "completion rate under similar energy/time conditions" later
  -- without reconstructing historical state from scratch.
  energy_context text,             -- low | normal | high | unknown
  minutes_available integer,
  score numeric,                   -- the winning score, for tuning the weights later
  source text not null default 'rule', -- rule | fallback | override
  shown_at timestamptz not null default now(),
  completed_at timestamptz,
  skipped_at timestamptz,
  -- Set when a disruption ("my day changed") caused this instruction to be
  -- replaced before she acted on it — distinct from a real skip (she saw it
  -- and declined), which should weigh differently in scoring/ranking than
  -- "the world changed out from under this instruction."
  superseded_at timestamptz
);
create index if not exists idx_next_action_log_enrollment on next_action_log(enrollment_id, shown_at desc);
create index if not exists idx_next_action_log_key on next_action_log(enrollment_id, kind, action_key);

alter table next_action_log enable row level security;
drop policy if exists "own read next_action_log" on next_action_log;
create policy "own read next_action_log" on next_action_log for select using (auth.uid() = user_id);
drop policy if exists "own write next_action_log" on next_action_log;
create policy "own write next_action_log" on next_action_log for insert with check (auth.uid() = user_id);
drop policy if exists "own update next_action_log" on next_action_log;
create policy "own update next_action_log" on next_action_log for update using (auth.uid() = user_id);
drop policy if exists "service next_action_log" on next_action_log;
create policy "service next_action_log" on next_action_log for all using (true) with check (true);
