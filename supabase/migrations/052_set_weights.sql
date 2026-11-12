-- 052: the weight she used on each set (2026-11-12, Asa: "picking the weight
-- for each user ... like Fitbod"). The workout screen suggests a weight
-- (lib/weight-picker.ts); every Done tap saves the weight she actually used,
-- so next time starts from it and "Go up a weight today" shows the real
-- next number. Null = a move with no weight (bodyweight, cardio, band).
alter table workout_set_logs add column if not exists weight_lb numeric;
create index if not exists idx_workout_set_logs_weight on workout_set_logs(enrollment_id, exercise_name, created_at desc) where weight_lb is not null;
