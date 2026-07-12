// ============================================================
// Life-Up Fitness — Workout exercise library (encoded)
// Gym (push/pull), abs, home bodyweight, cardio. Tagged by
// min-level, movement, muscle, equipment. Free weights ★ first.
// ============================================================

export type Level = 1 | 2 | 3 // 1 beginner, 2 intermediate, 3 advanced
export type Movement = 'push' | 'pull'
export type Equip = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight'
export type Muscle =
  | 'glutes' | 'hamstrings' | 'quads' | 'calves'
  | 'back' | 'shoulders' | 'chest' | 'biceps' | 'triceps'

export interface GymExercise {
  name: string
  equip: Equip
  free: boolean // ★ free weight (barbell/dumbbell/bodyweight compound)
  movement: Movement
  muscle: Muscle
  minLevel: Level
  cue: string
}

const F = (e: Equip) => e === 'barbell' || e === 'dumbbell' || e === 'bodyweight'
const ex = (name: string, equip: Equip, movement: Movement, muscle: Muscle, minLevel: Level, cue: string): GymExercise =>
  ({ name, equip, free: F(equip), movement, muscle, minLevel, cue })

// ---------- GYM POOL ----------
export const GYM_POOL: GymExercise[] = [
  // GLUTES / HAMSTRINGS (pull-dominant hinges + glute work)
  ex('Dumbbell Hip Thrust', 'dumbbell', 'pull', 'glutes', 1, 'Upper back on bench, DB on hips. Drive hips up, squeeze glutes hard, hold 1 sec at top, lower slow.'),
  ex('Barbell Hip Thrust', 'barbell', 'pull', 'glutes', 2, 'Bar on hips, upper back on bench. Drive hips to full lockout, squeeze glutes, hold, lower with control.'),
  ex('Glute Bridge', 'bodyweight', 'pull', 'glutes', 1, 'Feet flat, drive hips up, squeeze glutes at top, lower slow.'),
  ex('Romanian Deadlift (DB)', 'dumbbell', 'pull', 'hamstrings', 1, 'Soft knees, hinge hips back, lower DBs along legs to a deep hamstring stretch, drive hips forward, squeeze glutes.'),
  ex('Romanian Deadlift (Barbell)', 'barbell', 'pull', 'hamstrings', 2, 'Bar close to legs, hinge back with flat back to a hamstring stretch, drive hips forward to lockout.'),
  ex('Cable Pull-Through', 'cable', 'pull', 'glutes', 1, 'Rope between legs, hinge back, drive hips forward and squeeze glutes at the top.'),
  ex('Cable Glute Kickback', 'cable', 'pull', 'glutes', 1, 'Ankle strap, kick leg straight back, squeeze glute, control the return.'),
  ex('Donkey Kick', 'bodyweight', 'pull', 'glutes', 1, 'On all fours, kick one leg up till thigh is parallel, squeeze glute, switch sides.'),
  ex('Lying Leg Curl', 'machine', 'pull', 'hamstrings', 1, 'Face down, curl heels toward glutes, squeeze at top, lower slow — no dropping the weight.'),
  ex('Seated Leg Curl', 'machine', 'pull', 'hamstrings', 1, 'Curl the pad down and under, squeeze hamstrings, control back up.'),
  // QUADS (push-dominant squats/lunges)
  ex('Goblet Squat', 'dumbbell', 'push', 'quads', 1, 'Hold weight at chest, sit straight down chest tall, knees track over toes, drive through heels.'),
  ex('Sumo Squat (DB)', 'dumbbell', 'push', 'quads', 1, 'Wide stance, toes out, one DB between legs, lower straight down, drive through heels, squeeze glutes.'),
  ex('DB Squat', 'dumbbell', 'push', 'quads', 1, 'DBs at sides, feet shoulder-width, lower to parallel, drive through heels, chest up.'),
  ex('Barbell Back Squat', 'barbell', 'push', 'quads', 2, 'Bar on upper back, brace core, sit down and back to parallel, drive up through the whole foot.'),
  ex('Reverse Lunge (DB)', 'dumbbell', 'push', 'quads', 1, 'Step back, drop back knee toward floor, push through the front heel to stand. Chest tall.'),
  ex('Walking Lunge (DB)', 'dumbbell', 'push', 'quads', 2, 'Step forward into a lunge, drive through the front heel, walk into the next rep.'),
  ex('Bulgarian Split Squat (DB)', 'dumbbell', 'push', 'quads', 2, 'Rear foot on bench, drop straight down on the front leg, drive up through the front heel.'),
  ex('Curtsy Lunge (DB)', 'dumbbell', 'push', 'glutes', 2, 'Step one leg behind and across, lower, drive back to stand — hits glutes and inner thigh.'),
  ex('DB Step-Up', 'dumbbell', 'push', 'quads', 1, 'Full foot on the bench, drive through the top heel to stand tall, control down.'),
  ex('Leg Press (single/seated)', 'machine', 'push', 'quads', 1, 'Feet shoulder-width, lower to a controlled depth, press to near-full extension.'),
  ex('Hack Squat', 'machine', 'push', 'quads', 2, 'Shoulders under pads, sit down deep, drive through heels to stand.'),
  ex('Leg Extension', 'machine', 'push', 'quads', 1, 'Extend to full contraction, hold 1 sec, lower slow.'),
  // CALVES
  ex('Standing Calf Raise', 'dumbbell', 'push', 'calves', 1, 'Rise onto toes as high as possible, squeeze calves at the top, lower slow for a full stretch.'),
  ex('Single-Arm Tibialis Raise (wall)', 'bodyweight', 'pull', 'calves', 1, 'Back to wall, lift toes toward shins as high as possible, squeeze the shin, lower slow.'),
  // BACK
  ex('DB Bent-Over Row', 'dumbbell', 'pull', 'back', 1, 'Hinge, flat back, pull DBs to your sides, drive elbows back, squeeze shoulder blades, lower controlled.'),
  ex('Single-Arm DB Row', 'dumbbell', 'pull', 'back', 1, 'Brace on bench, pull elbow back, squeeze the back, control down.'),
  ex('Chest-Supported DB Row', 'dumbbell', 'pull', 'back', 1, 'Chest on an incline bench, row DBs up, squeeze shoulder blades — no momentum.'),
  ex('Barbell Bent-Over Row', 'barbell', 'pull', 'back', 2, 'Hinge with flat back, pull bar to lower ribs, elbows back, squeeze, lower controlled.'),
  ex('Seated Cable Row', 'cable', 'pull', 'back', 1, 'Sit tall, pull to belly, elbows straight back, squeeze shoulder blades, slow return.'),
  ex('Lat Pulldown', 'machine', 'pull', 'back', 1, 'Pull the bar to upper chest, drive elbows toward the floor, squeeze lats, controlled return.'),
  ex('Kneeling Crossbody Cable Lat Pulldown', 'cable', 'pull', 'back', 2, 'Kneel, high cable, palms up, lead with the elbow, rotate torso slightly at the start for a deeper lat stretch.'),
  ex('Cable Face Pull', 'cable', 'pull', 'back', 1, 'Rope at face height, pull toward face flaring elbows wide, squeeze rear delts, slow return.'),
  ex('Straight-Arm Cable Pulldown', 'cable', 'pull', 'back', 2, 'Arms straight, pull the bar down to your thighs using the lats, squeeze, control up.'),
  ex('Assisted Pull-Up', 'machine', 'pull', 'back', 1, 'Pull chin over the bar, drive elbows down, squeeze the back, control the descent.'),
  // SHOULDERS
  ex('DB Shoulder Press', 'dumbbell', 'push', 'shoulders', 1, 'Sit tall, press DBs overhead to full extension, brace core, lower slow to shoulder height.'),
  ex('Arnold Press (DB)', 'dumbbell', 'push', 'shoulders', 2, 'Start palms facing you, rotate out as you press overhead, reverse on the way down.'),
  ex('Barbell Overhead Press', 'barbell', 'push', 'shoulders', 2, 'Bar at shoulders, brace, press straight overhead to lockout, lower with control.'),
  ex('DB Lateral Raise', 'dumbbell', 'push', 'shoulders', 1, 'Slight elbow bend, raise to shoulder height leading with elbows, lower slow.'),
  ex('Cable Lateral Raise', 'cable', 'push', 'shoulders', 2, 'Cable across body, raise arm out to shoulder height, constant tension, lower slow.'),
  ex('DB Front Raise', 'dumbbell', 'push', 'shoulders', 1, 'Raise DBs straight forward to shoulder height, control down.'),
  ex('DB Rear Delt Fly', 'dumbbell', 'pull', 'shoulders', 1, 'Hinge or on incline bench, raise arms wide in an arc, squeeze rear delts, slight elbow bend, light weight.'),
  ex('Incline DB Rear Delt Fly', 'dumbbell', 'pull', 'shoulders', 1, 'Face-down on an incline bench, raise DBs out wide, squeeze rear delts, slow lower.'),
  ex('Reverse Pec Deck', 'machine', 'pull', 'shoulders', 1, 'Arms out, squeeze the rear delts back and together, control the return.'),
  // CHEST
  ex('DB Incline Chest Press', 'dumbbell', 'push', 'chest', 1, 'Bench 30–45°, press DBs up to full extension, lower slow over 3 sec, feel the upper-chest stretch.'),
  ex('DB Flat Bench Press', 'dumbbell', 'push', 'chest', 1, 'DBs at chest, press up to full extension, lower slow to a stretch.'),
  ex('Barbell Bench Press', 'barbell', 'push', 'chest', 2, 'Bar to mid-chest with control, drive up to lockout, keep shoulder blades pinned.'),
  ex('Incline Barbell Press', 'barbell', 'push', 'chest', 2, 'Bench ~30°, bar to upper chest, press up to lockout.'),
  ex('DB Chest Fly', 'dumbbell', 'push', 'chest', 1, 'Slight elbow bend, lower DBs wide to a stretch, bring back up and squeeze the chest.'),
  ex('Cable Chest Fly', 'cable', 'push', 'chest', 2, 'Bring the handles together in front of your chest, squeeze, control back to a stretch.'),
  ex('Machine Chest Press', 'machine', 'push', 'chest', 1, 'Press the handles to full extension, control back to a stretch.'),
  ex('Push-Up', 'bodyweight', 'push', 'chest', 1, 'Body in a straight line, lower chest toward floor, press to full extension.'),
  // BICEPS (supinated default)
  ex('DB Bicep Curl (supinated)', 'dumbbell', 'pull', 'biceps', 1, 'Palms up, curl up, squeeze at the top, lower to full extension. Elbows pinned, no swinging.'),
  ex('Incline Supinated DB Curl', 'dumbbell', 'pull', 'biceps', 1, 'On an incline bench, arms hang, curl up palms up, squeeze, lower to full stretch. Full extension is key.'),
  ex('Hammer Curl', 'dumbbell', 'pull', 'biceps', 1, 'Neutral grip, curl up, squeeze, control down.'),
  ex('Barbell Curl', 'barbell', 'pull', 'biceps', 2, 'Palms up, curl the bar, squeeze, lower to full extension, elbows pinned.'),
  ex('Concentration Curl', 'dumbbell', 'pull', 'biceps', 1, 'Elbow braced on inner thigh, curl to a hard squeeze, lower slow.'),
  ex('Cable Bicep Curl', 'cable', 'pull', 'biceps', 1, 'Curl to full contraction, squeeze, lower fully — cables keep constant tension.'),
  // TRICEPS
  ex('Overhead DB Tricep Extension', 'dumbbell', 'push', 'triceps', 1, 'One DB overhead, lower behind head (elbows point up), press back to straight, squeeze.'),
  ex('DB Tricep Kickback', 'dumbbell', 'push', 'triceps', 1, 'Upper arms pinned to sides, extend forearms straight back to lockout, squeeze, control down.'),
  ex('Skull Crusher', 'dumbbell', 'push', 'triceps', 2, 'Lower the weight to your forehead bending only at the elbows, press back to lockout.'),
  ex('Close-Grip Bench Press', 'barbell', 'push', 'triceps', 2, 'Hands shoulder-width, elbows tucked, press to lockout driving the triceps.'),
  ex('Cable Tricep Pushdown', 'cable', 'push', 'triceps', 1, 'Elbows pinned, push down to full lockout, squeeze at the bottom, control the return.'),
]

