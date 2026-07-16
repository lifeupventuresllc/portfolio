-- 016: Food log — what she actually ate each day (MyFitnessPal-style).
CREATE TABLE IF NOT EXISTS challenge_food_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  logged_on DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  meal TEXT,                    -- breakfast | lunch | dinner | snack (optional grouping)
  name TEXT NOT NULL,
  brand TEXT,
  servings NUMERIC NOT NULL DEFAULT 1,
  serving_label TEXT,
  calories INTEGER NOT NULL DEFAULT 0,
  protein_g INTEGER NOT NULL DEFAULT 0,
  carbs_g INTEGER NOT NULL DEFAULT 0,
  fats_g INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_food_log_lookup ON challenge_food_log(enrollment_id, logged_on);

ALTER TABLE challenge_food_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own food log read" ON challenge_food_log;
CREATE POLICY "own food log read" ON challenge_food_log FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own food log write" ON challenge_food_log;
CREATE POLICY "own food log write" ON challenge_food_log FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own food log delete" ON challenge_food_log;
CREATE POLICY "own food log delete" ON challenge_food_log FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service food log" ON challenge_food_log;
CREATE POLICY "service food log" ON challenge_food_log FOR ALL USING (true) WITH CHECK (true);
