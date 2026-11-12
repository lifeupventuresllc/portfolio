// ============================================================
// The weight she uses — picked for her (2026-11-12, Asa: "like Fitbod").
//
// First time a move shows up: a starting weight from her level, body weight
// and the kind of move (a curl is lighter than a squat). After that: the
// weight she last logged. Double progression (lib/double-progression.ts)
// decides WHEN it moves: at the top of her reps the screen says "Go up a
// weight today" and this picks the next real step (next dumbbell, next
// kettlebell, +5 lb on a bar or machine). Two misses = one step down.
// She only taps + or − when she used something different.
// Pure functions — no database, no React — so server and screen agree.
// ============================================================
import { weightLabel } from './weight-tags'

export type WeightKind = 'db' | 'db1' | 'kb' | 'bar' | 'machine'

// What a normal gym and home set actually have.
const DB_STEPS = [3, 5, 8, 10, 12, 15, 17.5, 20, 22.5, 25, 27.5, 30, 35, 40, 45, 50, 55, 60, 65, 70]
const KB_STEPS = [9, 13, 18, 26, 35, 44, 53, 62, 70] // 4, 6, 8, 12, 16, 20, 24, 28, 32 kg

/** Moves done with ONE dumbbell held in both hands (goblet squat, pullover…). */
const ONE_DB = /goblet|lunge \+ twist|glute bridge \+ pullover|weighted toe touch|sumo squat \(db\)|woodchop|press out|single-arm|one-arm|dumbbell hip thrust/i

/** Which weight she holds for this move, or null when there's no number to pick (bodyweight, band, cardio). */
export function weightKind(name: string): WeightKind | null {
  const tag = weightLabel(name)
  if (tag === 'Kettlebell') return 'kb'
  if (tag === 'Barbell') return 'bar'
  if (tag === 'Machine') return /treadmill|bike|rower|stair|elliptical/i.test(name) ? null : 'machine'
  if (tag === 'Dumbbells') return ONE_DB.test(name) && !/hammer curl \+ overhead/i.test(name) ? 'db1' : 'db'
  return null
}

/** "each hand" for a pair of dumbbells, nothing otherwise. */
export const weightUnit = (kind: WeightKind) => (kind === 'db' ? 'lb each hand' : 'lb')

/** Starting weight for a beginner woman around 150 lb, by kind of move. The LIGHTEST part of a combo sets it. */
function baseWeight(name: string, kind: WeightKind): number {
  const n = name.toLowerCase()
  if (kind === 'bar') {
    if (/hip thrust/.test(n)) return 85
    if (/squat|deadlift|rdl/.test(n)) return 65
    return 45 // bench, row, press: the empty bar plus a little
  }
  if (kind === 'machine') {
    if (/leg press/.test(n)) return 90
    if (/pulldown|lat /.test(n)) return 50
    if (/seated row|cable row/.test(n)) return 45
    if (/leg curl|leg extension|abduct|adduct/.test(n)) return 40
    if (/chest press|shoulder press/.test(n)) return 30
    if (/kickback|fly|raise|face pull|tricep|curl/.test(n)) return 15
    return 25 // other cable moves
  }
  if (kind === 'kb') {
    if (/get-up|halo|around the world/.test(n)) return 9
    if (/press|curl|row|skull|triceps|pullover|high pull/.test(n)) return 13
    return 18 // swings, deadlifts, squats, bridges
  }
  // dumbbells — lightest part first, so a combo never starts too heavy for its weak link
  if (/lateral|front raise|reverse fly|rear delt|upright row|\bfly\b|y-raise|t-raise/.test(n)) return kind === 'db1' ? 8 : 5
  if (/toe touch|woodchop/.test(n)) return 8
  if (/curl|triceps|tricep|kickback|skull|arnold|shoulder press|overhead press|halo/.test(n)) return kind === 'db1' ? 15 : 10
  if (/chest press|bench|floor press|pullover/.test(n)) return kind === 'db1' ? 15 : 12
  if (/hip thrust/.test(n)) return 25
  if (/press$/.test(n)) return 10
  if (/row/.test(n)) return 15
  return kind === 'db1' ? 20 : 15 // squats, lunges, deadlifts, hip thrusts
}

const stepsFor = (kind: WeightKind) => (kind === 'kb' ? KB_STEPS : kind === 'db' || kind === 'db1' ? DB_STEPS : null)

/** Nearest real weight she can pick up. */
export function snapWeight(lb: number, kind: WeightKind): number {
  const steps = stepsFor(kind)
  if (!steps) return Math.max(kind === 'bar' ? 45 : 5, Math.round(lb / 5) * 5)
  return steps.reduce((best, s) => (Math.abs(s - lb) < Math.abs(best - lb) ? s : best), steps[0])
}

/** One step heavier (dir 1) or lighter (dir −1). */
export function stepWeight(lb: number, kind: WeightKind, dir: 1 | -1): number {
  const steps = stepsFor(kind)
  if (!steps) return Math.max(kind === 'bar' ? 45 : 5, lb + dir * 5)
  const i = steps.indexOf(snapWeight(lb, kind))
  return steps[Math.min(steps.length - 1, Math.max(0, i + dir))]
}

export interface WeightPerson { level: number; bodyweightLb?: number; sex?: 'female' | 'male' | 'other' }

/** Her first weight for a move she's never logged. */
export function startWeight(name: string, kind: WeightKind, p: WeightPerson): number {
  const levelX = p.level >= 3 ? 1.7 : p.level === 2 ? 1.35 : 1
  const bodyX = p.bodyweightLb ? Math.min(1.25, Math.max(0.85, Math.sqrt(p.bodyweightLb / 150))) : 1
  const sexX = p.sex === 'male' ? 1.5 : 1
  return snapWeight(baseWeight(name, kind) * levelX * bodyX * sexX, kind)
}

/** What double progression said last time → how many steps to move today. */
export function stepsFromCue(cue?: string): number {
  if (!cue) return 0
  if (/two weights/i.test(cue)) return 2
  if (/go up a weight/i.test(cue)) return 1
  if (/drop a little weight/i.test(cue)) return -1
  return 0
}

/** Today's weight: her last logged weight moved by what progression says, or her start weight. */
export function pickWeight(name: string, p: WeightPerson, last?: number, cue?: string): number | null {
  const kind = weightKind(name)
  if (!kind) return null
  if (!last) return startWeight(name, kind, p) // first time: start weight is today's weight (no jump on day one)
  let w = snapWeight(last, kind)
  const steps = stepsFromCue(cue)
  for (let i = 0; i < Math.abs(steps); i++) w = stepWeight(w, kind, steps > 0 ? 1 : -1)
  return w
}

export const formatLb = (lb: number) => (Number.isInteger(lb) ? String(lb) : lb.toFixed(1))
