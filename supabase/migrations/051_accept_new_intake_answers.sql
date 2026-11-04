-- 051 (2026-11-04, live call: "nothing was saved"): the database's old
-- allowed-value lists rejected answers the new intake sends, so every save
-- with "Where do you train: Both" (the default) or a lose+build goal
-- ("recomp") failed. Widen each list to every value the app can send.
-- Also adds level_started_at, which the level-up feature reads but was never created.

do $$
declare r record;
begin
  -- Drop every CHECK on these columns, whatever it was named.
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('public.challenge_intake'::regclass, 'public.challenge_enrollments'::regclass)
      and pg_get_constraintdef(c.oid) ~ '(goal|training_location|activity_level|experience_level)'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.challenge_intake add constraint challenge_intake_goal_check
  check (goal is null or goal in ('lose', 'gain', 'maintain', 'recomp'));
alter table public.challenge_enrollments add constraint challenge_enrollments_goal_check
  check (goal is null or goal in ('lose', 'gain', 'maintain', 'recomp'));
alter table public.challenge_intake add constraint challenge_intake_training_location_check
  check (training_location is null or training_location in ('home', 'gym', 'both'));
alter table public.challenge_intake add constraint challenge_intake_activity_level_check
  check (activity_level is null or activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active'));
alter table public.challenge_intake add constraint challenge_intake_experience_level_check
  check (experience_level is null or experience_level in ('beginner', 'intermediate', 'advanced'));

alter table public.challenge_intake add column if not exists level_started_at timestamptz;

select 'intake answers accepted' as status;
