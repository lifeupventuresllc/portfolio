-- 040: Friends tab — one accountability partner, not a follow graph
-- (Asa's spec 2026-09-02: partners-first, invite-by-code pairing, streak +
-- check-in visibility + a shared weekly goal + a direct chat thread. The
-- open "follow" feed already exists as the Community/Connect tab — this
-- does not duplicate it).

create table if not exists partner_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  inviter_enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_by_enrollment_id uuid references challenge_enrollments(id) on delete set null,
  used_at timestamptz
);
create index if not exists idx_partner_invites_inviter on partner_invites(inviter_enrollment_id);

alter table partner_invites enable row level security;
drop policy if exists "service partner_invites" on partner_invites;
create policy "service partner_invites" on partner_invites for all using (true) with check (true);
drop policy if exists "own read partner_invites" on partner_invites;
create policy "own read partner_invites" on partner_invites for select using (
  inviter_enrollment_id in (select id from challenge_enrollments where user_id = auth.uid())
);

create table if not exists accountability_partnerships (
  id uuid primary key default gen_random_uuid(),
  enrollment_a uuid not null references challenge_enrollments(id) on delete cascade,
  enrollment_b uuid not null references challenge_enrollments(id) on delete cascade,
  weekly_goal_workouts integer not null default 4,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now()
);
create index if not exists idx_partnerships_a on accountability_partnerships(enrollment_a) where status = 'active';
create index if not exists idx_partnerships_b on accountability_partnerships(enrollment_b) where status = 'active';

alter table accountability_partnerships enable row level security;
drop policy if exists "service accountability_partnerships" on accountability_partnerships;
create policy "service accountability_partnerships" on accountability_partnerships for all using (true) with check (true);
drop policy if exists "own read accountability_partnerships" on accountability_partnerships;
create policy "own read accountability_partnerships" on accountability_partnerships for select using (
  enrollment_a in (select id from challenge_enrollments where user_id = auth.uid())
  or enrollment_b in (select id from challenge_enrollments where user_id = auth.uid())
);

create table if not exists partner_messages (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references accountability_partnerships(id) on delete cascade,
  sender_enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'nudge')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_partner_messages_partnership on partner_messages(partnership_id, created_at);

alter table partner_messages enable row level security;
drop policy if exists "service partner_messages" on partner_messages;
create policy "service partner_messages" on partner_messages for all using (true) with check (true);
drop policy if exists "own read partner_messages" on partner_messages;
create policy "own read partner_messages" on partner_messages for select using (
  partnership_id in (
    select id from accountability_partnerships
    where enrollment_a in (select id from challenge_enrollments where user_id = auth.uid())
       or enrollment_b in (select id from challenge_enrollments where user_id = auth.uid())
  )
);
