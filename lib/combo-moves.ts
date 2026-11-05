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
}

const c = (name: string, level: SkillLevel, group: ComboGroup, legs: ComboMove['legs'], avoid: Injury[], cue: string): ComboMove => ({ name, level, group, legs, avoid, cue })

export const COMBO_MOVES: ComboMove[] = [
  // Lower body + arms
  c('Reverse Lunge + Bicep Curl', 1, 'arms', 'knee', ['knee', 'hip'], 'Step back into a lunge, curl both dumbbells as you drive back up.'),
  c('Squat + Bicep Curl', 1, 'arms', 'knee', ['knee'], 'Squat down, stand tall, then curl both dumbbells. Elbows stay pinned.'),
  c('Sumo Squat + Hammer Curl', 1, 'arms', 'knee', ['hip'], 'Wide stance, toes out. Squat, stand, hammer curl with palms facing in.'),
  c('Glute Bridge + Chest Press', 1, 'chest', 'hip', ['wrist'], 'On your back, bridge your hips up and press both dumbbells over your chest.'),
  c('Step-Up + Curl', 1, 'arms', 'knee', ['knee', 'ankle'], 'Step up onto a bench, stand tall, curl both dumbbells, step down slow.'),
  c('Forward Lunge + Hammer Curl', 2, 'arms', 'knee', ['knee', 'hip'], 'Step forward into a lunge, push back to stand, hammer curl.'),
  c('Curtsy Lunge + Curl', 2, 'arms', 'knee', ['knee', 'hip'], 'Step one leg behind and across, rise, then curl both dumbbells.'),
  c('Bulgarian Split Squat + Curl', 3, 'arms', 'knee', ['knee', 'hip'], 'Back foot on a bench, drop straight down, drive up, then curl.'),
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
  c('Sumo Deadlift + High Pull', 2, 'back', 'hip', ['lower_back', 'hip', 'shoulder'], 'Wide stance, deadlift one dumbbell up and pull it to your chin in one move.'),
  c('Staggered Deadlift + Reverse Lunge', 2, 'back', 'hip', ['lower_back', 'knee'], 'One foot slightly back, hinge on the front leg, stand, then step back into a lunge.'),
  // Lower body + triceps / chest
  c('Squat + Overhead Triceps Extension', 2, 'chest', 'knee', ['knee', 'elbow', 'shoulder'], 'Squat, stand, then lower one dumbbell behind your head and press it back up.'),
  c('Reverse Lunge + Triceps Kickback', 2, 'chest', 'knee', ['knee', 'elbow'], 'Step back, lean forward a little in the lunge, kick both dumbbells straight back.'),
  c('Hip Thrust + Chest Press', 2, 'chest', 'hip', ['wrist'], 'Upper back on a bench, thrust your hips up and press both dumbbells over your chest.'),
  c('Bicep Curl + Shoulder Press', 1, 'shoulders', 'none', ['shoulder', 'elbow'], 'Curl both dumbbells up, then press them overhead. Lower slow, 3 seconds down.'),
  // Full body (three moves joined)
  c('Deadlift + Curl + Press', 2, 'full', 'hip', ['lower_back', 'shoulder'], 'Deadlift up, curl, then press overhead. Reverse it slowly on the way down.'),
  c('Squat + Curl + Press', 2, 'full', 'knee', ['knee', 'shoulder'], 'Squat, stand, curl, press overhead. One smooth rep.'),
  c('Lunge + Curl + Press', 2, 'full', 'knee', ['knee', 'hip', 'shoulder'], 'Lunge back, stand, curl, then press overhead.'),
  c('Row + Squat + Press', 3, 'full', 'knee', ['knee', 'lower_back', 'shoulder'], 'Bent-over row, stand, squat, then press overhead as you stand.'),
  c('Clean + Squat + Press', 3, 'full', 'knee', ['knee', 'lower_back', 'shoulder', 'wrist'], 'Clean the dumbbells to your shoulders, front squat, press overhead.'),
  c('Renegade Row + Push-Up', 3, 'full', 'none', ['wrist', 'shoulder'], 'Plank on the dumbbells: row one, row the other, then a push-up.'),
  c('Man Maker', 3, 'full', 'knee', ['wrist', 'shoulder', 'knee', 'lower_back'], 'Push-up, row each side, jump feet in, squat up and press overhead.'),
  // Glutes + core
  c('Glute Bridge + Pullover', 1, 'core', 'hip', ['shoulder'], 'Bridge your hips up, then lower one dumbbell behind your head and pull it back over.'),
  c('Lunge + Twist', 2, 'core', 'knee', ['knee', 'hip', 'lower_back'], 'Lunge, hold one dumbbell at your chest, turn your body over the front leg.'),
  c('Squat + Woodchop', 2, 'core', 'knee', ['knee', 'lower_back'], 'Squat with the dumbbell by one hip, stand and chop it up across your body.'),
  c('Deadlift + Overhead Reach', 2, 'core', 'hip', ['lower_back', 'shoulder'], 'Deadlift up, then reach one dumbbell straight overhead, ribs down.'),
  // Lower body + arms / shoulders (rounding out Asa's list of 36)
  c('Goblet Squat + Press Out', 1, 'shoulders', 'knee', ['knee'], 'Hold one dumbbell at your chest, squat, and press it straight out in front at the bottom.'),
  c('Glute Bridge + Triceps Extension', 1, 'chest', 'hip', ['elbow'], 'Hold a bridge, lower the dumbbells to your ears and press back up.'),
]

/** Combos she can do at her level, minus any that load what hurts. */
export function combosFor(level: SkillLevel, injuries: Injury[]): ComboMove[] {
  return COMBO_MOVES.filter((m) => m.level <= level && !m.avoid.some((a) => injuries.includes(a)) && !isContraindicated(m.name, injuries))
}

// The heavy main lift that opens a compound day, by level and place.
// Rotates day to day: squat → hinge → glutes, then an upper-body lift.
export const MAIN_LIFTS: Record<'gym' | 'home', Record<SkillLevel, { lower: string[]; upper: string[] }>> = {
  gym: {
    1: { lower: ['Goblet Squat', 'Romanian Deadlift (DB)', 'Dumbbell Hip Thrust'], upper: ['DB Incline Chest Press', 'Lat Pulldown', 'DB Shoulder Press'] },
    2: { lower: ['Goblet Squat', 'Romanian Deadlift (Barbell)', 'Barbell Hip Thrust'], upper: ['DB Flat Bench Press', 'DB Bent-Over Row', 'DB Shoulder Press'] },
    3: { lower: ['Barbell Back Squat', 'Romanian Deadlift (Barbell)', 'Barbell Hip Thrust'], upper: ['Barbell Bench Press', 'Barbell Bent-Over Row', 'Barbell Overhead Press'] },
  },
  home: {
    1: { lower: ['Goblet Squat', 'Romanian Deadlift (DB)', 'Dumbbell Hip Thrust'], upper: ['Push-Up', 'DB Bent-Over Row', 'DB Shoulder Press'] },
    2: { lower: ['Goblet Squat', 'Romanian Deadlift (DB)', 'Dumbbell Hip Thrust'], upper: ['DB Flat Bench Press', 'Single-Arm DB Row', 'DB Shoulder Press'] },
    3: { lower: ['Bulgarian Split Squat (DB)', 'Romanian Deadlift (DB)', 'Dumbbell Hip Thrust'], upper: ['DB Flat Bench Press', 'Single-Arm DB Row', 'Arnold Press (DB)'] },
  },
}
