// The workout as SCREENS, not steps (2026-10-29, Asa's workout-screen spec):
// one exercise at a time, its sets as circles, one Done button. Two moves
// done back to back (a superset) share one screen and count rounds, with the
// rest after both. Warm-up and cool-down are their own calm screens and are
// never counted as exercises ("Exercise 2 of 5").
import type { WorkoutProgram } from './workout'
import { exerciseVideo } from './exercise-videos'
import { NOT_EXACT_ON_SCREEN } from './exercise-images'
import { DELOAD_CUE, deloadSets } from './double-progression'

// Only a photo of the exact move reaches the screen.
const exactImage = (name: string, url?: string) => (url && !NOT_EXACT_ON_SCREEN.has(name) ? url : undefined)

export interface Move {
  name: string
  cue?: string
  imageUrl?: string
  videoUrl?: string       // a looping demo when we have one; photo otherwise
  reps: number[]          // one number per set/round — never a range
  seconds?: number        // a timed move ("40 sec") instead of reps
  eachSide?: boolean
  progressCue?: string    // double progression: "Go up a weight today." — small gold line under the reps
}

export interface Block {
  kind: 'warmup' | 'exercise' | 'cooldown'
  moves: Move[]           // 1 = one exercise, 2+ = back to back
  rounds: number          // circles on screen
  restSec: number         // after each set (or after both moves of a round)
  lines?: string[]        // warm-up / cool-down list
}

const firstNum = (s: string): number | undefined => {
  const m = s.match(/\d+/)
  return m ? Number(m[0]) : undefined
}

/** "3 × 12–15 (short rest)" → 3 sets of 12; "3 × 18 / 15 / 12" → 18, 15, 12;
 *  "3x30sec" → 3 × 30 seconds; "2–3 sets × 12–15" → 2 sets of 12;
 *  "8 each side" / "60 sec" → 1 set. A range always shows its first number. */
export function parseScheme(scheme: string): { sets: number; reps: number[]; seconds?: number; eachSide: boolean } {
  const s = scheme.trim()
  const eachSide = /each side/i.test(s)
  const m = s.match(/^(\d+)(?:\s*[–-]\s*\d+)?\s*(?:sets?\s*)?[x×]\s*(.+)$/i)
  const sets = m ? Math.max(1, Number(m[1])) : 1
  const rest = m ? m[2] : s
  if (/sec/i.test(rest)) {
    const sec = firstNum(rest) || 30
    return { sets, reps: Array(sets).fill(0), seconds: sec, eachSide }
  }
  const parts = rest.split('/').map((p) => firstNum(p)).filter((n): n is number => n != null && n > 0)
  const base = parts.length ? parts : [10]
  const reps = Array.from({ length: sets }, (_, k) => base[Math.min(k, base.length - 1)])
  return { sets, reps, eachSide }
}

const move = (name: string, scheme: string, cue?: string, imageUrl?: string, extra?: { videoUrl?: string }): { m: Move; sets: number } => {
  const p = parseScheme(scheme)
  return { m: { name, cue, imageUrl: exactImage(name, imageUrl), videoUrl: extra?.videoUrl ?? exerciseVideo(name), reps: p.reps, seconds: p.seconds, eachSide: p.eachSide }, sets: p.sets }
}