// ---------- ABS ----------
export interface AbExercise { name: string; zone: 'upper' | 'lower'; minLevel: Level; weighted?: boolean; cue: string }
export const AB_POOL: AbExercise[] = [
  { name: 'Crunch', zone: 'upper', minLevel: 1, cue: 'Curl shoulders up slowly, exhale at top, lower with control — don\'t pull the neck.' },
  { name: 'Bicycle Crunch', zone: 'upper', minLevel: 1, cue: 'Opposite elbow to opposite knee, full rotation, slow and deliberate.' },
  { name: 'Slow Sit-Up', zone: 'upper', minLevel: 1, cue: 'Controlled full sit-up, slow on the way down.' },
  { name: 'Dead Bug', zone: 'upper', minLevel: 1, cue: 'Lower opposite arm + leg, keep lower back pressed flat, return and switch.' },
  { name: 'Oblique Toe Touches', zone: 'upper', minLevel: 1, cue: 'Reach opposite hand to foot, shoulders off the floor each reach.' },
  { name: 'Weighted Decline Sit-Up', zone: 'upper', minLevel: 3, weighted: true, cue: 'Hold a plate at the chest, full controlled sit-up.' },
  { name: 'Cable Crunch', zone: 'upper', minLevel: 3, weighted: true, cue: 'Kneel at the cable, crunch down driving the elbows to the thighs, squeeze the abs.' },
  { name: 'Lying Leg Raise', zone: 'lower', minLevel: 1, cue: 'Legs straight, raise to 90°, lower slow, keep lower back pressed to floor.' },
  { name: 'Reverse Crunch', zone: 'lower', minLevel: 1, cue: 'Knees to chest, curl hips off the floor, lower with control.' },
  { name: 'Heel Taps', zone: 'lower', minLevel: 1, cue: 'Crunch up, reach hand to same-side heel, alternate, hold the crunch.' },
  { name: 'Flutter Kicks', zone: 'lower', minLevel: 1, cue: 'Legs 6" off floor, small fast alternating kicks, lower back pressed down.' },
  { name: 'Leg In-Outs', zone: 'lower', minLevel: 1, cue: 'Knees in to chest then extend straight out, core engaged.' },
  { name: 'Hanging Knee Raise', zone: 'lower', minLevel: 3, cue: 'Hang from the bar, raise knees to chest, control down — no swinging.' },
  { name: 'Plate-Held Reverse Crunch', zone: 'lower', minLevel: 3, weighted: true, cue: 'Hold a light plate on the shins, curl hips up, control down.' },
]

