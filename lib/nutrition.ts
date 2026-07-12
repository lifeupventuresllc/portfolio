// ============================================================
// Life Up Fitness — Calorie Blueprint engine
// Implements the Master Blueprint spec exactly:
// BMR (Mifflin-St Jeor) + NEAT + Exercise Burn -> rest/workout
// maintenance -> current + aggressive plans -> weekly math ->
// gender/goal protein (with floors) -> protein-first macro split.
// ============================================================

export type Sex = 'female' | 'male'
export type Goal = 'lose' | 'gain' | 'maintain'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type WorkoutLength = '30_cardio' | '45_strength' | '45_60_both' | '60_both' | '90_intense'

export interface BlueprintInputs {
  name?: string
  age: number
  sex: Sex
  height_in: number
  weight_lbs: number
  goal_weight_lbs?: number
  goal: Goal
  activity: Activity
  workout_days_per_week: number
  workout_length: WorkoutLength
  cardio?: boolean
}

// Step 2 — NEAT (midpoint of each range)
const NEAT: Record<Activity, number> = {
  sedentary: 175,
  light: 225,
  moderate: 275,
  active: 350,
  very_active: 450,
}

// Step 3 — Exercise burn per workout day (midpoint of each range)
const EXERCISE_BURN: Record<WorkoutLength, number> = {
  '30_cardio': 200,
  '45_strength': 250,
  '45_60_both': 325,
  '60_both': 375,
  '90_intense': 450,
}

export interface Macros {
  protein_g: number
  carbs_g: number
  fats_g: number
  protein_pct: number
  carbs_pct: number
  fats_pct: number
}

export interface PlanDay {
  maintenance: number
  eat: number
  adjustment: number // negative = deficit, positive = surplus
  macros: Macros
}

export interface Plan {
  label: string
  rest: PlanDay
  workout: PlanDay
  weeklyEat: number
  weeklyDelta: number // negative deficit / positive surplus
  estWeeklyChangeLbs: number // negative = loss
}

export interface Milestone {
  label: string
  lbs: string
  desc: string
}

export interface Blueprint {
  inputs: BlueprintInputs
  bmr: number
  neat: number
  exerciseBurn: number
  restMaintenance: number
  workoutMaintenance: number
  workoutDays: number
  restDays: number
  weeklyMaintenance: number
  protein_g: number
  proteinRuleLabel: string
  splitLabel: string // e.g. "35 / 40 / 25"
  current: Plan
  aggressive: Plan
  timeline: Milestone[]
}

function round(n: number): number {
  return Math.round(n)
}

// Step 7 — gender + goal protein target (grams/lb) with floors
function proteinGrams(inputs: BlueprintInputs): { grams: number; label: string } {
  const w = inputs.weight_lbs
  if (inputs.sex === 'male') {
    // Caloric deficit (cut) = HIGHEST protein to protect muscle while losing (Asa's method:
    // he keeps protein in the 200s across 180–208 lb, never dropping it as bodyweight falls).
    // 1.1 g/lb keeps a cutter elevated (180→198, 195→215, 208→229). Gain 1.0, maintain 0.8.
    const factor = inputs.goal === 'gain' ? 1.0 : inputs.goal === 'maintain' ? 0.8 : 1.1
    return { grams: Math.max(140, round(w * factor)), label: `${factor}g/lb (min 140g)` }
  }
  const factor = inputs.goal === 'gain' ? 0.8 : inputs.goal === 'maintain' ? 0.7 : 0.75
  return { grams: Math.max(120, round(w * factor)), label: `${factor}g/lb (min 120g)` }
}

// Step 8 — macro split built AROUND a fixed protein target
function macrosFor(calories: number, protein_g: number, goal: Goal): Macros {
  const carbRatio = goal === 'gain' ? 0.6 : 0.55
  const fatRatio = 1 - carbRatio
  const proteinCal = protein_g * 4
  const remaining = Math.max(0, calories - proteinCal)
  const carbs_g = round((remaining * carbRatio) / 4)
  const fats_g = round((remaining * fatRatio) / 9)
  const total = calories || 1
  return {
    protein_g,
    carbs_g,
    fats_g,
    protein_pct: round((proteinCal / total) * 100),
    carbs_pct: round(((carbs_g * 4) / total) * 100),
    fats_pct: round(((fats_g * 9) / total) * 100),
  }
}

// Deficit/surplus per goal + plan intensity (rest, workout)
function adjustments(goal: Goal, aggressive: boolean): { rest: number; workout: number } {
  if (goal === 'lose') {
    return aggressive ? { rest: -600, workout: -500 } : { rest: -450, workout: -350 }
  }
  if (goal === 'gain') {
    return aggressive ? { rest: 500, workout: 500 } : { rest: 250, workout: 250 }
  }
  // maintain: current = at maintenance; aggressive = light recomp cut
  return aggressive ? { rest: -250, workout: -200 } : { rest: 0, workout: 0 }
}

