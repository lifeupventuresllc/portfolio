// Flatten a generated workout day into an ordered list of guided steps for the in-workout player.
import type { WorkoutProgram } from './workout'

export interface WorkoutStep {
  phase: string
  name: string
  detail?: string
  cue?: string
  seconds?: number   // present → a timed/countdown step
  rest?: boolean
}

const parseSecs = (s?: string): number | undefined => {
  if (!s) return undefined
  const m = s.match(/(\d+)\s*sec/i)
  return m ? Number(m[1]) : undefined
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
      steps.push({ phase: day.title, name: e.name, detail: e.duration, seconds: parseSecs(e.duration) })
    })
    steps.push({ phase: 'Cool-down', name: 'Cool-down', detail: program.home.cooldown.join(' · ') })
    return steps
  }

  const day = program.gymDays?.[dayIdx]
  if (!day) return steps
  steps.push({ phase: 'Warm-up', name: 'Warm-up', detail: day.warmup.join(' · ') })
  day.supersets.forEach((s, i) => {
    steps.push({ phase: `Superset ${i + 1}`, name: s.push.name, detail: s.reps, cue: s.push.cue })
    steps.push({ phase: 'Rest', name: 'Rest', seconds: 45, rest: true })
    steps.push({ phase: `Superset ${i + 1}`, name: s.pull.name, detail: s.reps, cue: s.pull.cue })
    steps.push({ phase: 'Rest', name: 'Rest', seconds: 60, rest: true })
  })
  day.accessory.forEach((a) => {
    steps.push({ phase: 'Accessory', name: a.name, detail: a.reps, cue: a.cue })
    steps.push({ phase: 'Rest', name: 'Rest', seconds: 45, rest: true })
  })
  steps.push({ phase: `Abs · ${day.ab.scheme}`, name: day.ab.upper.name, detail: day.ab.scheme, cue: day.ab.upper.cue })
  steps.push({ phase: `Abs · ${day.ab.scheme}`, name: day.ab.lower.name, detail: day.ab.scheme, cue: day.ab.lower.cue })
  steps.push({ phase: 'Cardio finisher', name: day.cardio.title, detail: `${day.cardio.mins} · ${day.cardio.speed} · incline ${day.cardio.incline}`, cue: day.cardio.note })
  return steps
}