// ---------- WARM-UPS (by day focus) ----------
export const WARMUPS: Record<string, string[]> = {
  legs: ['15 bodyweight glute bridges', '10 hip circles each side', '10 arm circles', '10 leg swings each side'],
  upper: ['10 arm circles each direction', '10 shoulder rolls', '10 doorway chest stretches', '10 band pull-aparts'],
}

// ---------- CARDIO FINISHER (incline treadmill; fixed 3.3 mph) ----------
export function cardioFinisher(level: Level, goal: string) {
  const base = level === 1 ? { incline: '0–2.5%', mins: '15–20 min' } : level === 2 ? { incline: '2.5–3.0%', mins: '20–25 min' } : { incline: '3.0–4.0%', mins: '25–30 min' }
  return { title: 'Incline Treadmill Walk', speed: '3.3 mph (fixed)', ...base, note: goal === 'gain' ? 'Keeps heart rate up without burning muscle — walk tall, no handrails.' : 'Your fat-burning finisher — walk tall, shoulders back, no handrails.' }
}

// ---------- HOME BODYWEIGHT POOL ----------
export interface HomeExercise { name: string; level: Level; type: 'leg' | 'upper' | 'core' | 'cardio' }
export const HOME_POOL: HomeExercise[] = [
  // beginner
  { name: 'Chair / Couch Squats', level: 1, type: 'leg' }, { name: 'Bodyweight Squats', level: 1, type: 'leg' },
  { name: 'Pulsating Squats', level: 1, type: 'leg' }, { name: 'Lunges in Place', level: 1, type: 'leg' },
  { name: 'Air Punches / Jabs', level: 1, type: 'upper' }, { name: 'Standing Oblique Touches', level: 1, type: 'core' },
  { name: 'Cross Toe Touches', level: 1, type: 'core' }, { name: 'Beginner Push-Ups (Knees)', level: 1, type: 'upper' },
  { name: 'Sit-Ups', level: 1, type: 'core' }, { name: 'Plank Holds', level: 1, type: 'core' },
  { name: 'Leg Raises (Floor)', level: 1, type: 'core' }, { name: 'March in Place', level: 1, type: 'cardio' },
  { name: 'Running in Place (Low)', level: 1, type: 'cardio' },
  // intermediate
  { name: 'Jumping Jacks', level: 2, type: 'cardio' }, { name: 'High Knees', level: 2, type: 'cardio' },
  { name: 'Mountain Climbers', level: 2, type: 'cardio' }, { name: 'Running in Place (Moderate)', level: 2, type: 'cardio' },
  { name: 'Flutter Kicks', level: 2, type: 'core' }, { name: 'Leg In-Outs', level: 2, type: 'core' },
  { name: 'Bicycle Kicks', level: 2, type: 'core' }, { name: 'Kickboxing Kicks (Right Leg)', level: 2, type: 'leg' },
  { name: 'Kickboxing Kicks (Left Leg)', level: 2, type: 'leg' }, { name: 'Lateral Toe Touches (Skater Style)', level: 2, type: 'cardio' },
  { name: 'Regular Push-Ups', level: 2, type: 'upper' }, { name: 'Oblique Toe Touches with Movement', level: 2, type: 'core' },
  { name: 'Jump Rope', level: 2, type: 'cardio' },
  // advanced
  { name: 'Skater Jumps', level: 3, type: 'cardio' }, { name: 'Skater Jumps + Pulsating Squat Combo', level: 3, type: 'leg' },
  { name: 'Forward Jumps + Run Back', level: 3, type: 'cardio' }, { name: 'High-Intensity Mountain Climbers', level: 3, type: 'cardio' },
  { name: 'High-Intensity Burpees', level: 3, type: 'cardio' }, { name: 'Fast High Knees', level: 3, type: 'cardio' },
  { name: 'Explosive Bodyweight Squats', level: 3, type: 'leg' }, { name: 'Continuous Kickboxing Combinations', level: 3, type: 'leg' },
]

