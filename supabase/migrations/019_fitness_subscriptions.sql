-- 019: Move the fitness product from one-time purchases to recurring monthly
-- subscription tiers ($10 app-only / $20 challenge / $50 inner-circle). Existing
-- one-time rows are untouched — they simply never get a stripe_subscription_id,
-- so the tier-downgrade cron naturally skips them.
alter table challenge_enrollments drop constraint if exists challenge_enrollments_tier_check;
alter table challenge_enrollments add constraint challenge_enrollments_tier_check
  check (tier in ('app', 'challenge', 'inner_circle'));

alter table challenge_enrollments add column if not exists stripe_customer_id text;
alter table challenge_enrollments add column if not exists stripe_subscription_id text;
alter table challenge_enrollments add column if not exists tier_started_at timestamptz;

create index if not exists idx_enrollments_stripe_subscription on challenge_enrollments(stripe_subscription_id);
