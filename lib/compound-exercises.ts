// ============================================================
// Life-Up Fitness — Compound / HIIT exercise library
// Sourced from Asa's curated screenshot batch (2026-07-23): ~113 images
// across multiple creators/reels. Distinct from GYM_POOL's push/pull
// superset system — these are single moves that COMBINE two patterns
// in one rep (squat+press, lunge+curl, RDL+row, etc.), which is what
// women respond to per Asa's brief. Used to build an optional
// full-body compound/HIIT day — standalone OR swapped in for a
// regular split day, member's choice.
//
// `sources`: how many DIFFERENT creators/reels this exact movement was
// seen in across the batch (not repeated frames of the same clip).
// Higher = cross-validated as a proven, popular movement — per Asa's
// explicit instruction, these get surfaced first within their level.
// ============================================================

import { isContraindicated, type Injury } from './workout-exercises'
import { FORM_IMAGES } from './exercise-images'

export type Level = 1 | 2 | 3

export interface CompoundExercise {
  name: string
  level: Level
  equip: 'dumbbell' | 'kettlebell' | 'bodyweight' | 'banded'
  muscles: string[]
  sources: number // cross-source validation count, 1 = single source
  reps: string
  cue: string
  imageUrl?: string // form-demo photo, shown in the compound-day list when set
  earlyAccess?: boolean // Inner Circle exclusive — visible to everyone else once Asa lifts the flag
}