function buildPlan(
  label: string,
  restMaint: number,
  workoutMaint: number,
  workoutDays: number,
  restDays: number,
  protein_g: number,
  goal: Goal,
  aggressive: boolean
): Plan {
  const adj = adjustments(goal, aggressive)
  const restEat = round(restMaint + adj.rest)
  const workoutEat = round(workoutMaint + adj.workout)

  const weeklyEat = workoutDays * workoutEat + restDays * restEat
  const weeklyMaint = workoutDays * workoutMaint + restDays * restMaint
  const weeklyDelta = weeklyEat - weeklyMaint

  return {
    label,
    rest: {
      maintenance: round(restMaint),
      eat: restEat,
      adjustment: adj.rest,
      macros: macrosFor(restEat, protein_g, goal),
    },
    workout: {
      maintenance: round(workoutMaint),
      eat: workoutEat,
      adjustment: adj.workout,
      macros: macrosFor(workoutEat, protein_g, goal),
    },
    weeklyEat,
    weeklyDelta,
    estWeeklyChangeLbs: Math.round((weeklyDelta / 3500) * 100) / 100,
  }
}

const TIMELINE_GAIN: Milestone[] = [
  { label: 'Month 1', lbs: '~1.0–1.5 lbs', desc: 'Body adjusting, strength increasing' },
  { label: 'Month 2', lbs: '~1.5–2.0 lbs', desc: 'Visible fullness, strength compounding' },
  { label: 'Month 3', lbs: '~2.5–3.5 lbs', desc: 'Noticeable composition change' },
  { label: 'Month 6', lbs: '~5–7 lbs', desc: 'Significant lean mass, goal in sight' },
]

const TIMELINE_LOSS: Milestone[] = [
  { label: 'Month 1', lbs: '~2–4 lbs', desc: 'Initial water + fat loss' },
  { label: 'Month 2', lbs: '~3–5 lbs', desc: 'Consistent fat loss phase' },
  { label: 'Month 3', lbs: '~5–8 lbs', desc: 'Visible body composition change' },
  { label: 'Month 6', lbs: '~10–16 lbs', desc: 'Major transformation, goal approaching' },
]

export function buildBlueprint(inputs: BlueprintInputs): Blueprint {
  // Step 1 — BMR (Mifflin-St Jeor)
  const kg = inputs.weight_lbs / 2.205
  const cm = inputs.height_in * 2.54
  const bmrBase = 10 * kg + 6.25 * cm - 5 * inputs.age
  const bmr = round(inputs.sex === 'male' ? bmrBase + 5 : bmrBase - 161)

  // Steps 2–4 — NEAT, Exercise Burn, Maintenance
  const neat = NEAT[inputs.activity]
  const exerciseBurn = EXERCISE_BURN[inputs.workout_length]
  const restMaintenance = bmr + neat
  const workoutMaintenance = bmr + neat + exerciseBurn

  const workoutDays = Math.max(0, Math.min(7, Math.round(inputs.workout_days_per_week)))
  const restDays = 7 - workoutDays

  // Step 7 — protein first
  const { grams: protein_g, label: proteinRuleLabel } = proteinGrams(inputs)

  // Steps 5–6 — current + aggressive plans
  const current = buildPlan('Current Plan', restMaintenance, workoutMaintenance, workoutDays, restDays, protein_g, inputs.goal, false)
  const aggressive = buildPlan('Aggressive Plan', restMaintenance, workoutMaintenance, workoutDays, restDays, protein_g, inputs.goal, true)

  const wm = current.workout.macros
  const splitLabel = `${wm.protein_pct} / ${wm.carbs_pct} / ${wm.fats_pct}`

  return {
    inputs,
    bmr,
    neat,
    exerciseBurn,
    restMaintenance,
    workoutMaintenance,
    workoutDays,
    restDays,
    weeklyMaintenance: workoutDays * workoutMaintenance + restDays * restMaintenance,
    protein_g,
    proteinRuleLabel,
    splitLabel,
    current,
    aggressive,
    timeline: inputs.goal === 'gain' ? TIMELINE_GAIN : TIMELINE_LOSS,
  }
}

// ---- Backward-compatible helper for the challenge client intake ----
// Returns a single representative daily target + macros (average day, current plan).
export function calcNutritionTargets(inputs: {
  age: number; sex: Sex; height_in: number; weight_lbs: number
  activity_level: Activity; goal: Goal; workout_days_per_week?: number; workout_length?: WorkoutLength
}) {
  const bp = buildBlueprint({
    age: inputs.age,
    sex: inputs.sex,
    height_in: inputs.height_in,
    weight_lbs: inputs.weight_lbs,
    goal: inputs.goal,
    activity: inputs.activity_level,
    workout_days_per_week: inputs.workout_days_per_week ?? 4,
    workout_length: inputs.workout_length ?? '45_60_both',
  })
  const avgDaily = round(bp.current.weeklyEat / 7)
  const m = bp.current.workout.macros
  return {
    bmr: bp.bmr,
    tdee: bp.workoutMaintenance,
    calories: avgDaily,
    protein_g: m.protein_g,
    carbs_g: m.carbs_g,
    fats_g: m.fats_g,
  }
}
