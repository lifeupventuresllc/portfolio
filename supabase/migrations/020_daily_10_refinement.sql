-- 020: Step 6 of the Daily 10 — "The Refinement" (weekly review & adjustment).
-- Stores Asa's written decision each week alongside the week-over-week numbers,
-- which the API computes on the fly from existing tables (no new counters needed).
create table if not exists daily_10_weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
