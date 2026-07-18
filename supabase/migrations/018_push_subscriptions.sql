-- 018: Web Push subscriptions — one row per device that opted into reminders.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references challenge_enrollments(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_subs_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;
drop policy if exists "own push read" on push_subscriptions;
create policy "own push read" on push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "own push write" on push_subscriptions;
create policy "own push write" on push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "own push delete" on push_subscriptions;
create policy "own push delete" on push_subscriptions for delete using (auth.uid() = user_id);
drop policy if exists "service push" on push_subscriptions;
create policy "service push" on push_subscriptions for all using (true) with check (true);
