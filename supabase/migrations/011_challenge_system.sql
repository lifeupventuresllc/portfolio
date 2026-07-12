-- ============================================================
-- 011_challenge_system.sql
-- "Snatched Without Starving" fitness challenge system
-- Tiers: challenge ($147) + inner_circle ($300)
-- Foundation tables: cohorts, enrollments, intake, nutrition,
-- workouts, weekly check-ins, progress tracking.
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- Cohorts (scarcity engine: limited slots per cohort) ----------
CREATE TABLE IF NOT EXISTS challenge_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  start_date DATE,
  end_date DATE,
  slot_limit INTEGER NOT NULL DEFAULT 15,
  slots_filled INTEGER NOT NULL DEFAULT 0,
  inner_circle_limit INTEGER NOT NULL DEFAULT 5,
  inner_circle_filled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Enrollments (a woman's spot in a cohort) ----------
CREATE TABLE IF NOT EXISTS challenge_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES challenge_cohorts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  tier TEXT NOT NULL DEFAULT 'challenge' CHECK (tier IN ('challenge', 'inner_circle')),
  goal TEXT CHECK (goal IN ('lose', 'gain', 'maintain')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'refunded')),
  amount INTEGER,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  intake_completed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Intake (stats that power the automated nutrition tool) ----------
CREATE TABLE IF NOT EXISTS challenge_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  age INTEGER,
  sex TEXT DEFAULT 'female' CHECK (sex IN ('female', 'male', 'other')),
  height_in NUMERIC,
  weight_lbs NUMERIC,
  goal TEXT CHECK (goal IN ('lose', 'gain', 'maintain')),
  target_lbs NUMERIC,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  training_location TEXT CHECK (training_location IN ('home', 'gym', 'both')),
  days_per_week INTEGER,
  weekly_food_budget INTEGER,
  food_preferences TEXT,
  dislikes_allergies TEXT,
  injuries_limitations TEXT,
  form_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Nutrition plans ----------
CREATE TABLE IF NOT EXISTS challenge_nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  week_number INTEGER NOT NULL DEFAULT 1,
  calories INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fats_g INTEGER,
  meals JSONB,
  grocery_list JSONB,
  est_weekly_cost INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Workout plans ----------
CREATE TABLE IF NOT EXISTS challenge_workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  week_number INTEGER NOT NULL DEFAULT 1,
  location TEXT CHECK (location IN ('home', 'gym', 'both')),
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  plan JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Weekly check-ins ----------
CREATE TABLE IF NOT EXISTS challenge_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  week_number INTEGER NOT NULL,
  weight_lbs NUMERIC,
  measurements JSONB,
  photo_urls TEXT[],
  client_notes TEXT,
  coach_response TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'reviewed')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Progress log ----------
