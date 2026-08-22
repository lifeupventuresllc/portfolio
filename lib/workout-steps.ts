// Flatten a generated workout day into an ordered list of guided steps for the in-workout player.
import type { WorkoutProgram } from './workout'

export interface WorkoutStep {
  phase: string
  name: string
  detail?: string
  cue?: string
  seconds?: number   // present → a timed/countdown step
  rest?: boolean
  imageUrl?: string  // form-demo photo/diagram — unset until Asa sources real images
}

const parseSecs = (s?: string): number | undefined => {
  if (!s) return undefined
  const m = s.match(/(\d+)\s*sec/i)
  return m ? Number(m[1]) : undefined
}

// Rough total session length. Timed steps (home exercises, rest) use their real
// seconds; rep-based work steps (gym supersets/accessory/abs) get a ~40s working-set
// estimate since reps aren't time-denominated. Good enough for "About N min" at the
// top of the player — not meant to be exact to the second.
const DEFAULT_WORK_SECONDS = 40
const parseMins = (s?: string): number | undefined => {
  if (!s) return undefined
  const m = s.match(/(\d+)\s*min/i)
  return m ? Number(m[1]) : undefined
}
export function estimateWorkoutMinutes(steps: WorkoutStep[]): number {
  const totalSeconds = steps.reduce((sum, s) => {
    if (s.seconds != null) return sum + s.seconds
    const mins = parseMins(s.detail)
    if (mins != null) return sum + mins * 60
    return sum + DEFAULT_WORK_SECONDS
  }, 0)
  return Math.max(1, Math.round(totalSeconds / 60))
}

// Genuinely shortens a session to fit a target duration — used when Coach Asa's
// chat approves a time-crunch/low-energy/re-entry adjustment (`workoutChange.toMinutes`).
// Keeps warm-up and cool-down (home track) intact, then greedily keeps exercises
// (paired with their following rest step, so a superset never loses just its rest)
// in original order until the budget runs out. Always keeps at least one exercise —
// never returns an empty session even if the target is very short.
export function trimStepsToTarget(steps: WorkoutStep[], targetMinutes: number): WorkoutStep[] {
  if (steps.length === 0) return steps
  const stepCost = (s: WorkoutStep) => s.seconds ?? (parseMins(s.detail) != null ? parseMins(s.detail)! * 60 : DEFAULT_WORK_SECONDS)

  const hasWarmup = steps[0]?.phase === 'Warm-up'
  const hasCooldown = steps[steps.length - 1]?.phase === 'Cool-down'
  const warmup = hasWarmup ? [steps[0]] : []
  const cooldown = hasCooldown ? [steps[steps.length - 1]] : []
  const middle = steps.slice(hasWarmup ? 1 : 0, steps.length - (hasCooldown ? 1 : 0))

  // Group each work step with its immediately-following rest step so they travel together.
  const chunks: WorkoutStep[][] = []
  for (let i = 0; i < middle.length; i++) {
    if (middle[i].rest) continue // already attached to the previous chunk
    const chunk = [middle[i]]
    if (middle[i + 1]?.rest) chunk.push(middle[i + 1])
    chunks.push(chunk)
  }

  const fixedSeconds = [...warmup, ...cooldown].reduce((sum, s) => sum + stepCost(s), 0)
  const budgetSeconds = Math.max(0, targetMinutes * 60 - fixedSeconds)

  const kept: WorkoutStep[] = []
  let used = 0
  for (const chunk of chunks) {
    const cost = chunk.reduce((sum, s) => sum + stepCost(s), 0)
    if (kept.length === 0 || used + cost <= budgetSeconds) { kept.push(...chunk); used += cost }
    else break
  }
  if (kept.length === 0 && chunks.length > 0) kept.push(...chunks[0])

  return [...warmup, ...kept, ...cooldown]
}

export function dayLabels(program: WorkoutProgram): string[] {
  if (program.track === 'home' && program.home) return program.home.days.map((d) => d.title)
  return (program.gymDays || []).map((d) => `Day ${d.dayNum}: ${d.title}`)
}

export function buildSteps(program: WorkoutProgram, dayIdx: number): WorkoutStep[] {
  const steps: WorkoutStep[] = []

  if (program.track === 'home' && program.home) {
    const day = program.home.days[dayIdx]
    if (!day) return steps
    steps.push({ phase: 'Warm-up', name: 'Warm-up', detail: program.home.warmup.join(' · ') })
    day.exercises.forEach((e) => {
      steps.push({ phase: day.title, name: e.name, detail: e.duration, seconds: parseSecs(e.duration), imageUrl: e.imageUrl })
    })
    steps.push({ phase: 'Cool-down', name: 'Cool-down', detail: program.home.cooldown.join(' · ') })
    return steps
  }

  const day = program.gymDays?.[dayIdx]
  if (!day) return steps
  steps.push({ phase: 'Warm-up', name: 'Warm-up', detail: day.warmup.join(' · ') })
  day.supersets.forEach((s, i) => {
    steps.push({ phase: `Superset ${i + 1}`, name: s.push.name, detail: s.reps, cue: s.push.cue, imageUrl: s.push.imageUrl })
    steps.push({ phase: 'Rest', name: 'Rest', seconds: 45, rest: true })
    steps.push({ phase: `Superset ${i + 1}`, name: s.pull.name, detail: s.reps, cue: s.pull.cue, imageUrl: s.pull.imageUrl })
    steps.push({ phase: 'Rest', name: 'Rest', seconds: 60, rest: true })
  })
  day.accessory.forEach((a) => {
    // Real bug found live: every other exercise category (supersets, abs,
    // compound-cardio moves) passed imageUrl through to the step — this one
    // never did, so a matched accessory exercise (Standing Calf Raise is one)
    // could never show its real photo no matter what.
    steps.push({ phase: 'Accessory', name: a.name, detail: a.reps, cue: a.cue, imageUrl: a.imageUrl })
    steps.push({ phase: 'Rest', name: 'Rest', seconds: 45, rest: true })
  })
  steps.push({ phase: `Abs · ${day.ab.scheme}`, name: day.ab.upper.name, detail: day.ab.scheme, cue: day.ab.upper.cue, imageUrl: day.ab.upper.imageUrl })
  steps.push({ phase: `Abs · ${day.ab.scheme}`, name: day.ab.lower.name, detail: day.ab.scheme, cue: day.ab.lower.cue, imageUrl: day.ab.lower.imageUrl })
  if (day.ab.bonus) {
    steps.push({ phase: `Abs · Core focus`, name: day.ab.bonus.name, detail: day.ab.scheme, cue: day.ab.bonus.cue, imageUrl: day.ab.bonus.imageUrl })
  }
  if (day.cardio.mode === 'compound' && day.cardio.moves) {
    day.cardio.moves.forEach((m) => {
      steps.push({ phase: 'Cardio finisher · Compound', name: m.name, detail: m.reps, cue: m.cue, imageUrl: m.imageUrl })
    })
  } else {
    steps.push({ phase: 'Cardio finisher', name: day.cardio.title, detail: `${day.cardio.mins} · ${day.cardio.speed} · incline ${day.cardio.incline}`, cue: day.cardio.note })
  }
  return steps
}
