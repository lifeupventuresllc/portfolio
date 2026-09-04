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
import type { MovementPattern, SkillLevel, IntensityLevel, MuscleGroup } from './exercise-library'

export type TrainingStyle = 'compound' | 'split' | 'cardio' | 'none'
export type FocusArea = 'core' | 'legs' | 'arms' | 'chest' | 'back' | 'shoulders' | 'overall'

export interface WorkoutInputs {
  name?: string
  sex?: 'male' | 'female' | 'other'
  track: 'gym' | 'home'
  level: Level
  // 'recomp' = both "Lose fat" and "Build & tone" selected together (see
  // lib/goals.ts) — a real body-recomposition goal, not a UI glitch.
  goal: 'lose' | 'gain' | 'maintain' | 'recomp'
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
  // Real gap found live, Asa's explicit correction: cardio duration/incline
  // used to scale only by `level` (self-reported TRAINING experience) — a
  // deconditioned "advanced" lifter and a genuinely fit "beginner" got the
  // same cardio finisher. activityLevel is her actual current physical
  // capacity (already collected at intake for calorie math, never used
  // here before), a real signal weight/BMI alone can't stand in for — a
  // heavier person can be very fit, a lighter one very deconditioned.
  // Deliberately independent of `level`, which still governs incline/form.
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  // Asa's explicit ask, 2026-09-02: "the nutrition engine and workout engine
  // should connect — they're the two main brains that make the app work."
  // The nutrition -> workout direction: true when she's logged nothing yet
  // today and it's already past early afternoon (computeLowFuelToday in
  // workout-assembly.ts owns the actual rule, shared by every caller so
  // "low fuel" means the same real thing everywhere it's checked). Softens
  // today's cardio finisher — never strength work, never a silent skip.
  lowFuelToday?: boolean
  // Replaces the removed fixed push/pull/legs rotation, 2026-09-02 (Asa's
  // explicit call, FitBod over Sweat): an untargeted day now targets
  // whatever she genuinely hasn't trained lately, from her real logged
  // sets (getRecentlyTrainedMuscles in progression.ts) — never a hardcoded
  // weekly calendar. Muscles she's touched recently sort to the back of
  // the priority order, not excluded outright.
  recentlyTrainedMuscles?: MuscleGroup[]
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
  // `kind` says what this entry actually is — 'calves' only when it's a real
  // calf pick, never assumed by array position (that assumption is exactly
  // what caused a real bug: core-only days had no calf work but the PDF
  // still labeled slots 0/1 "CALVES" regardless of what filled them).
  accessory: { name: string; reps: string; cue: string; imageUrl?: string; kind: 'calves' | 'bonus' | 'core' }[]
  // Goal-driven, not automatic: undefined when the day's goal/focus doesn't
  // call for it (see buildGymDay in lib/workout-assembly.ts).
  ab?: { upper: AbExercise; lower: AbExercise; scheme: string; bonus?: AbExercise }
  cardio?: CardioFinisher
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
