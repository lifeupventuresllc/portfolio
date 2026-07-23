-- ============================================================
-- CLIENT SEED — Ms. Money Maker (Life-Up Fitness client #1)
-- Snatched Without Starving · Founding cohort · manual Week-1 delivery 2026-07-15
-- Run AFTER migration 011_challenge_system.sql is applied.
-- Idempotent: safe to run more than once (keyed on email).
-- NOTE: email is a placeholder — update to her real email when you have it.
--       Real contact lives in challenge_intake.form_data (IG + phone).
-- ============================================================

WITH cohort AS (
  SELECT id FROM challenge_cohorts WHERE slug = 'founding' LIMIT 1
),
enr AS (
  INSERT INTO challenge_enrollments
    (cohort_id, email, name, tier, goal, status, amount, intake_completed, started_at)
  SELECT c.id,
         'msmoneymaker.howardcustoms@client.lifeupfitness',  -- TODO: replace with her real email
         'Ms. Money Maker', 'challenge', 'lose', 'active', 14700, true, now()
  FROM cohort
  WHERE NOT EXISTS (
    SELECT 1 FROM challenge_enrollments
    WHERE email = 'msmoneymaker.howardcustoms@client.lifeupfitness'
  )
  RETURNING id
),
intk AS (
  INSERT INTO challenge_intake
    (enrollment_id, age, sex, height_in, weight_lbs, goal, target_lbs,
     activity_level, experience_level, training_location, days_per_week,
     weekly_food_budget, food_preferences, dislikes_allergies, injuries_limitations, form_data)
  SELECT id, 21, 'female', 67, 260, 'lose', 185,
         'light', 'beginner', 'home', 3,
         NULL,
         'Budget-friendly cook-twice meals; enjoys pasta/rice dishes (Marry Me Chicken Pasta, Chicken Pineapple Fried Rice, Gochujang beef).',
         NULL, NULL,
         '{
           "display_name": "Mrs.moneymaker",
           "instagram": "@howar.dcustoms",
           "phone": "475-242-7310",
           "location": "New Haven, CT",
           "about": "First paying client. Black business owner (custom accessories), has a young daughter.",
           "delivery": "Week 1 delivered manually 2026-07-15 via Google Drive folder + IG DM. 20-min kickoff call to be scheduled.",
           "blueprint": {"bmr": 1977, "neat": 225, "exercise_burn": 250, "maintenance_rest": 2202, "maintenance_workout": 2452, "protein_g": 195}
         }'::jsonb
  FROM enr
  RETURNING enrollment_id
),
nut AS (
  INSERT INTO challenge_nutrition_plans
    (enrollment_id, week_number, calories, protein_g, carbs_g, fats_g, meals, grocery_list, est_weekly_cost, status)
  SELECT id, 1, 1752, 195, 134, 49,
    '{
      "targets": {
        "rest_day":   {"cal": 1752, "protein": 195, "carbs": 134, "fat": 49},
        "workout_day":{"cal": 2102, "protein": 195, "carbs": 182, "fat": 66}
      },
      "portion_factor": 0.91,
      "daily_snack":     {"name": "Raspberry Chocolate Protein Bar", "cal": 210, "protein": 20},
      "workout_dessert": {"name": "Chocolate Chip Skillet Cookie", "cal": 432, "protein": 40},
      "free_day": "Sunday",
      "cook_sessions": [
        {"label": "Cook Sunday", "days": "Mon-Wed", "protein_theme": "Beef & Chicken", "meals": [
          {"slot": "breakfast", "name": "Beef & Egg Breakfast Power Bowl", "cal": 552, "protein": 51, "carbs": 40, "fat": 20},
          {"slot": "lunch", "name": "Chicken Pineapple Fried Rice", "cal": 613, "protein": 66, "carbs": 56, "fat": 12},
          {"slot": "dinner", "name": "Creamy Gochujang Noodles with Sesame Beef", "cal": 500, "protein": 40, "carbs": 69, "fat": 8}
        ]},
        {"label": "Cook Wednesday", "days": "Thu-Sat", "protein_theme": "Chicken & Steak", "meals": [
          {"slot": "breakfast", "name": "Steak, Egg & Cheese Breakfast Bagels", "cal": 495, "protein": 71, "carbs": 36, "fat": 21},
          {"slot": "lunch", "name": "Marry Me Chicken Pasta", "cal": 660, "protein": 55, "carbs": 60, "fat": 25},
          {"slot": "dinner", "name": "Chicken Bacon Ranch Pasta Salad", "cal": 570, "protein": 45, "carbs": 42, "fat": 24}
        ]}
      ],
      "note": "Auto-plan corrected: added a daily protein snack + swapped Lobster Bisque Pasta -> Chicken Pineapple Fried Rice. Weekly-avg protein ~190g."
    }'::jsonb,
    '{
      "Proteins": ["Chicken breast ~2.5 lb", "Lean ground beef or steak strips ~1.25 lb", "Thin sliced steak ~0.75 lb", "Bacon 1 pack", "Eggs 1.5 dozen", "Protein bars x7"],
      "Produce": ["Pineapple chunks", "Green onions", "Garlic", "Yellow onion x2", "Cherry tomatoes", "Baby spinach", "Broccoli / stir-fry mix x2", "Romaine or mixed greens"],
      "Grains": ["Jasmine/white rice 2 lb", "Pasta x2 boxes", "Ramen/noodles x2", "Bagels 1 pack"],
      "Dairy": ["Shredded + sliced cheese", "Heavy cream/half-and-half", "Ranch dressing", "Butter"],
      "Pantry": ["Soy sauce, gochujang, sesame oil, sesame seeds", "Sun-dried tomatoes", "Teriyaki/pineapple sauce", "Olive oil + seasonings", "Protein cookie / skillet-cookie mix"]
    }'::jsonb,
    NULL, 'published'
  FROM enr
)
INSERT INTO challenge_workout_plans
  (enrollment_id, week_number, location, difficulty, plan, status)
SELECT id, 1, 'home', 'beginner',
  '{
    "days_per_week": 3,
    "per_day_min": 20,
    "style": "home",
    "level": "beginner",
    "focus": "Fat loss + shape, joint-friendly for a beginner at 260 lb",
    "walking": "15-20 min easy walk, 3-4x/week",
    "warmup": ["Arm Circles (fwd/back) 60s", "Torso Twists 60s", "Leg Swings / Hip Circles 60s"],
    "cooldown": ["Toe Touches (Hamstrings) 60s", "Cross-Body Arm Stretch 60s", "Quad Stretch 60s"],
    "days": [
      {"day": 1, "focus": "Full Body", "moves": ["Bodyweight Squats 30s", "Pulsating Squats 30s", "Lunges in Place 30s", "Air Punches / Jabs 30s", "March in Place 60s"]},
      {"day": 2, "focus": "Full Body", "moves": ["Pulsating Squats 30s", "Lunges in Place 30s", "Air Punches / Jabs 30s", "Standing Oblique Touches 30s", "Running in Place (Low) 60s"]},
      {"day": 3, "focus": "Full Body", "moves": ["Lunges in Place 30s", "Air Punches / Jabs 30s", "Standing Oblique Touches 30s", "Cross Toe Touches 30s", "March in Place 60s"]}
    ]
  }'::jsonb,
  'published'
FROM enr;
