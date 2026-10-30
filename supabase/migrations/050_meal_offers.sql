-- 050: Meal-time offers (2026-10-30, Prompt 3 "Auto-send with yes or no").
--
-- At her usual time for a meal, one meal ready to go arrives as a
-- notification with Yes / No (app/api/cron/meal-offer). Every offer and every
-- answer is saved here so suggestions get better (the answers also feed
-- challenge_intake.form_data.meal_memory, picked / skipped).
--
--   offer_key  '<her local day>:<meal>' — one offer per meal per day
--              (forced test offers get a ':test-<ms>' suffix)
--   attempt    1 = the notification, 2 = the one different meal after a No
--   card       what was shown (meal, place, price, photo, arrival, …)
--   backup     attempt 1 only: the different meal saved for a No
--   answer     'yes' | 'no' | null (never answered)
--   answered_via  'page' (/plan/offer/<id>) | 'notification' (Android buttons)
--
-- Nothing is ever ordered or charged from this table: a Yes logs the meal +
-- price in challenge_food_log and opens her delivery app.

create table if not exists meal_offers (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references challenge_enrollments(id) on delete cascade,
  user_id uuid,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  day date not null,
  offer_key text not null,
  attempt smallint not null default 1 check (attempt in (1, 2)),
  meal_key text not null,
  card jsonb not null,
  backup jsonb,
  shown_at timestamptz not null default now(),
  pushed boolean not null default false,
  answer text check (answer in ('yes', 'no')),
  answered_at timestamptz,
  answered_via text check (answered_via in ('page', 'notification')),
  unique (enrollment_id, offer_key, attempt)
);
create index if not exists idx_meal_offers_enrollment_day on meal_offers(enrollment_id, day);

-- The app only touches this table through the server's service-role client.
alter table meal_offers enable row level security;
drop policy if exists "service meal_offers" on meal_offers;
create policy "service meal_offers" on meal_offers for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Every-15-minutes scheduler (Vercel's own crons on this plan run once a
-- day). pg_cron + pg_net call the endpoint with the CRON_SECRET bearer header.
--
-- The secret is NOT in this file. It's read from Supabase Vault at run time.
-- OWNER, ONE TIME, in the Supabase SQL editor — paste the same value as the
-- CRON_SECRET env var on Vercel in place of <CRON_SECRET>:
--
--     select vault.create_secret('<CRON_SECRET>', 'cron_secret');
--
-- (To change it later: select vault.update_secret(
--    (select id from vault.secrets where name = 'cron_secret'), '<CRON_SECRET>');)
-- Until that secret exists the job still runs, gets a 401, and sends nothing.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'meal-offer') then
    perform cron.unschedule('meal-offer');
  end if;
end $$;

select cron.schedule(
  'meal-offer',
  '*/15 * * * *',
  $job$
  select net.http_get(
    url := 'https://www.asaluke.io/api/cron/meal-offer',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1), '')
    ),
    timeout_milliseconds := 55000
  );
  $job$
);