export const HOME_WARMUP = ['Arm Circles (fwd/back) – 60 sec', 'Torso Twists – 60 sec', 'Leg Swings / Hip Circles – 60 sec']
export const HOME_COOLDOWN = ['Toe Touches (Hamstrings) – 60 sec', 'Cross-Body Arm Stretch – 60 sec', 'Quad Stretch – 60 sec']

// Outside walking intervals by level
export function walkingIntervals(level: Level) {
  return level === 1 ? '15–20 min easy walk, 3–4×/week' : level === 2 ? '25–30 min brisk walk or 20 min with 1-min faster intervals, 4×/week' : '30–40 min power walk with 30-sec fast intervals every 3 min, 4–5×/week'
}

// ---------- INJURY HANDLING (models Asa's real client modifications) ----------
export type Injury = 'knee' | 'lower_back' | 'shoulder' | 'wrist' | 'elbow' | 'hip' | 'ankle'
const INJURY_AVOID: Record<Injury, { names: string[]; note: string }> = {
  knee: { names: ['Bulgarian', 'Walking Lunge', 'Curtsy', 'Reverse Lunge', 'Back Squat', 'Hack Squat', 'Step-Up', 'Jump', 'Skater', 'Burpee', 'Explosive', 'Pulsating Squat'], note: 'Knees: shallow range, no deep lunges or jumps — machine & glute-focused work instead.' },
  lower_back: { names: ['Romanian Deadlift (Barbell)', 'Barbell Bent-Over Row', 'Barbell Back Squat'], note: 'Lower back: no heavy barbell hinges or bent rows — chest-supported & machine variations.' },
  shoulder: { names: ['Barbell Overhead Press', 'Arnold Press', 'DB Upright Row'], note: 'Shoulder: no overhead pressing, keep raises at/below shoulder height — cables & machines.' },
  wrist: { names: ['Push-Up', 'Barbell Bench Press', 'Close-Grip Bench Press', 'Plank'], note: 'Wrist: avoid weight-bearing on the hands — machine & cable pressing.' },
  elbow: { names: ['Skull Crusher', 'Barbell Curl', 'Close-Grip Bench Press'], note: 'Elbow: cables and lighter loads, no heavy lockout stress.' },
  hip: { names: ['Bulgarian', 'Walking Lunge', 'Sumo Squat', 'Curtsy'], note: 'Hip: shallow range, no deep or wide-stance work.' },
  ankle: { names: ['Standing Calf Raise', 'Explosive', 'Skater', 'Jump', 'Burpee', 'High Knees'], note: 'Ankle: no jumping/plyo, controlled work only.' },
}
export function isContraindicated(name: string, injuries: Injury[]): boolean {
  return injuries.some(inj => INJURY_AVOID[inj]?.names.some(n => name.includes(n)))
}
export function injuryNotes(injuries: Injury[]): string[] {
  return injuries.map(i => INJURY_AVOID[i]?.note).filter(Boolean)
}