export function buildBlocks(program: WorkoutProgram, dayIdx: number): Block[] {
  const blocks: Block[] = []
  // Double progression (2026-10-30): a tracked lift shows HER target number
  // on every set, not the bottom of the printed range.
  const withTarget = (m: Move): Move => {
    const t = program.progression?.[m.name]
    if (t && !m.seconds) return { ...m, reps: m.reps.map(() => t.reps), progressCue: t.cue }
    return program.deload ? { ...m, progressCue: DELOAD_CUE } : m
  }

  if (program.track === 'home' && program.home) {
    const day = program.home.days[dayIdx]
    if (!day) return blocks
    blocks.push({ kind: 'warmup', moves: [], rounds: 1, restSec: 0, lines: program.home.warmup })
    for (const e of day.exercises) {
      // "2 × 8–15" = sets of reps (double progression); "30 sec" = one timed round.
      if (/[x×]/i.test(e.duration)) {
        const a = move(e.name, e.duration, undefined, e.imageUrl)
        blocks.push({ kind: 'exercise', rounds: a.sets, restSec: 30, moves: [withTarget(a.m)] })
        continue
      }
      const sec = firstNum(e.duration)
      const isSec = /sec/i.test(e.duration)
      blocks.push({ kind: 'exercise', rounds: 1, restSec: 20, moves: [withTarget({ name: e.name, imageUrl: exactImage(e.name, e.imageUrl), videoUrl: exerciseVideo(e.name), reps: [isSec ? 0 : sec || 10], seconds: isSec ? sec : undefined })] })
    }
    blocks.push({ kind: 'cooldown', moves: [], rounds: 1, restSec: 0, lines: program.home.cooldown })
    return blocks
  }

  const day = program.gymDays?.[dayIdx]
  if (!day) return blocks
  blocks.push({ kind: 'warmup', moves: [], rounds: 1, restSec: 0, lines: day.warmup })
  for (const s of day.supersets) {
    const a = move(s.push.name, s.reps, s.push.cue, s.push.imageUrl)
    const b = move(s.pull.name, s.reps, s.pull.cue, s.pull.imageUrl)
    blocks.push({ kind: 'exercise', moves: [withTarget(a.m), withTarget(b.m)], rounds: a.sets, restSec: 60 })
  }
  for (const x of day.accessory) {
    const a = move(x.name, x.reps, x.cue, x.imageUrl)
    blocks.push({ kind: 'exercise', moves: [withTarget(a.m)], rounds: a.sets, restSec: 45 })
  }
  if (day.ab) {
    const list = [day.ab.upper, day.ab.lower, ...(day.ab.bonus ? [day.ab.bonus] : [])]
    const ms = list.map((e) => move(e.name, day.ab!.scheme, e.cue, e.imageUrl))
    blocks.push({ kind: 'exercise', moves: ms.map((x) => withTarget(x.m)), rounds: program.deload ? deloadSets(ms[0].sets) : ms[0].sets, restSec: 45 })
  }
  if (day.cardio) {
    if (day.cardio.mode === 'compound' && day.cardio.moves?.length) {
      const ms = day.cardio.moves.map((x) => move(x.name, x.reps, x.cue, x.imageUrl))
      blocks.push({ kind: 'exercise', moves: ms.map((x) => ({ ...x.m, reps: [x.m.reps[0]] })), rounds: 1, restSec: 30 })
    } else {
      const mins = firstNum(day.cardio.mins || '') || 10
      const how = [day.cardio.speed && `speed ${day.cardio.speed}`, day.cardio.incline && `incline ${day.cardio.incline}`].filter(Boolean).join(', ')
      blocks.push({ kind: 'exercise', rounds: 1, restSec: 0, moves: [{ name: day.cardio.title, cue: [how, day.cardio.note].filter(Boolean).join('. '), reps: [0], seconds: mins * 60 }] })
    }
  }
  return blocks
}

const WORK_SEC = 40
const blockSeconds = (b: Block) => b.kind !== 'exercise' ? 180
  : b.rounds * (b.moves.reduce((t, m) => t + (m.seconds ?? WORK_SEC), 0) + b.restSec)

export function estimateBlocksMinutes(blocks: Block[]): number {
  return Math.max(1, Math.round(blocks.reduce((t, b) => t + blockSeconds(b), 0) / 60))
}

/** Shorter day (Coach Asa approved "only 20 minutes"): keep warm-up and
 *  cool-down, then exercises in order until the time runs out — at least one. */
export function trimBlocksToTarget(blocks: Block[], targetMinutes: number): Block[] {
  const fixed = blocks.filter((b) => b.kind !== 'exercise')
  let budget = targetMinutes * 60 - fixed.reduce((t, b) => t + blockSeconds(b), 0)
  const kept: Block[] = []
  for (const b of blocks.filter((x) => x.kind === 'exercise')) {
    const cost = blockSeconds(b)
    if (kept.length === 0 || cost <= budget) { kept.push(b); budget -= cost } else break
  }
  return [...blocks.filter((b) => b.kind === 'warmup'), ...kept, ...blocks.filter((b) => b.kind === 'cooldown')]
}
