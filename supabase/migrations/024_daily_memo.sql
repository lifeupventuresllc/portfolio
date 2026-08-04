-- Daily voice memo system (Free-First Rebuild, 2026-08-04).
-- Extends push_subscriptions with what's needed to send one memo/day at a
-- randomized-but-stable local-time slot per user, never at night, without
-- double-sending across hourly cron runs.
alter table push_subscriptions add column if not exists timezone text;
alter table push_subscriptions add column if not exists last_daily_memo_sent date;
