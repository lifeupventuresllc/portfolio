// ============================================================
// Life-Up Fitness — Progression memory (2026-09-01 rebuild, layer three of
// Asa's two-layer-plus directive).
//
// "Skill level and intensity are not static tags chosen once, they are
// dynamic states that update automatically based on the user's logged
// performance history over time, so progressive overload happens
// automatically within the attribute-matching logic itself, rather than as
// a separate layered system."
//
// This file owns exactly that: it reads/writes the real, logged set
// history (workout_set_logs) and the computed live state derived from it
// (progression_state, one row per movement pattern). lib/workout-assembly.ts
// reads getProgressionOverrides() and applies it directly inside its own
// attribute-matching filter/pick logic — never as a second pass bolted on
// after the fact.
// ============================================================
import { createServiceClient } from '@/lib/supabase/server'
import type { MovementPattern, SkillLevel, IntensityLevel, MuscleGroup } from './exercise-library'

export type Effort = 'easy' | 'right' | 'hard'

export interface ProgressionOverride { skillLevel: SkillLevel; intensityLevel: IntensityLevel }

// Two consecutive "hard" sets on a pattern is a real, immediate signal
// she's over her head on it right now — drop intensity fast. Three
// consecutive "easy" is the more conservative bar for climbing, matching
// standard progressive-overload coaching practice (don't chase one lucky
// set). A genuinely sustained streak (intensity already maxed at 5, still
// logging easy) is what promotes skill_level itself — the one thing that
// actually widens which exercises she's eligible for, not just how hard
// the ones she already does get scaled.
const HARD_STREAK_TO_DROP = 2
const EASY_STREAK_TO_RAISE = 3

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }

// The single write path — every set-effort tap goes through this. Logs the
// real row (workout_set_logs) unconditionally, then updates the derived
// state (progression_state) for that one movement pattern. Two effects of
// one input, exactly as specified: the caller (the set-effort API route)
// also computes the IMMEDIATE same-session adjustment separately and
// synchronously (see immediateAdjustment below) — that part never waits on
// this DB round-trip, since it only needs the tap itself, not stored state.
export async function logSetEffort(
  enrollmentId: string, userId: string, exerciseName: string,
  movementPattern: MovementPattern, muscleGroups: string[], effort: Effort, setIndex: number,
): Promise<ProgressionOverride> {
  const svc = createServiceClient()
  await svc.from('workout_set_logs').insert({
    enrollment_id: enrollmentId, user_id: userId, exercise_name: exerciseName,
    movement_pattern: movementPattern, muscle_groups: muscleGroups, effort, set_index: setIndex,
  })

  const { data: existing } = await svc.from('progression_state').select('*')
    .eq('enrollment_id', enrollmentId).eq('movement_pattern', movementPattern).maybeSingle()

  let skill = (existing?.skill_level as SkillLevel) ?? 1
  let intensity = (existing?.intensity_level as IntensityLevel) ?? 2
  let consecEasy = (existing?.consecutive_easy as number) ?? 0
  let consecHard = (existing?.consecutive_hard as number) ?? 0

  if (effort === 'hard') {
    consecHard += 1; consecEasy = 0
    if (consecHard >= HARD_STREAK_TO_DROP) { intensity = clamp(intensity - 1, 1, 5) as IntensityLevel; consecHard = 0 }
  } else if (effort === 'easy') {
    consecEasy += 1; consecHard = 0
    if (consecEasy >= EASY_STREAK_TO_RAISE) {
      if (intensity >= 5 && skill < 3) { skill = (skill + 1) as SkillLevel; intensity = 2 as IntensityLevel }
      else intensity = clamp(intensity + 1, 1, 5) as IntensityLevel
      consecEasy = 0
    }
  } else {
    consecEasy = 0; consecHard = 0
  }

  await svc.from('progression_state').upsert({
    enrollment_id: enrollmentId, movement_pattern: movementPattern,
    skill_level: skill, intensity_level: intensity, consecutive_easy: consecEasy, consecutive_hard: consecHard,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'enrollment_id,movement_pattern' })

  return { skillLevel: skill, intensityLevel: intensity }
}

// What lib/workout-assembly.ts actually consumes — every movement pattern
// she has REAL logged history for, as a lookup the assembly engine applies
// per-exercise during its own attribute filtering. A pattern with no rows
// yet simply isn't in this map, and the engine falls back to her intake
// level exactly as it did before this system existed — cold start is
// identical to pre-rebuild behavior by construction, not a special case.
export async function getProgressionOverrides(enrollmentId: string): Promise<Partial<Record<MovementPattern, ProgressionOverride>>> {
  const svc = createServiceClient()
  const { data } = await svc.from('progression_state').select('movement_pattern, skill_level, intensity_level').eq('enrollment_id', enrollmentId)
  const out: Partial<Record<MovementPattern, ProgressionOverride>> = {}
  for (const row of data || []) {
    out[row.movement_pattern as MovementPattern] = { skillLevel: row.skill_level as SkillLevel, intensityLevel: row.intensity_level as IntensityLevel }
  }
  return out
}

// Asa's explicit call, 2026-09-02: replaces the removed fixed push/pull/
// legs rotation. Instead of a hardcoded weekly split, an untargeted day
// targets whatever she genuinely hasn't trained recently — same idea
// FitBod uses, driven by her real logged sets, not a calendar. Reads the
// same workout_set_logs table/index progression already writes to
// (enrollment_id, movement_pattern, created_at — migration
// 039_progression_engine.sql), just for a different question: not "how
// hard was it," but "what muscles has she actually touched lately."
export async function getRecentlyTrainedMuscles(enrollmentId: string, daysBack = 5): Promise<MuscleGroup[]> {
  const svc = createServiceClient()
  const since = new Date(Date.now() - daysBack * 86400000).toISOString()
  const { data } = await svc.from('workout_set_logs').select('muscle_groups').eq('enrollment_id', enrollmentId).gte('created_at', since)
  const set = new Set<MuscleGroup>()
  for (const row of data || []) {
    for (const m of (row.muscle_groups as string[] | null) || []) set.add(m as MuscleGroup)
  }
  return Array.from(set)
}

// The IMMEDIATE half of "two simultaneous effects of one input" — purely a
// function of the tap itself, no DB read required, so WorkoutPlayer can
// apply it to the very next set of THIS exercise the instant she taps,
// before the logSetEffort() write has even finished. Nudges within the
// already-prescribed rep RANGE (never invents a number outside what the
// coach already scheduled) — "hard" means ease toward the bottom of the
// range and take the rest a beat longer; "easy" means push toward the top
// and don't over-rest.
export function immediateAdjustment(effort: Effort): { repCue: string; restBumpSec: number } {
  if (effort === 'hard') return { repCue: 'Ease toward the lower end of your rep range next set — that’s the right call.', restBumpSec: 20 }
  if (effort === 'easy') return { repCue: 'Push toward the higher end of your rep range next set.', restBumpSec: -10 }
  return { repCue: 'Keep the same range next set.', restBumpSec: 0 }
}
