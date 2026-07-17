-- 017: Fitness Operating System — the substrate the AI operator runs on.
-- Four tables: a living PROFILE of the user's life, a life-EVENT log (feeds memory +
-- pattern detection), an ADJUSTMENTS ledger (recommend → approve/modify/reject), and
-- the operator CONVERSATION. All scoped to an enrollment, RLS to the owning user.

-- The living profile: durable facts the operator accumulates about her real life.
create table if not exists fos_profile (
  enrollment_id uuid primary key references challenge_enrollments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  goal_summary text,               -- "lose 10–15 lbs, keep my curves"
  work_schedule jsonb,             -- { mon: {start,end}, ... }
  energy_patterns jsonb,           -- when she has more/less energy
  foods_loved text[] default '{}',
  foods_avoided text[] default '{}',
  motivators text[] default '{}',
  discouragers text[] default '{}',
  barriers text[] default '{}',    -- known consistency barriers
  cycle_tracking boolean default false,
  cycle jsonb,                     -- opt-in menstrual-cycle data
  preferences jsonb default '{}'::jsonb, -- freeform key/values the operator learns
  updated_at timestamptz not null default now()
);

-- Every interaction / life event the operator observes. Feeds memory + pattern detection.
create table if not exists fos_events (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  occurred_on date not null default (now() at time zone 'utc')::date,
  kind text not null,              -- message | adjustment | win | miss | excuse | schedule_change | eat_out | travel | note | ...
  summary text,                    -- human-readable
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_fos_events on fos_events(enrollment_id, occurred_on);

-- Recommended (and approved/modified/rejected) plan adjustments. Recommend, don't control.
create table if not exists fos_adjustments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  for_date date not null default (now() at time zone 'utc')::date,
  trigger text,                    -- what she said, or the pattern the operator noticed
  workout_change jsonb,            -- { fromMinutes, toMinutes, swapTo, reason }
  nutrition_change jsonb,          -- { calorieDelta, dinnerSuggestion, reason }
  message text,                    -- the operator's natural-language response
  status text not null default 'recommended', -- recommended | approved | modified | rejected
  source text not null default 'rule',        -- ai | rule
  created_at timestamptz not null default now()
);
create index if not exists idx_fos_adjustments on fos_adjustments(enrollment_id, for_date);

-- The operator conversation (text now; voice later reuses this).
create table if not exists fos_messages (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  role text not null,              -- user | operator
  content text not null,
  adjustment_id uuid references fos_adjustments(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_fos_messages on fos_messages(enrollment_id, created_at);

-- ── RLS: the owning user reads/writes their own rows; the service role does everything ──
alter table fos_profile enable row level security;
alter table fos_events enable row level security;
alter table fos_adjustments enable row level security;
alter table fos_messages enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fos_profile','fos_events','fos_adjustments','fos_messages'] loop
    execute format('drop policy if exists "own read %1$s" on %1$s', t);
    execute format('create policy "own read %1$s" on %1$s for select using (auth.uid() = user_id)', t);
    execute format('drop policy if exists "own write %1$s" on %1$s', t);
    execute format('create policy "own write %1$s" on %1$s for insert with check (auth.uid() = user_id)', t);
    execute format('drop policy if exists "own update %1$s" on %1$s', t);
    execute format('create policy "own update %1$s" on %1$s for update using (auth.uid() = user_id)', t);
    execute format('drop policy if exists "service %1$s" on %1$s', t);
    execute format('create policy "service %1$s" on %1$s for all using (true) with check (true)', t);
  end loop;
end $$;
