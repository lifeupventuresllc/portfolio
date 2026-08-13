// On-demand cardio/HIIT session — swapped in for today only when Coach Asa approves
// a workout-style change (see lib/fos/recovery.ts's contentSwap). Never touches her
// permanently stored weekly plan (challenge_workout_plans); the caller (app/plan/
// workout/page.tsx) splices this into an in-memory copy of her program for one render.
// Follows the same "filter an existing pool by known-safe constraints, rotate
// deterministically, never return empty" shape already used by generateHome()'s
// finisher() and lib/escape-plan.ts's pickForNow() — no new content invented, only
// a real pool (HOME_POOL's cardio-tagged moves) wired into an actual session.
//
// Both tracks draw from the SAME equipment-free bodyweight cardio pool — a request
// for "cardio" is about heart rate, not equipment, and she may not be near dumbbells
// when she asks for it. This is deliberately NOT compoundExercisesForLevel() (the
// dumbbell-heavy pool used by her separate, opt-in "compound training style" gym
// finisher, see buildCardioFinisher() in lib/workout.ts) — that pool answers a
// different question (her declared long-term training style) and mixing it in here
// was a real bug: an ad-hoc "give me cardio" could hand her dumbbell moves she never
// asked for and might not have equipment for in the moment.
import { HOME_POOL, isContraindicated, type Injury, type Level } from './workout-exercises'
import { rotate, pickAb, type HomeDay, type GymDay } from './workout'

function cardioPool(level: Level, injuries: Injury[]) {
  const atLevel = HOME_POOL.filter((e) => e.type === 'cardio' && e.level === level && !isContraindicated(e.name, injuries))
  if (atLevel.length) return atLevel
  const anyLevel = HOME_POOL.filter((e) => e.type === 'cardio' && !isContraindicated(e.name, injuries))
  return anyLevel.length ? anyLevel : HOME_POOL.filter((e) => e.type === 'cardio')
}

export function generateCardioSession(track: 'home', level: Level, injuries: Injury[], offset: number): HomeDay
export function generateCardioSession(track: 'gym', level: Level, injuries: Injury[], offset: number): GymDay
export function generateCardioSession(track: 'home' | 'gym', level: Level, injuries: Injury[], offset: number): HomeDay | GymDay {
  const picks = rotate(cardioPool(level, injuries), offset).slice(0, 6)

  if (track === 'home') {
    return {
      dayNum: 0,
      title: 'Cardio & Conditioning',
      exercises: picks.map((p) => ({ name: p.name, duration: '60 sec', imageUrl: p.imageUrl })),
    }
  }

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
      note: 'No equipment needed — 60 seconds on each move, back to back. Go at your own pace, rest as needed between rounds.',
      moves: picks.map((p) => ({ name: p.name, reps: '60 sec', cue: 'Keep moving for the full interval — pace yourself, this is about your heart rate, not perfect reps.', imageUrl: p.imageUrl })),
    },
  }
}
