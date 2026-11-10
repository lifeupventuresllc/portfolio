// ============================================================
// Life-Up Fitness — Compound movements style (2026-11-04, Asa's pick)
//
// The "Compound movements" way to lift (intake: "How do you like to lift?").
// Alive-style structure: one or two heavy main lifts, then dumbbell COMBO
// moves (two moves joined in one rep, like a reverse lunge into a curl),
// then core, then a cardio finisher. Every lift and combo is tracked with
// double progression (lib/double-progression.ts), so the weights climb.
//
// 36 combos from Asa's list + 2 found in research (Nourish Move Love:
// staggered deadlift → reverse lunge, curl → shoulder press) = 38.
// 2026-11-09 audit: Hip Thrust + Chest Press removed (balance risk, same as
// Glute Bridge + Chest Press); 8 upper-body-only combos added for upper days.
// All dumbbell, so they work at home (with dumbbells) or at the gym.
// ============================================================
import type { Injury } from './workout-exercises'
import { isContraindicated } from './workout-exercises'
import type { SkillLevel } from './exercise-library'

export type ComboGroup = 'arms' | 'shoulders' | 'back' | 'chest' | 'full' | 'core'

export interface ComboMove {
  name: string
  level: SkillLevel        // lowest level that gets it
  group: ComboGroup        // what the upper half works
  legs: 'knee' | 'hip' | 'none'
  avoid: Injury[]          // injuries that swap it out
  cue: string
  weight: ComboWeight      // what she holds (2026-11-10: dumbbell or kettlebell days)
}

/** The weight a combo uses. Kettlebell moves always say "Kettlebell" in the name. */
export type ComboWeight = 'dumbbell' | 'kettlebell'
/** What weights she wants: one kind, or both (alternating days). */
export type WeightChoice = ComboWeight | 'both'

const c = (name: string, level: SkillLevel, group: ComboGroup, legs: ComboMove['legs'], avoid: Injury[], cue: string): ComboMove => ({ name, level, group, legs, avoid, cue, weight: 'dumbbell' })
const k = (name: string, level: SkillLevel, group: ComboGroup, legs: ComboMove['legs'], avoid: Injury[], cue: string): ComboMove => ({ name, level, group, legs, avoid, cue, weight: 'kettlebell' })

