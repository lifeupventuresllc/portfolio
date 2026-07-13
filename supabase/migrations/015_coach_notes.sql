-- 015: Private coach notes per client, shown in the Coach CRM 360 view.
ALTER TABLE challenge_enrollments ADD COLUMN IF NOT EXISTS coach_notes TEXT;