const COMPOUND_POOL_BASE: CompoundExercise[] = [
  // ---- Beginner ----
  { name: 'Squat Pulses', level: 1, equip: 'bodyweight', muscles: ['quads', 'glutes'], sources: 1, reps: '3x15', cue: 'Hold a mini-squat, small controlled pulses, chest tall.' },
  { name: 'Reverse Lunge + Bicep Curl', level: 1, equip: 'dumbbell', muscles: ['quads', 'biceps'], sources: 1, reps: '3x12', cue: 'Step back into a lunge while curling the dumbbells — both moves finish together.' },
  { name: 'Reverse Lunge + Arm Raise', level: 1, equip: 'dumbbell', muscles: ['quads', 'shoulders'], sources: 1, reps: '3x12', cue: 'Step back into a lunge, raise both arms straight out to shoulder height as you sink.' },
  { name: 'Squat + Front Raise', level: 1, equip: 'dumbbell', muscles: ['quads', 'shoulders'], sources: 1, reps: '3x12', cue: 'Squat down, drive up and raise dumbbells straight in front to shoulder height.' },
  { name: 'Sumo Squat + Bicep Curl', level: 1, equip: 'dumbbell', muscles: ['glutes', 'quads', 'biceps'], sources: 1, reps: '3x12', cue: 'Wide sumo stance, squat down, curl the dumbbells as you stand.' },
  { name: 'Tabletop Step Backs', level: 1, equip: 'bodyweight', muscles: ['glutes', 'core'], sources: 1, reps: '4x45sec', cue: 'Tabletop position, step one leg back and tap, return to tabletop, alternate.' },
  { name: 'Tricep Chop', level: 1, equip: 'dumbbell', muscles: ['triceps'], sources: 1, reps: '3x12', cue: 'One dumbbell overhead, chop straight down and back up in a controlled arc.' },
  { name: '10 Sumo Squats', level: 1, equip: 'dumbbell', muscles: ['glutes', 'quads'], sources: 1, reps: '3x10', cue: 'Wide stance, toes out, double dumbbell held at chest, drive through heels.' },
  { name: 'Bent-Over Reverse Fly', level: 1, equip: 'dumbbell', muscles: ['back', 'shoulders'], sources: 2, reps: '3x15', cue: 'Hinge forward, slight elbow bend, raise both dumbbells out wide, squeeze the upper back.' },
  { name: 'Glute Bridge Marches', level: 1, equip: 'bodyweight', muscles: ['glutes', 'core'], sources: 2, reps: '3x16', cue: 'Hold a glute bridge at the top, alternate marching knees up without dropping the hips.' },
  { name: 'Seated Shoulder Press', level: 1, equip: 'dumbbell', muscles: ['shoulders'], sources: 1, reps: '4x12', cue: 'Seated, press both dumbbells straight overhead to lockout, lower to shoulder height.' },

  // ---- Intermediate ----
  { name: 'Squat to Press', level: 2, equip: 'dumbbell', muscles: ['quads', 'shoulders'], sources: 2, reps: '3x12', cue: 'Squat down, drive up explosively and press both dumbbells overhead.' },
  { name: 'RDL to Upright Row', level: 2, equip: 'dumbbell', muscles: ['hamstrings', 'glutes', 'shoulders'], sources: 1, reps: '3x12', cue: 'Hinge into an RDL, stand tall and pull both dumbbells up to chin height, elbows high.' },
  { name: 'Deadlift Row', level: 2, equip: 'dumbbell', muscles: ['hamstrings', 'back'], sources: 1, reps: '8 each side', cue: 'Hinge into a deadlift, row one dumbbell to the ribs at the bottom, stand tall.' },
  { name: 'Reverse Fly / Squat to Bicep Curl', level: 2, equip: 'dumbbell', muscles: ['back', 'quads', 'biceps'], sources: 1, reps: '3x12', cue: 'Alternate a bent-over reverse fly with a squat-to-curl each round.' },
  { name: 'Front Raise Lunge', level: 2, equip: 'dumbbell', muscles: ['quads', 'shoulders'], sources: 1, reps: '3x12', cue: 'Step into a lunge, raise both dumbbells straight forward to shoulder height.' },
  { name: 'Chest Press Bridge', level: 2, equip: 'dumbbell', muscles: ['chest', 'glutes'], sources: 1, reps: '3x12', cue: 'Hold a glute bridge at the top, press both dumbbells straight up over the chest.' },
  { name: 'Deadbug Pullover', level: 2, equip: 'dumbbell', muscles: ['core', 'back'], sources: 1, reps: '3x12', cue: 'Dead bug position, lower opposite arm (holding a dumbbell) and leg together, pull back to start.' },
  { name: 'Chest Press / Sit-Up Knee Tucks', level: 2, equip: 'dumbbell', muscles: ['chest', 'core'], sources: 1, reps: '3x12', cue: 'Lying on back, sit up while pressing both dumbbells overhead and tucking the knees in — one fluid motion.' },
  { name: 'Hammy Sliders', level: 2, equip: 'bodyweight', muscles: ['hamstrings', 'glutes'], sources: 1, reps: '4x12', cue: 'Lying on back, heels on sliders (or a towel), bridge hips up and slide heels in toward glutes, extend back out.' },
  { name: 'Dumbbell Squat to Press', level: 2, equip: 'dumbbell', muscles: ['quads', 'shoulders'], sources: 1, reps: '4x12', cue: 'Same pattern as Squat to Press — squat down, drive up and press overhead.' },
  { name: 'Dumbbell Surrenders', level: 2, equip: 'dumbbell', muscles: ['quads', 'glutes', 'shoulders'], sources: 1, reps: '3x10 each side', cue: 'From a half-kneeling position holding dumbbells at shoulders, stand up to a full lunge and back down.' },
  { name: 'Weighted Overhead March', level: 2, equip: 'dumbbell', muscles: ['shoulders', 'core'], sources: 2, reps: '3x20 each side', cue: 'One dumbbell locked overhead, march the opposite knee up high, brace the core so you don’t lean.' },
  { name: 'Banded Tabletop Kickbacks', level: 2, equip: 'banded', muscles: ['glutes', 'core'], sources: 1, reps: '3x15 each side', cue: 'Tabletop with a band around the thighs, kick one leg straight back and up against the band tension.' },
  { name: 'Reverse Plank', level: 2, equip: 'bodyweight', muscles: ['core', 'glutes'], sources: 1, reps: '3x30sec', cue: 'Seated, hands behind you, lift hips into a reverse plank, hold, squeeze glutes and core.' },
  { name: 'Banded Bird Dogs', level: 2, equip: 'banded', muscles: ['core', 'back'], sources: 1, reps: '3x12 each side', cue: 'Bird dog with a band around hand and opposite foot for added resistance, extend against the band.' },
  { name: 'Dumbbell Swing', level: 2, equip: 'dumbbell', muscles: ['glutes', 'hamstrings', 'shoulders'], sources: 2, reps: '3x15', cue: 'Hinge and swing the dumbbell between the legs, drive hips forward to swing it to shoulder height.' },

  // ---- Advanced ----
  { name: 'Dumbbell Snatch', level: 3, equip: 'dumbbell', muscles: ['glutes', 'hamstrings', 'shoulders'], sources: 3, reps: '3x15', cue: 'Explosive hip-driven pull from the floor to overhead lockout in one motion — the most cross-validated move in this batch.' },
  { name: 'Thrusters', level: 3, equip: 'dumbbell', muscles: ['quads', 'shoulders'], sources: 1, reps: '3x10', cue: 'Front squat into an explosive overhead press, no pause at the top of the squat.' },
  { name: 'Push-Up T-Up', level: 3, equip: 'dumbbell', muscles: ['chest', 'core', 'shoulders'], sources: 1, reps: '3x10 each side', cue: 'Push-up, then rotate into a side plank reaching one dumbbell straight up — full-body rotational stability.' },
  { name: 'Burpee + Row', level: 3, equip: 'dumbbell', muscles: ['full body', 'back'], sources: 1, reps: '3x10', cue: 'Burpee down to a push-up, row one dumbbell to the ribs at the bottom, explode back up.' },
  { name: 'Sumo Squat + Overhead Press', level: 3, equip: 'dumbbell', muscles: ['glutes', 'quads', 'shoulders'], sources: 1, reps: '3x12', cue: 'Wide sumo squat, drive up explosively into a full overhead press.' },
  { name: 'Full Body Combo (Squat + Overhead Press)', level: 3, equip: 'dumbbell', muscles: ['full body'], sources: 1, reps: '3x12', cue: 'Squat to full depth, drive up hard and press overhead — treat it as one continuous explosive rep.' },
]
export const COMPOUND_POOL: CompoundExercise[] = COMPOUND_POOL_BASE.map((e) => (FORM_IMAGES[e.name] ? { ...e, imageUrl: FORM_IMAGES[e.name] } : e))

// isInnerCircle defaults false (safe/conservative) — early-access moves stay hidden
// unless the caller explicitly knows she's Inner Circle. The auto-integrated cardio
// finisher (lib/workout.ts) doesn't thread tier through the workout-generation
// pipeline today, so it always gets the public pool; only the standalone
// /plan/compound page (which already has her tier in scope) passes true.
export function compoundExercisesForLevel(level: Level, injuries: Injury[] = [], isInnerCircle = false): CompoundExercise[] {
  // Everything AT or below her level, injury-safe, cross-validated (higher `sources`) first within each level.
  return COMPOUND_POOL
    .filter((e) => e.level <= level && !isContraindicated(e.name, injuries) && (isInnerCircle || !e.earlyAccess))
    .sort((a, b) => b.sources - a.sources)
}