export const COMBO_MOVES: ComboMove[] = [
  // Lower body + arms
  c('Reverse Lunge + Bicep Curl', 1, 'arms', 'knee', ['knee', 'hip'], 'Step back into a lunge, curl both dumbbells as you drive back up.'),
  c('Squat + Bicep Curl', 1, 'arms', 'knee', ['knee'], 'Squat down, stand tall, then curl both dumbbells. Elbows stay pinned.'),
  c('Sumo Squat + Hammer Curl', 1, 'arms', 'knee', ['hip'], 'Wide stance, toes out. Squat, stand, hammer curl with palms facing in.'),
  c('Glute Bridge + Chest Press', 1, 'chest', 'hip', ['wrist'], 'On your back, bridge your hips up and press both dumbbells over your chest.'),
  c('Step-Up + Curl', 2, 'arms', 'knee', ['knee', 'ankle'], 'Step up onto a low step or bench, stand tall and steady, curl both dumbbells, step down slow.'),
  c('Forward Lunge + Hammer Curl', 2, 'arms', 'knee', ['knee', 'hip'], 'Step forward into a lunge, push back to stand, hammer curl.'),
  c('Curtsy Lunge + Curl', 2, 'arms', 'knee', ['knee', 'hip'], 'Step one leg behind and across, rise, then curl both dumbbells.'),
  c('Bulgarian Split Squat + Curl', 3, 'arms', 'knee', ['knee', 'hip'], 'Back foot on a bench or chair, drop straight down, drive up, then curl.'),
  // Lower body + shoulders
  c('Squat + Shoulder Press', 1, 'shoulders', 'knee', ['knee', 'shoulder'], 'Squat down, drive up and press both dumbbells overhead in one push.'),
  c('Reverse Lunge + Shoulder Press', 1, 'shoulders', 'knee', ['knee', 'shoulder'], 'Step back into a lunge, stand tall, press both dumbbells overhead.'),
  c('Sumo Squat + Upright Row', 1, 'shoulders', 'knee', ['hip', 'shoulder'], 'Wide squat, stand, pull the dumbbells up to chest height, elbows high.'),
  c('Squat + Front Raise', 1, 'shoulders', 'knee', ['knee'], 'Squat down, stand, raise both dumbbells straight in front to shoulder height.'),
  c('Lunge + Lateral Raise', 2, 'shoulders', 'knee', ['knee', 'hip'], 'Lunge, stand, raise both dumbbells out to the sides to shoulder height.'),
  c('Curtsy Lunge + Shoulder Press', 2, 'shoulders', 'knee', ['knee', 'hip', 'shoulder'], 'Curtsy lunge, rise, press both dumbbells overhead.'),
  c('Split Squat + Arnold Press', 3, 'shoulders', 'knee', ['knee', 'shoulder'], 'Split stance, lower straight down, rise, then Arnold press (palms turn out as you press).'),
  // Lower body + back
  c('Romanian Deadlift + Bent-Over Row', 1, 'back', 'hip', ['lower_back'], 'Hinge to a deadlift, hold the bend, row both dumbbells to your ribs, stand.'),
  c('Row + Squat', 2, 'back', 'knee', ['knee', 'lower_back'], 'Bent-over row, stand up, then squat. One rep is both.'),
  c('Reverse Lunge + Single-Arm Row', 2, 'back', 'knee', ['knee', 'hip'], 'Step back into a lunge, lean in a little and row one dumbbell to your ribs.'),
  c('Deadlift + Upright Row', 2, 'back', 'hip', ['lower_back', 'shoulder'], 'Deadlift up, then pull both dumbbells to chest height, elbows high.'),
  c('Sumo Deadlift + High Pull', 3, 'back', 'hip', ['lower_back', 'hip', 'shoulder'], 'Wide stance, deadlift one dumbbell up and pull it to your chin in one move.'),
  c('Staggered Deadlift + Reverse Lunge', 2, 'back', 'hip', ['lower_back', 'knee'], 'One foot slightly back, hinge on the front leg, stand, then step back into a lunge.'),
  // Lower body + triceps / chest
  c('Squat + Overhead Triceps Extension', 2, 'chest', 'knee', ['knee', 'elbow', 'shoulder'], 'Squat, stand, then lower one dumbbell behind your head and press it back up.'),
  c('Reverse Lunge + Triceps Kickback', 2, 'chest', 'knee', ['knee', 'elbow'], 'Step back, lean forward a little in the lunge, kick both dumbbells straight back.'),
  c('Bicep Curl + Shoulder Press', 1, 'shoulders', 'none', ['shoulder', 'elbow'], 'Curl both dumbbells up, then press them overhead. Lower slow, 3 seconds down.'),
  // Full body (three moves joined)
  c('Deadlift + Curl + Press', 2, 'full', 'hip', ['lower_back', 'shoulder'], 'Deadlift up, curl, then press overhead. Reverse it slowly on the way down.'),
  c('Squat + Curl + Press', 2, 'full', 'knee', ['knee', 'shoulder'], 'Squat, stand, curl, press overhead. One smooth rep.'),
  c('Lunge + Curl + Press', 2, 'full', 'knee', ['knee', 'hip', 'shoulder'], 'Lunge back, stand, curl, then press overhead.'),
  c('Row + Squat + Press', 3, 'full', 'knee', ['knee', 'lower_back', 'shoulder'], 'Bent-over row, stand, squat, then press overhead as you stand.'),
  c('Clean + Squat + Press', 3, 'full', 'knee', ['knee', 'lower_back', 'shoulder', 'wrist'], 'Clean the dumbbells to your shoulders, front squat, press overhead.'),
  c('Renegade Row + Push-Up', 3, 'full', 'none', ['wrist', 'shoulder'], 'Plank on the dumbbells: row one, row the other, then a push-up.'),
  c('Man Maker', 3, 'full', 'knee', ['wrist', 'shoulder', 'knee', 'lower_back'], 'Push-up, row each side, jump feet in, squat up and press overhead.'),
  // Upper body only (2026-11-09) — no leg work, for upper-body days (rest rule)
  c('Bent-Over Row + Reverse Fly', 1, 'back', 'none', ['lower_back', 'shoulder'], 'Hinge forward, row both dumbbells to your ribs, lower, then raise them out wide. One rep is both.'),
  c('Chest Press + Pullover', 1, 'chest', 'none', ['shoulder', 'wrist'], 'Lie on a bench or the floor. Press both dumbbells up, then hold them together, lower them behind your head and pull back over.'),
  c('Hammer Curl + Overhead Triceps Extension', 1, 'arms', 'none', ['elbow', 'shoulder'], 'Hammer curl both dumbbells, then hold one with both hands, lower it behind your head and press it back up.'),
  c('Front Raise + Lateral Raise', 1, 'shoulders', 'none', ['shoulder'], 'Light dumbbells. Raise them in front to shoulder height, lower, then raise them out to the sides.'),
  c('Floor Press + Skull Crusher', 2, 'chest', 'none', ['elbow', 'wrist'], 'Lying on the floor, press both dumbbells up, then bend only at the elbows to lower them by your ears and press back.'),
  c('Single-Arm Row + Triceps Kickback', 2, 'back', 'none', ['lower_back', 'elbow'], 'One hand on a bench or sturdy chair, row the dumbbell to your ribs, then straighten your arm back. Switch sides.'),
  c('Push-Up + Shoulder Tap', 2, 'chest', 'none', ['wrist', 'shoulder'], 'One push-up, then tap each shoulder with the opposite hand. Keep your hips still.'),
  c('Curl + Arnold Press', 2, 'shoulders', 'none', ['shoulder', 'elbow'], 'Curl both dumbbells, then turn your palms out as you press overhead.'),
  // Glutes + core
  c('Glute Bridge + Pullover', 1, 'core', 'hip', ['shoulder'], 'Bridge your hips up, then lower one dumbbell behind your head and pull it back over.'),
  c('Lunge + Twist', 2, 'core', 'knee', ['knee', 'hip', 'lower_back'], 'Lunge, hold one dumbbell at your chest, turn your body over the front leg.'),
  c('Squat + Woodchop', 2, 'core', 'knee', ['knee', 'lower_back'], 'Squat with the dumbbell by one hip, stand and chop it up across your body.'),
  c('Deadlift + Overhead Reach', 2, 'core', 'hip', ['lower_back', 'shoulder'], 'Deadlift up, then reach one dumbbell straight overhead, ribs down.'),
  // Lower body + arms / shoulders (rounding out Asa's list of 36)
  c('Goblet Squat + Press Out', 1, 'shoulders', 'knee', ['knee'], 'Hold one dumbbell at your chest, squat, and press it straight out in front at the bottom.'),
  c('Glute Bridge + Triceps Extension', 1, 'chest', 'hip', ['elbow'], 'Hold a bridge, lower the dumbbells to your ears and press back up.'),

  // 2026-11-10 (Asa's screenshots): renegade rows step up by level — knees first, then toes.
  c('Kneeling Renegade Row', 1, 'back', 'none', ['wrist', 'shoulder'], 'On hands and knees, hands on two dumbbells under your shoulders. Row one to your ribs, set it down, row the other. Keep your hips still.'),
  c('Renegade Row', 2, 'back', 'none', ['wrist', 'shoulder', 'lower_back'], 'High plank on your toes, hands on two dumbbells, feet wide. Row one to your ribs, set it down, then the other. Hips stay level.'),
  c('Tall-Kneeling Halo + Overhead Triceps Extension', 1, 'arms', 'none', ['elbow', 'shoulder'], 'Kneel tall, squeeze your glutes. Circle one dumbbell around your head, then lower it behind your head and press it back up.'),
  c('Dumbbell Gorilla Row', 2, 'back', 'none', ['lower_back'], 'Wide stance, hinge low with flat back, dumbbells between your feet. Row one to your ribs while the other stays down, then switch.'),

  // ---- KETTLEBELL moves (2026-11-10): her kettlebell days. One bell unless it says "Double". ----
  // Lower body days
  k('Kettlebell Goblet Squat + Curl', 1, 'arms', 'knee', ['knee', 'elbow'], 'Hold the bell by the horns at your chest. Squat, stand tall, then curl the bell from your hips to your chest.'),
  k('Kettlebell Deadlift + Upright Row', 1, 'back', 'hip', ['lower_back', 'shoulder'], 'Bell between your feet. Hinge and deadlift it up, then pull it to chest height with elbows high.'),
  k('Kettlebell Glute Bridge + Chest Press', 1, 'chest', 'hip', ['wrist'], 'On your back, hold the bell by the horns over your chest. Bridge your hips up and press the bell up together.'),
  k('Kettlebell Goblet Squat + Press Out', 1, 'shoulders', 'knee', ['knee'], 'Hold the bell at your chest, squat, and press it straight out in front at the bottom. Pull it back in and stand.'),
  k('Kettlebell Swing + Goblet Squat', 2, 'full', 'hip', ['lower_back', 'knee'], 'Hike the bell back and snap your hips to swing it to chest height. Catch it at your chest and squat.'),
  k('Kettlebell Clean + Press', 2, 'shoulders', 'hip', ['shoulder', 'wrist', 'lower_back'], 'Swing the bell up to rest on your forearm at your shoulder, then press it overhead. Switch sides each set.'),
  k('Kettlebell Reverse Lunge + Press', 2, 'shoulders', 'knee', ['knee', 'shoulder'], 'Bell at your shoulder. Step back into a lunge, stand, then press the bell overhead.'),
  k('Kettlebell Single-Leg Deadlift + Row', 2, 'back', 'hip', ['lower_back', 'ankle'], 'Bell in one hand. Hinge on the opposite leg, back leg reaching back, row the bell to your ribs, then stand.'),
  k('Kettlebell Lunge + Halo', 2, 'core', 'knee', ['knee', 'shoulder'], 'Lunge, hold the bottom, circle the bell around your head once, then stand.'),
  k('Kettlebell Clean + Squat + Press', 3, 'full', 'knee', ['knee', 'shoulder', 'wrist', 'lower_back'], 'Clean the bell to your shoulder, front squat, and press overhead as you stand.'),
  k('Kettlebell Swing + High Pull', 3, 'back', 'hip', ['lower_back', 'shoulder'], 'Swing the bell up with your hips, then pull it to your chin with your elbow high. Let it swing back.'),
  k('Kettlebell Turkish Get-Up', 3, 'full', 'knee', ['shoulder', 'wrist', 'knee'], 'Lying down, bell locked out overhead. Stand up one step at a time with your eyes on the bell, then reverse it slowly.'),
  k('Double Kettlebell Front Squat + Press', 3, 'shoulders', 'knee', ['knee', 'shoulder', 'wrist'], 'Two bells at your shoulders. Front squat, stand, and press both overhead.'),
  // Upper body days (no leg work)
  k('Kettlebell Halo + Bent-Over Row', 1, 'back', 'none', ['shoulder', 'lower_back'], 'Circle the bell around your head, then hinge forward and row it to your ribs with one hand. Switch sides.'),
  k('Kettlebell Floor Press + Pullover', 1, 'chest', 'none', ['shoulder', 'wrist'], 'On the floor, press the bell up by the horns, then lower it behind your head and pull it back over.'),
  k('Kettlebell Curl + Press', 1, 'shoulders', 'none', ['shoulder', 'elbow'], 'Curl the bell to your shoulder, then press it overhead. Switch sides each set.'),
  k('Kettlebell Curl + Overhead Triceps Extension', 1, 'arms', 'none', ['elbow', 'shoulder'], 'Curl the bell by the horns, then hold it behind your head and press it up.'),
  k('Kettlebell Gorilla Row', 2, 'back', 'none', ['lower_back'], 'Two bells between your feet, wide stance, flat back. Row one bell to your ribs, set it down, row the other.'),
  k('Kettlebell Around the World + Overhead Press', 2, 'shoulders', 'none', ['shoulder', 'lower_back'], 'Pass the bell around your waist hand to hand, then press it overhead. Switch the direction each set.'),
  k('Kettlebell Floor Press + Skull Crusher', 2, 'chest', 'none', ['elbow', 'wrist'], 'On the floor, press the bell up by the horns, then bend only your elbows to lower it by your forehead and press back.'),
  k('Double Kettlebell Gorilla Row + Press', 3, 'full', 'none', ['lower_back', 'shoulder'], 'Gorilla row both bells, stand, clean them to your shoulders and press overhead.'),
]

