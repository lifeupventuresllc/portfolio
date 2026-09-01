// ============================================================
// Life-Up Fitness — shared workout program types.
// Extracted unchanged from the old lib/workout.ts so every existing
// consumer (WorkoutPlayer, WorkoutView, workout-pdf, workout-steps, the
// operator route, next-action, plan-builder, ...) keeps working against
// the exact same shape while the SELECTION logic underneath (lib/
// workout-assembly.ts) was rebuilt from scratch. The two-layer engine
// changes HOW exercises get chosen, not what the app renders.
// ============================================================
import type { GymExercise, AbExercise, Level, Injury, Muscle } from './workout-exercises'
import type { MovementPattern, SkillLevel, IntensityLevel } from './exercise-library'

export type TrainingStyle = 'compound' | 'split' | 'cardio' | 'none'
export type FocusArea = 'core' | 'legs' | 'arms' | 'chest' | 'back' | 'shoulders' | 'overall'

export interface WorkoutInputs {
  name?: string
  sex?: 'male' | 'female' | 'other'
  track: 'gym' | 'home'
  level: Level
  goal: 'lose' | 'gain' | 'maintain'
  daysPerWeek?: number
  weekNumber?: number
  injuries?: Injury[]
  targets?: Muscle[]
  focusArea?: FocusArea
  overrideAreas?: FocusArea[]
  postpartum?: boolean
  trainingStyle?: TrainingStyle
  weightLb?: number
  heightIn?: number
  age?: number
  // New, 2026-09-01 rebuild: a stated time budget now genuinely changes how
  // MANY exercises get assembled (see countForMinutes in workout-assembly.ts)
  // — the old fixed-template system had no such concept; the operator route
  // could only crudely slice its reply text after the fact. Only applied to
  // day 0 (the live "today" request this came from).
  minutesAvailable?: number
  // New, 2026-09-01 rebuild — layer three (progression memory). Per-
  // movement-pattern live skill/intensity state, computed by
  // lib/progression.ts from her actual logged set-effort history. When a
  // pattern isn't in this map (no history yet), the assembly engine falls
  // back to `level` exactly as before this system existed — cold start is
  // identical to the pre-progression engine by construction.
  progressionOverrides?: Partial<Record<MovementPattern, { skillLevel: SkillLevel; intensityLevel: IntensityLevel }>>
}

export interface Superset { title: string; push: GymExercise; pull: GymExercise; reps: string }
export interface CardioFinisher {
  title: string
  note: string
  mode: 'walk' | 'compound'
  speed?: string
  incline?: string
  mins?: string
  moves?: { name: string; reps: string; cue: string; imageUrl?: string }[]
}
export interface GymDay {
  dayNum: number; title: string; muscles: string[]; warmup: string[]
  supersets: Superset[]
  accessory: { name: string; reps: string; cue: string; imageUrl?: string }[]
  ab: { upper: AbExercise; lower: AbExercise; scheme: string; bonus?: AbExercise }
  cardio: CardioFinisher
}
export interface HomeDay { dayNum: number; title: string; exercises: { name: string; duration: string; imageUrl?: string }[]; estCalories?: number }
export interface WorkoutProgram {
  name: string; track: 'gym' | 'home'; level: Level; levelLabel: string; goal: string
  weekNumber: number; daysPerWeek: number
  gymDays?: GymDay[]
  injuryNotes?: string[]
  targetNote?: string
  home?: { minutes: string; warmup: string[]; days: HomeDay[]; cooldown: string[]; walking: string; estCaloriesTotal?: number }
  progressionNote?: string
}
