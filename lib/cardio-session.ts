// On-demand cardio/HIIT session — swapped in for today only when Coach Asa approves
// a workout-style change (see lib/fos/recovery.ts's contentSwap). Never touches her
// permanently stored weekly plan (challenge_workout_plans); the caller (app/plan/
// workout/page.tsx) splices this into an in-memory copy of her program for one render.
// Follows the same "filter an existing pool by known-safe constraints, rotate
// deterministically, never return empty" shape already used by generateHome()'s
// finisher() and lib/escape-plan.ts's pickForNow() — no new content invented, only
// real pools (HOME_POOL's cardio-tagged moves, COMPOUND_POOL for the gym track,
// which has no cardio-tagged exercises of its own) wired into an actual session.
import { HOME_POOL, isContraindicated, type Injury, type Level } from './workout-exercises'
import { compoundExercisesForLevel } from './compound-exercises'
import { rotate, pickAb, type HomeDay, type GymDay } from './workout'

export function generateCardioSession(track: 'home', level: Level, injuries: Injury[], offset: number): HomeDay
export function generateCardioSession(track: 'gym', level: Level, injuries: Injury[], offset: number): GymDay
export function generateCardioSession(track: 'home' | 'gym', level: Level, injuries: Injury[], offset: number): HomeDay | GymDay {
  if (track === 'home') {
    const atLevel = HOME_POOL.filter((e) => e.type === 'cardio' && e.level === level && !isContraindicated(e.name, injuries))
    const pool = atLevel.length ? atLevel : HOME_POOL.filter((e) => e.type === 'cardio' && !isContraindicated(e.name, injuries))
    const picks = rotate(pool.length ? pool : HOME_POOL.filter((e) => e.type === 'cardio'), offset).slice(0, 6)
    return {
      dayNum: 0,
      title: 'Cardio & Conditioning',
      exercises: picks.map((p) => ({ name: p.name, duration: '60 sec', imageUrl: p.imageUrl })),
    }
  }

  const moves = rotate(compoundExercisesForLevel(level, injuries), offset).slice(0, 6)
  return {
    dayNum: 0,
    title: 'Cardio & Conditioning',
    muscles: ['full body'],
    warmup: ['Arm Circles – 60 sec', 'Torso Twists – 60 sec', 'Leg Swings / Hip Circles – 60 sec'],
    supersets: [],
    accessory: [],
    ab: { upper: pickAb('upper', level, offset, false, injuries), lower: pickAb('lower', level, offset + 1, false, injuries), scheme: '3x15' },
    cardio: {
      title: 'Cardio & Conditioning',
      mode: 'compound',
      note: 'Real HIIT-style moves, back to back — go at your own pace, rest as needed between rounds.',
      moves: moves.map((m) => ({ name: m.name, reps: m.reps, cue: m.cue, imageUrl: m.imageUrl })),
    },
  }
}
