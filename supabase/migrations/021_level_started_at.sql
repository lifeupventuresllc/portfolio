-- 021: Track when a member's current experience_level actually started, separate
-- from the generic updated_at (which changes on any intake edit, not specifically
-- level changes). Powers the proactive "ready to level up?" nudge — the app can
-- now tell how long she's genuinely been at her current level, not just when she
-- last touched her intake for any reason.
alter table challenge_intake add column if not exists level_started_at timestamptz;
update challenge_intake set level_started_at = created_at where level_started_at is null;
alter table challenge_intake alter column level_started_at set default now();
