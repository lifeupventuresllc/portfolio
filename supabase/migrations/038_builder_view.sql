-- 038: Garden/Builder View — a second visual reading of the SAME completion
-- data next_action_log / challenge_progress / challenge_checkins /
-- challenge_food_log / badges already hold. No new user-facing tracking
-- inputs — builder_elements is a derived placement log, rebuilt idempotently
-- from those sources by lib/builder/engine.ts on every dashboard load.

create table if not exists builder_tier_config (
  tier text primary key check (tier in ('micro', 'small', 'medium', 'large')),
  label text not null,
  weight integer not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into builder_tier_config (tier, label, weight)
values
  ('micro', 'Seed', 1),
  ('small', 'Sprout', 3),
  ('medium', 'Branch', 8),
  ('large', 'Bloom', 20)
on conflict (tier) do nothing;

-- source_key nullable: most source_types map by type alone (e.g. every
-- food_log row is the same tier); next_action_log is the one type that
-- varies by kind, so it maps by (source_type, source_key).
create table if not exists builder_action_tier_map (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_key text,
  tier text not null references builder_tier_config(tier),
  created_at timestamptz not null default now(),
  unique (source_type, source_key)
);

insert into builder_action_tier_map (source_type, source_key, tier) values
  ('next_action_log', 'workout', 'small'),
  ('next_action_log', 'meal', 'micro'),
  ('next_action_log', 'fallback', 'micro'),
  ('next_action_log', 'location', 'micro'),
  ('food_log', null, 'micro'),
  ('daily_checkin', null, 'micro'),
  ('weekly_checkin', null, 'medium'),
  ('weigh_in', null, 'medium'),
  ('badge', null, 'large')
on conflict (source_type, source_key) do nothing;

create table if not exists builder_state (
  enrollment_id uuid primary key references challenge_enrollments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists builder_elements (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  sequence int not null,
  tier text not null,
  source_type text not null,
  source_id text not null,
  variant int not null default 0,
  placed_at timestamptz not null default now(),
  unique (enrollment_id, source_type, source_id)
);
create index if not exists idx_builder_elements_enrollment_seq on builder_elements(enrollment_id, sequence);

alter table builder_state enable row level security;
drop policy if exists "own read builder_state" on builder_state;
create policy "own read builder_state" on builder_state for select using (auth.uid() = user_id);
drop policy if exists "own write builder_state" on builder_state;
create policy "own write builder_state" on builder_state for insert with check (auth.uid() = user_id);
drop policy if exists "own update builder_state" on builder_state;
create policy "own update builder_state" on builder_state for update using (auth.uid() = user_id);
drop policy if exists "service builder_state" on builder_state;
create policy "service builder_state" on builder_state for all using (true) with check (true);

alter table builder_elements enable row level security;
drop policy if exists "own read builder_elements" on builder_elements;
create policy "own read builder_elements" on builder_elements for select using (auth.uid() = user_id);
drop policy if exists "own write builder_elements" on builder_elements;
create policy "own write builder_elements" on builder_elements for insert with check (auth.uid() = user_id);
drop policy if exists "own update builder_elements" on builder_elements;
create policy "own update builder_elements" on builder_elements for update using (auth.uid() = user_id);
drop policy if exists "service builder_elements" on builder_elements;
create policy "service builder_elements" on builder_elements for all using (true) with check (true);

alter table builder_tier_config enable row level security;
drop policy if exists "read builder_tier_config" on builder_tier_config;
create policy "read builder_tier_config" on builder_tier_config for select using (true);
drop policy if exists "service builder_tier_config" on builder_tier_config;
create policy "service builder_tier_config" on builder_tier_config for all using (true) with check (true);

alter table builder_action_tier_map enable row level security;
drop policy if exists "read builder_action_tier_map" on builder_action_tier_map;
create policy "read builder_action_tier_map" on builder_action_tier_map for select using (true);
drop policy if exists "service builder_action_tier_map" on builder_action_tier_map;
create policy "service builder_action_tier_map" on builder_action_tier_map for all using (true) with check (true);