CREATE TABLE IF NOT EXISTS challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  logged_on DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_lbs NUMERIC,
  measurements JSONB,
  photo_urls TEXT[],
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON challenge_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_cohort ON challenge_enrollments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_email ON challenge_enrollments(email);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON challenge_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_intake_enrollment ON challenge_intake(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_enrollment ON challenge_nutrition_plans(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_workout_enrollment ON challenge_workout_plans(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_checkins_enrollment ON challenge_checkins(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON challenge_checkins(status);
CREATE INDEX IF NOT EXISTS idx_progress_enrollment ON challenge_progress(enrollment_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE challenge_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;

-- ---- Cohorts ----
DROP POLICY IF EXISTS "Anyone can view open cohorts" ON challenge_cohorts;
CREATE POLICY "Anyone can view open cohorts" ON challenge_cohorts FOR SELECT USING (status IN ('open', 'active'));
DROP POLICY IF EXISTS "Admins can manage cohorts" ON challenge_cohorts;
CREATE POLICY "Admins can manage cohorts" ON challenge_cohorts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')));
DROP POLICY IF EXISTS "Service role can update cohorts" ON challenge_cohorts;
CREATE POLICY "Service role can update cohorts" ON challenge_cohorts FOR UPDATE USING (true);

-- ---- Enrollments ----
DROP POLICY IF EXISTS "Users can view their own enrollments" ON challenge_enrollments;
CREATE POLICY "Users can view their own enrollments" ON challenge_enrollments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all enrollments" ON challenge_enrollments;
CREATE POLICY "Admins can view all enrollments" ON challenge_enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')));
DROP POLICY IF EXISTS "Admins can manage enrollments" ON challenge_enrollments;
CREATE POLICY "Admins can manage enrollments" ON challenge_enrollments FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')));
DROP POLICY IF EXISTS "Service role can insert enrollments" ON challenge_enrollments;
CREATE POLICY "Service role can insert enrollments" ON challenge_enrollments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can update enrollments" ON challenge_enrollments;
CREATE POLICY "Service role can update enrollments" ON challenge_enrollments FOR UPDATE USING (true);

-- ---- Intake ----
DROP POLICY IF EXISTS "Users manage their own intake" ON challenge_intake;
CREATE POLICY "Users manage their own intake" ON challenge_intake FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all intake" ON challenge_intake;
CREATE POLICY "Admins can view all intake" ON challenge_intake FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')));
DROP POLICY IF EXISTS "Service role can manage intake" ON challenge_intake;
CREATE POLICY "Service role can manage intake" ON challenge_intake FOR ALL USING (true) WITH CHECK (true);

-- ---- Nutrition plans ----
DROP POLICY IF EXISTS "Users can view their own nutrition plans" ON challenge_nutrition_plans;
CREATE POLICY "Users can view their own nutrition plans" ON challenge_nutrition_plans FOR SELECT USING (auth.uid() = user_id AND status = 'published');
DROP POLICY IF EXISTS "Admins can manage nutrition plans" ON challenge_nutrition_plans;
CREATE POLICY "Admins can manage nutrition plans" ON challenge_nutrition_plans FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')));
DROP POLICY IF EXISTS "Service role can manage nutrition plans" ON challenge_nutrition_plans;
CREATE POLICY "Service role can manage nutrition plans" ON challenge_nutrition_plans FOR ALL USING (true) WITH CHECK (true);

-- ---- Workout plans ----
DROP POLICY IF EXISTS "Users can view their own workout plans" ON challenge_workout_plans;
CREATE POLICY "Users can view their own workout plans" ON challenge_workout_plans FOR SELECT USING (auth.uid() = user_id AND status = 'published');
DROP POLICY IF EXISTS "Admins can manage workout plans" ON challenge_workout_plans;
CREATE POLICY "Admins can manage workout plans" ON challenge_workout_plans FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')));
DROP POLICY IF EXISTS "Service role can manage workout plans" ON challenge_workout_plans;
CREATE POLICY "Service role can manage workout plans" ON challenge_workout_plans FOR ALL USING (true) WITH CHECK (true);

-- ---- Check-ins ----
DROP POLICY IF EXISTS "Users manage their own checkins" ON challenge_checkins;
CREATE POLICY "Users manage their own checkins" ON challenge_checkins FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all checkins" ON challenge_checkins;
CREATE POLICY "Admins can manage all checkins" ON challenge_checkins FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')));
DROP POLICY IF EXISTS "Service role can manage checkins" ON challenge_checkins;
CREATE POLICY "Service role can manage checkins" ON challenge_checkins FOR ALL USING (true) WITH CHECK (true);

-- ---- Progress ----
DROP POLICY IF EXISTS "Users manage their own progress" ON challenge_progress;
CREATE POLICY "Users manage their own progress" ON challenge_progress FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all progress" ON challenge_progress;
CREATE POLICY "Admins can view all progress" ON challenge_progress FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')));
DROP POLICY IF EXISTS "Service role can manage progress" ON challenge_progress;
CREATE POLICY "Service role can manage progress" ON challenge_progress FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Seed: first cohort + catalog products for the two tiers
-- ============================================================
INSERT INTO challenge_cohorts (name, slug, slot_limit, inner_circle_limit, status)
VALUES ('Founding Cohort', 'founding', 15, 5, 'open')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, description, price, slug, category, active)
VALUES
  ('Snatched Without Starving — 6-Week Challenge', 'Custom training, done-for-you weekly nutrition, weekly coach check-ins, community, and The Menu cookbook. Founding price.', 14700, 'snatched-challenge', 'fitness', true),
  ('Snatched Without Starving — Inner Circle', 'Everything in the Challenge plus weekly 1:1 video calls, direct access, fully custom plans, video form-checks, and faith + mindset coaching. Limited to 5 spots.', 30000, 'snatched-inner-circle', 'fitness', true)
ON CONFLICT DO NOTHING;
