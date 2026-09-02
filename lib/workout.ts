// ============================================================
// Life-Up Fitness — Workout generator entry point.
//
// 2026-09-01 rebuild (Asa's explicit directive): every previous version of
// this file built workouts from fixed, pre-written templates tied to
// location/skill/split. All of that selection logic is gone. This file is
// now a thin, stable entry point: it hands off to the real two-layer engine —
//   lib/exercise-library.ts   — layer one, the atomic tagged exercise pool
//   lib/workout-assembly.ts   — layer two, the dynamic attribute-matching
//                                assembly engine
// — and re-exports exactly what the rest of the app already imports from
// '@/lib/workout' (types + generateWorkout + pickFocusDayIndex +
// applyProgressiveOverload + rotate + GOAL_LABEL), so no caller had to
// change. The CONTRACT stayed the same; everything behind it was rebuilt.
// ============================================================
import { generateProgram, GOAL_LABEL, FOCUS_LABEL, rotate, pickAb } from './workout-assembly'
import type { WorkoutInputs, WorkoutProgram, GymDay, HomeDay, Superset, CardioFinisher, FocusArea, TrainingStyle } from './workout.types'

export type { WorkoutInputs, WorkoutProgram, GymDay, HomeDay, Superset, CardioFinisher, FocusArea, TrainingStyle }
export { GOAL_LABEL, FOCUS_LABEL, rotate, pickAb }

export function generateWorkout(inp: WorkoutInputs): WorkoutProgram {
  return generateProgram(inp)
}

// Real bug found live (pre-rebuild, still true): a chat-triggered "build me
// an arm workout" generates a real program with a focus wired into day 0 —
// but callers reading a plain index for "today's session" need to know
// WHICH day that focus actually landed on for a full multi-day program (the
// PDF export, the week view). Scores each day by how many of its exercises
// hit the requested muscle groups and returns the best match. Unchanged in
// spirit from the pre-rebuild version — still scores the REAL, already-
// assembled day content, never a template — just reads GymDay.muscles /
// HomeDay.title (both now genuinely attribute-derived) instead of reaching
// into GYM_POOL muscle tags directly.
export function pickFocusDayIndex(program: WorkoutProgram, focusArea?: FocusArea | FocusArea[]): number {
  const areas = (Array.isArray(focusArea) ? focusArea : focusArea ? [focusArea] : []).filter((a) => a !== 'overall')
  if (!areas.length) return 0
  const wantsCore = areas.includes('core')
  const bodyAreas = areas.filter((a) => a !== 'core')
  if (program.track === 'gym' && program.gymDays?.length) {
    if (!bodyAreas.length && wantsCore) {
      const idx = program.gymDays.findIndex((d) => !/leg|lower|full body/i.test(d.title))
      return idx >= 0 ? idx : 0
    }
    const wantsLegs = bodyAreas.includes('legs')
    const wantsPush = bodyAreas.some((a) => a === 'chest' || a === 'arms')
    const wantsPull = bodyAreas.some((a) => a === 'back' || a === 'shoulders' || a === 'arms')
    let bestIdx = 0, bestScore = -1
    program.gymDays.forEach((day, i) => {
      let score = 0
      if (wantsLegs && /leg|quad|hamstring|glute/i.test(day.title)) score += 2
      if (wantsPush && /push|chest/i.test(day.title)) score += 2
      if (wantsPull && /pull|back|shoulder/i.test(day.title)) score += 2
      if (score > bestScore) { bestScore = score; bestIdx = i }
    })
    return bestIdx
  }
  if (program.track === 'home' && program.home?.days.length) {
    const wantsUpper = bodyAreas.some((a) => a === 'arms' || a === 'chest' || a === 'back' || a === 'shoulders')
    const wantType = wantsUpper ? 'Upper' : bodyAreas.includes('legs') ? 'Leg' : wantsCore ? 'Core' : null
    if (wantType) {
      const idx = program.home.days.findIndex((d) => d.title.includes(wantType))
      if (idx >= 0) return idx
    }
  }
  return 0
}

// Real progressive overload — unchanged from the pre-rebuild version. Still
// the only trigger available (no per-exercise weight log exists app-wide
// yet — see lib/progression.ts, the new set-level logging this rebuild
// introduces, which will replace this consistency-only trigger once enough
// real logged history exists).
const PROGRESSION_THRESHOLD_WEEKS = 3
export function applyProgressiveOverload(program: WorkoutProgram, consistencyWeeks: number): WorkoutProgram {
  if (consistencyWeeks < PROGRESSION_THRESHOLD_WEEKS) return program
  const note = `${consistencyWeeks} weeks consistent at this level — time to push a little harder.`
  if (program.track === 'gym' && program.gymDays?.length) {
    const cue = ' — go up in weight or reps from last time'
    const gymDays = program.gymDays.map((day) => ({
      ...day,
      supersets: day.supersets.map((s) => (s.reps.includes(cue) ? s : { ...s, reps: `${s.reps}${cue}` })),
    }))
    return { ...program, gymDays, progressionNote: note }
  }
  if (program.track === 'home' && program.home) {
    const bump = (d: string): string => {
      const m = d.match(/^(\d+)(\D*)$/)
      if (!m) return d
      return `${Math.round(parseInt(m[1], 10) * 1.2)}${m[2]}`
    }
    const days = program.home.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((e) => ({ ...e, duration: bump(e.duration) })),
    }))
    return { ...program, home: { ...program.home, days }, progressionNote: note }
  }
  return program
}
