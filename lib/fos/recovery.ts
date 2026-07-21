import type { NutritionChange, WorkoutChange } from './types'

// Recovery mode — the operator's non-punishing response to real life. Rule-based, so it
// works with ZERO AI dependency; the Claude layer (Phase 2) will later enrich the wording
// with her accumulated context. The rules already encode the philosophy:
//   "The goal never changes. The path changes." · "Life happened — here's the path forward."

export type LifeSignal =
  | { kind: 'time_crunch'; minutes: number }
  | { kind: 'exhausted' }
  | { kind: 'poor_sleep' }
  | { kind: 'schedule_change'; freeAt?: string }
  | { kind: 'eat_out' }
  | { kind: 'missed'; days: number }
  | { kind: 'craving' }
  | { kind: 'stressed' }

export type RecoveryPlan = {
  message: string
  workoutChange?: WorkoutChange
  nutritionChange?: NutritionChange
}

// Given a life signal + her normal workout length, return a forward-looking,
// goal-protecting adjustment. Never guilt. Always the path forward.
export function recover(signal: LifeSignal, normalMinutes = 45): RecoveryPlan {
  switch (signal.kind) {
    case 'time_crunch': {
      const m = Math.max(10, Math.min(signal.minutes, normalMinutes))
      return {
        message: `${m} minutes is enough. I switched today to the highest-impact ${m}-minute version so you keep your momentum — your progress is still protected.`,
        workoutChange: { fromMinutes: normalMinutes, toMinutes: m, swapTo: 'high-impact express', reason: `only ${signal.minutes} min available` },
      }
    }
    case 'exhausted':
      return {
        message: `Rough day — I hear you. I dropped today to a short, gentle session so you still move without wrecking yourself. Rest is part of the plan, not a break from it.`,
        workoutChange: { toMinutes: 20, swapTo: 'light mobility + short circuit', reason: 'low energy' },
      }
    case 'poor_sleep':
      return {
        message: `You didn't sleep well, so I'm keeping today lighter and I'll help you keep your protein up to recover. The goal doesn't change — just today's path.`,
        workoutChange: { toMinutes: 25, swapTo: 'lower-intensity', reason: 'poor sleep' },
        nutritionChange: { calorieDelta: 0, reason: 'protect recovery' },
      }
    case 'schedule_change':
      return {
        message: `Got it — I re-slotted today's workout${signal.freeAt ? ` to ${signal.freeAt}` : ''} so it fits your day. Nothing lost.`,
        workoutChange: { reason: 'schedule changed' },
      }
    case 'eat_out':
      return {
        message: `Enjoy it. Pick what you love — if it runs higher-calorie, I'll trim the rest of your day automatically so you stay on track. No guilt.`,
        nutritionChange: { dinnerSuggestion: 'balance the rest of the day', reason: 'eating out' },
      }
    case 'missed':
      return {
        message: signal.days <= 1
          ? `Life happened — that's all. You're not starting over; you're continuing. Here's today's path forward.`
          : `A few days off doesn't erase your progress. We don't start over here — we pick the path back up. I made today an easy re-entry so it feels good to be back.`,
        workoutChange: { toMinutes: 20, swapTo: 'easy re-entry', reason: 'returning after a break' },
      }
    case 'craving':
      return {
        message: `A craving isn't a failure — it's your body asking for fuel. Get some protein in you now (tap "Away from home right now?" if you're out) and it'll ease off in a few minutes. No guilt, no starting over.`,
        nutritionChange: { reason: 'craving — protein-first to quiet it' },
      }
    case 'stressed':
      return {
        message: `Stress is real, and today doesn't have to be perfect — it just has to be something. I kept today short and simple so you're not adding pressure on top of pressure. One small win still counts.`,
        workoutChange: { toMinutes: 20, swapTo: 'light mobility + short circuit', reason: 'high stress' },
      }
  }
}

// The daily proactive check-in (feeling/time/location/goal) has STRUCTURED answers
// already — this plans directly from them instead of round-tripping through a
// synthesized sentence + regex matching, which is lossy (free text can't reliably
// carry "swap to a home-only workout" the way an explicit field can). This is the
// fix for: she says "home" but the session still shows gym-only moves like barbell
// squats — trackOverride actually swaps which track's exercises get generated for
// today, not just a cosmetic duration label.
export type DailyContext = {
  feeling: 'great' | 'okay' | 'tired' | 'stressed'
  time: 'short' | 'normal' | 'plenty'
  where: 'home' | 'gym' | 'traveling'
  goal: 'push' | 'showup' | 'recover'
}

export function planForDailyContext(ctx: DailyContext, normalMinutes = 45): RecoveryPlan {
  const wantsLight = ctx.feeling === 'tired' || ctx.feeling === 'stressed' || ctx.goal === 'recover'
  const wantsShort = ctx.time === 'short'
  let toMinutes: number | undefined
  if (wantsShort) toMinutes = 20
  else if (wantsLight) toMinutes = 25
  const swapTo = wantsLight ? 'light mobility + short circuit' : wantsShort ? 'high-impact express' : undefined
  const trackOverride: 'gym' | 'home' | undefined = ctx.where === 'home' ? 'home' : ctx.where === 'gym' ? 'gym' : undefined

  const messages: string[] = []
  if (ctx.feeling === 'stressed') messages.push(`Stress is real — today doesn't have to be perfect, it just has to be something.`)
  else if (ctx.feeling === 'tired') messages.push(`Rough day — I hear you. Keeping it light so you still move without wrecking yourself.`)
  else if (ctx.feeling === 'great') messages.push(`Love that energy — let's use it.`)
  else messages.push(`Got it — building today around where you're at.`)
  if (trackOverride) messages.push(`Since you're ${ctx.where === 'home' ? 'at home' : 'at the gym'} today, I swapped your session to ${ctx.where === 'home' ? 'a bodyweight home' : 'a gym'} workout.`)
  if (toMinutes) messages.push(`Trimmed it to about ${toMinutes} minutes so it actually fits.`)
  if (ctx.where === 'traveling') messages.push(`Traveling — tap "Away from home right now?" any time and I've got your order ready.`)

  const workoutChange: WorkoutChange | undefined = (trackOverride || toMinutes)
    ? { fromMinutes: normalMinutes, toMinutes, swapTo, trackOverride, reason: [wantsShort && 'short on time', trackOverride && `at ${ctx.where}`, wantsLight && ctx.feeling !== 'great' && `feeling ${ctx.feeling}`].filter(Boolean).join(' + ') || undefined }
    : undefined

  return {
    message: messages.join(' '),
    workoutChange,
    nutritionChange: ctx.where === 'traveling' ? { reason: 'traveling — use the eating-out escape hatch' } : undefined,
  }
}
