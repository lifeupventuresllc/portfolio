-- 044: Location + meal-timing awareness for the eating-out engine
-- (2026-09-23, Asa's direct ask). Reuses the EXISTING eating-out next-action
-- path (state.ts's eatingOutToday/eatingOutPick, candidates.ts's 'location'
-- kind) — this migration only adds the raw signal storage two new detectors
-- read from; nothing here creates a second, parallel recommendation system.

-- Her most recent real GPS position, opt-in only (see components/
-- LocationOptIn.tsx — never requested without a real tap). Overwritten on
-- every real ping, never a history — this is "where is she right now,"
-- not a location log. Stored on the enrollment row, same pattern
-- last_active_at already uses.
alter table challenge_enrollments add column if not exists last_lat double precision;
alter table challenge_enrollments add column if not exists last_lng double precision;
alter table challenge_enrollments add column if not exists last_location_at timestamptz;