/** Combos she can do at her level, minus any that load what hurts (and, given a weight, only that kind).
 *  zone 'upper' = no leg work at all (upper-body days); 'lower' = leg combos. */
export function combosFor(level: SkillLevel, injuries: Injury[], zone?: 'lower' | 'upper', weight?: ComboWeight): ComboMove[] {
  return COMBO_MOVES.filter((m) => m.level <= level && (!weight || m.weight === weight) && !m.avoid.some((a) => injuries.includes(a)) && !isContraindicated(m.name, injuries)
    && (!zone || (zone === 'upper' ? m.legs === 'none' : m.legs !== 'none')))
}

// The heavy main lift that opens a compound day, by level and place.
// Rotates day to day: squat → hinge → glutes, then an upper-body lift.
export const MAIN_LIFTS: Record<'gym' | 'home', Record<SkillLevel, { lower: string[]; upper: string[] }>> = {
  gym: {
    1: { lower: ['Goblet Squat', 'Romanian Deadlift (DB)', 'Dumbbell Hip Thrust'], upper: ['DB Incline Chest Press', 'Lat Pulldown', 'DB Shoulder Press'] },
    2: { lower: ['Goblet Squat', 'Romanian Deadlift (Barbell)', 'Barbell Hip Thrust'], upper: ['DB Flat Bench Press', 'DB Bent-Over Row', 'DB Shoulder Press'] },
    3: { lower: ['Barbell Back Squat', 'Romanian Deadlift (Barbell)', 'Barbell Hip Thrust'], upper: ['Barbell Bench Press', 'Barbell Bent-Over Row', 'Barbell Overhead Press'] },
  },
  // 2026-11-09 audit: home has no bench press bench → push-ups; beginners start on knees.
  home: {
    1: { lower: ['Goblet Squat', 'Romanian Deadlift (DB)', 'Dumbbell Hip Thrust'], upper: ['Knee Push-Ups', 'DB Bent-Over Row', 'DB Shoulder Press'] },
    2: { lower: ['Goblet Squat', 'Romanian Deadlift (DB)', 'Dumbbell Hip Thrust'], upper: ['Push-Up', 'Single-Arm DB Row', 'DB Shoulder Press'] },
    3: { lower: ['Bulgarian Split Squat (DB)', 'Romanian Deadlift (DB)', 'Dumbbell Hip Thrust'], upper: ['Regular Push-Ups', 'Single-Arm DB Row', 'Arnold Press (DB)'] },
  },
}
