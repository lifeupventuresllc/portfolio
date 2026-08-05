-- Layer 1 Phase 2: passive app-open signal. One column, no new table — a
-- prolonged silence (she's stopped opening the app at all, before even
-- missing a required workout/food day) is itself an early dip signal.
alter table challenge_enrollments add column if not exists last_active_at timestamptz;
