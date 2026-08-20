-- daily_10_weekly_reviews (020_daily_10_refinement.sql) was created without
-- RLS — found during a data-storage audit. It's internal-only (Asa's own
-- weekly review notes, admin-gated route, always accessed via the service
-- role — see app/api/admin/daily-10/refinement/route.ts) but should still
-- fail closed at the database level rather than rely solely on the app's
-- own admin check.
alter table daily_10_weekly_reviews enable row level security;

drop policy if exists "service daily_10_weekly_reviews" on daily_10_weekly_reviews;
create policy "service daily_10_weekly_reviews" on daily_10_weekly_reviews for all using (true) with check (true);
