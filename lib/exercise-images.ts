// Form-demo images. Most entries sourced from free-exercise-db (github.com/yuhonas/free-exercise-db,
// Unlicense — public domain, no attribution required). A smaller set (Bird Dog, Crunch,
// Reverse Lunge (DB), and the replaced Leg Press / Romanian Deadlift (DB) photos) are
// free-license Pexels stock photos hand-picked to show Black/brown women performing the
// movement, per client-facing brand direction (see luf memory: client_grashanda_dunkley_plan).
// Self-hosted in public/images/exercises rather than hotlinking, for reliability.
//
// Only exercises with a GENUINELY correct name+equipment match were included — the
// source database has ~870 exercises but many "close" algorithmic matches were actually
// wrong movements (e.g. single-arm vs two-arm, cable vs dumbbell, or a real equipment-
// variant mismatch like a machine calf raise standing in for a dumbbell one) and were
// deliberately left out rather than showing an incorrect demo photo. 62 of our 157
// exercises are matched as of the second pass (2026-08-21) — the rest are either custom
// combo moves unique to this app (e.g. "Sumo Squat + Bicep Curl") with no single source
// entry, or real single exercises the source dataset genuinely doesn't have (most cardio/
// plyo bodyweight moves — Jumping Jacks, Burpees, Donkey Kick, kickboxing-style kicks, and
// the postpartum/branded ab moves). This list will grow as more real matches or custom
// photos are sourced.
// 2026-10-26: photo refresh — every demo photo now shows a Black woman (Asa: "for the
// photos only use african american women"). Kept as-is (already a Black woman doing the
// move): bicep-curl-db-supinated, bird-dog, crunch, reverse-lunge-db. All others replaced
// with free Pexels License photos (no credit required; originals at
// https://www.pexels.com/photo/<id>/). A few are the closest honest match rather than the
// exact move/equipment (no Pexels photo of a Black woman doing it exists), e.g. machine
// and barbell bench moves, leg machines, cable crunch, kettlebell moves.
// file -> Pexels ID:
//   barbell-back-squat.jpg -> 34043595
//   barbell-bench-press.jpg -> 18961994
//   barbell-bent-over-row.jpg -> 6455898
//   barbell-curl.jpg -> 6998811
//   barbell-hip-thrust.jpg -> 8846204
//   bent-over-reverse-fly.jpg -> 6455904
//   bodyweight-squats.jpg -> 8846119
//   cable-bicep-curl.jpg -> 33832199
//   cable-crunch.jpg -> 6455845
//   cable-face-pull.jpg -> 33832200
//   cable-glute-kickback.jpg -> 6303435
//   cable-lateral-raise.jpg -> 33832202
//   close-grip-bench-press.jpg -> 8353397
//   concentration-curl.jpg -> 6455925
//   db-bent-over-row.jpg -> 8032920
//   db-front-raise.jpg -> 6496099
//   db-lateral-raise.jpg -> 8846592
//   db-rear-delt-fly.jpg -> 6455904
//   db-shoulder-press.jpg -> 8846561
//   db-squat.jpg -> 8032754
//   db-step-up.jpg -> 36531948
//   db-tricep-kickback.jpg -> 8353397
//   dead-bug.jpg -> 6516222
//   dumbbell-snatch.jpg -> 8846089
//   flutter-kicks.jpg -> 6516222
//   glute-bridge-marches.jpg -> 8846115
//   glute-bridge-single-leg-lift.jpg -> 8846204
//   goblet-squat.jpg -> 8846530
//   hack-squat.jpg -> 34043586
//   hammer-curl.jpg -> 8846585
//   hanging-knee-raise.jpg -> 8770413
//   high-intensity-mountain-climbers.jpg -> 8402214
//   hip-thrust.jpg -> 20263479
//   incline-barbell-press.jpg -> 18961994
//   kb-around-the-worlds.jpg -> 2413552
//   kb-windmill.jpg -> 2413551
//   lat-pulldown.jpg -> 33832203
//   leg-extension.jpg -> 18961994
//   leg-press-single-seated.jpg -> 8846280
//   lying-leg-curl.jpg -> 8846104
//   mountain-climbers.jpg -> 8402214
//   overhead-tricep-extension-db.jpg -> 8846596
//   plank-holds.jpg -> 5149167
//   push-up.jpg -> 8846275
//   reverse-crunch.jpg -> 6455826
//   reverse-pec-deck.jpg -> 18961994
//   romanian-deadlift-barbell.jpg -> 6455898
//   romanian-deadlift-db.jpg -> 8032920
//   seated-cable-row.jpg -> 33832200
//   seated-leg-curl.jpg -> 8846104
//   single-arm-db-row.jpg -> 6455909
//   sit-ups.jpg -> 6455829
//   skull-crusher.jpg -> 8353397
//   slow-sit-up.jpg -> 6455829
//   standing-calf-raise-db.jpg -> 8846281
//   straight-arm-cable-pulldown.jpg -> 33832203
//   thrusters.jpg -> 8846212
//   walking-lunge-db.jpg -> 8032831
export const FORM_IMAGES: Record<string, string> = {
  'Barbell Curl': '/images/exercises/barbell-curl.jpg',
  'Barbell Hip Thrust': '/images/exercises/barbell-hip-thrust.jpg',
  'DB Bicep Curl (supinated)': '/images/exercises/bicep-curl-db-supinated.jpg',
  'Bird Dog': '/images/exercises/bird-dog.jpg',
  'Cable Crunch': '/images/exercises/cable-crunch.jpg',
  'Cable Face Pull': '/images/exercises/cable-face-pull.jpg',
  'DB Lateral Raise': '/images/exercises/db-lateral-raise.jpg',
  'Cable Glute Kickback': '/images/exercises/cable-glute-kickback.jpg',
  'Close-Grip Bench Press': '/images/exercises/close-grip-bench-press.jpg',
  'Crunch': '/images/exercises/crunch.jpg',
  'Dead Bug': '/images/exercises/dead-bug.jpg',
  'Flutter Kicks': '/images/exercises/flutter-kicks.jpg',
  'Glute Bridge Marches': '/images/exercises/glute-bridge-marches.jpg',
  'Goblet Squat': '/images/exercises/goblet-squat.jpg',
  'Hack Squat': '/images/exercises/hack-squat.jpg',
  'Hammer Curl': '/images/exercises/hammer-curl.jpg',
  'Hanging Knee Raise': '/images/exercises/hanging-knee-raise.jpg',
  'Lat Pulldown': '/images/exercises/lat-pulldown.jpg',
  'Hip Thrust': '/images/exercises/hip-thrust.jpg',
  'High-Intensity Mountain Climbers': '/images/exercises/high-intensity-mountain-climbers.jpg',
  'Mountain Climbers': '/images/exercises/mountain-climbers.jpg',
  'Overhead DB Tricep Extension': '/images/exercises/overhead-tricep-extension-db.jpg',
  'KB Windmill': '/images/exercises/kb-windmill.jpg',
  'Leg Press (single/seated)': '/images/exercises/leg-press-single-seated.jpg',
  'Romanian Deadlift (Barbell)': '/images/exercises/romanian-deadlift-barbell.jpg',
  'Romanian Deadlift (DB)': '/images/exercises/romanian-deadlift-db.jpg',
  'Seated Leg Curl': '/images/exercises/seated-leg-curl.jpg',
  'Lying Leg Curl': '/images/exercises/lying-leg-curl.jpg',
  'Single-Arm DB Row': '/images/exercises/single-arm-db-row.jpg',
  'Sit-Ups': '/images/exercises/sit-ups.jpg',
  'Slow Sit-Up': '/images/exercises/slow-sit-up.jpg',
  'Straight-Arm Cable Pulldown': '/images/exercises/straight-arm-cable-pulldown.jpg',
  'Thrusters': '/images/exercises/thrusters.jpg',
  'Walking Lunge (DB)': '/images/exercises/walking-lunge-db.jpg',
  'Skull Crusher': '/images/exercises/skull-crusher.jpg',
  'Dumbbell Snatch': '/images/exercises/dumbbell-snatch.jpg',
  'KB Around the Worlds': '/images/exercises/kb-around-the-worlds.jpg',
  'Seated Cable Row': '/images/exercises/seated-cable-row.jpg',
  'Reverse Crunch': '/images/exercises/reverse-crunch.jpg',
  'Reverse Lunge (DB)': '/images/exercises/reverse-lunge-db.jpg',
  'Plank Holds': '/images/exercises/plank-holds.jpg',
  'Bent-Over Reverse Fly': '/images/exercises/bent-over-reverse-fly.jpg',
  // Second matching pass — same source/license, same "genuinely correct
  // match only" standard as above. A few of these use a different equipment
  // variant of the SAME free-exercise-db entry than the literal name search
  // would suggest (e.g. Standing Calf Raise here is genuinely a dumbbell
  // variant match, not the machine version, since our exercise is tagged
  // dumbbell equipment) — checked against equipment/muscle, not name alone.
  'Barbell Bent-Over Row': '/images/exercises/barbell-bent-over-row.jpg',
  'Bodyweight Squats': '/images/exercises/bodyweight-squats.jpg',
  'Concentration Curl': '/images/exercises/concentration-curl.jpg',
  'DB Front Raise': '/images/exercises/db-front-raise.jpg',
  'DB Shoulder Press': '/images/exercises/db-shoulder-press.jpg',
  'DB Squat': '/images/exercises/db-squat.jpg',
  'DB Tricep Kickback': '/images/exercises/db-tricep-kickback.jpg',
  'Leg Extension': '/images/exercises/leg-extension.jpg',
  'Standing Calf Raise': '/images/exercises/standing-calf-raise-db.jpg',
  'DB Bent-Over Row': '/images/exercises/db-bent-over-row.jpg',
  'DB Step-Up': '/images/exercises/db-step-up.jpg',
  'Glute Bridge Single-Leg Lift': '/images/exercises/glute-bridge-single-leg-lift.jpg',
  'Push-Up': '/images/exercises/push-up.jpg',
  'Barbell Bench Press': '/images/exercises/barbell-bench-press.jpg',
  'Cable Bicep Curl': '/images/exercises/cable-bicep-curl.jpg',
  'Cable Lateral Raise': '/images/exercises/cable-lateral-raise.jpg',
  'Incline Barbell Press': '/images/exercises/incline-barbell-press.jpg',
  'DB Rear Delt Fly': '/images/exercises/db-rear-delt-fly.jpg',
  'Reverse Pec Deck': '/images/exercises/reverse-pec-deck.jpg',
  'Barbell Back Squat': '/images/exercises/barbell-back-squat.jpg',
}
