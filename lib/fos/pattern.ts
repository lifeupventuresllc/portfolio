import { createServiceClient } from '@/lib/supabase/server'
import { detectDip, isSilentDip } from '@/lib/dip-detection'
import { isPackedSchedule, calendarConfigured } from '@/lib/google-calendar'
import { addDaysISO } from '@/lib/localdate'

// ============================================================
// The unified life-pattern engine — Layer 1's real "already knows you"
// mechanism. Everything below it (workout dip, food dip, silence, calendar,
// eating-out frequency, chat-reported stress) used to be five SEPARATE,
// siloed checks, each blind to the others. A real bad week rarely shows up
// as one clean signal crossing one threshold — it shows up as a
// COMBINATION (still logging food, but more takeout; opening the app
// later; mentioned being tired in chat). This reads all of it together and
// treats a real combination as a stronger, earlier signal than any one
// piece alone — exactly the "predictive, not reactive" pillar from the
// original brief. Every input here is data already being collected; this
// asks her nothing new (2026-08-07 standing rule, see luf-reduce-her-
// input-principle).
// ============================================================

export type PatternSignal = 'workout_dip' | 'food_dip' | 'silent' | 'eating_out_spike' | 'recent_stress' | 'packed_schedule'

export type LifePatternAssessment = {
  isDip: boolean
  signals: PatternSignal[]
  confidence: 'low' | 'high'
}

// Chat-reported signals count toward a pattern only when there are 2+ DISTINCT
// DAYS within the window — two stressed/tired messages in one conversation is
// still just a Tuesday, not a pattern; it has to show up more than once across
// separate days. 'craving' is deliberately excluded: it's a normal, frequent,
// one-off urge already handled by its own chat response, not evidence of an
// ongoing rough patch.
const STRESS_EVENT_KINDS = new Set(['stressed', 'low_energy', 'poor_sleep'])
const STRESS_WINDOW_DAYS = 3
const STRESS_MIN_DAYS = 2

// Personal-baseline comparison, same philosophy as detectDip's "3+ day prior
// streak" requirement — a spike only counts relative to HER OWN normal, never
// a generic rule applied to everyone.
const EAT_OUT_RECENT_WINDOW_DAYS = 5
const EAT_OUT_BASELINE_WINDOW_DAYS = 28
const EAT_OUT_MIN_RECENT_COUNT = 3 // floor so sparse data can't false-positive

function isEatingOutSpike(eatOutDates: string[], todayISO: string): boolean {
  // Cutoffs are inclusive of today, so an N-day window starts N-1 days back
  // (today, today-1, ..., today-(N-1) = N distinct calendar days).
  const recentCutoff = addDaysISO(todayISO, -(EAT_OUT_RECENT_WINDOW_DAYS - 1))
  const baselineCutoff = addDaysISO(recentCutoff, -EAT_OUT_BASELINE_WINDOW_DAYS)
  const recent = new Set(eatOutDates.filter((d) => d >= recentCutoff && d <= todayISO))
  const baseline = new Set(eatOutDates.filter((d) => d >= baselineCutoff && d < recentCutoff))
  if (recent.size < EAT_OUT_MIN_RECENT_COUNT) return false
  const baselineWeeklyRate = (baseline.size / EAT_OUT_BASELINE_WINDOW_DAYS) * 7
  const recentWeeklyRate = (recent.size / EAT_OUT_RECENT_WINDOW_DAYS) * 7
  return recentWeeklyRate >= Math.max(3, baselineWeeklyRate * 1.8)
}

export async function assessLifePattern(enrollmentId: string, todayISO: string): Promise<LifePatternAssessment> {
  const svc = createServiceClient()
  const [{ data: progressRows }, { data: foodRows }, { data: enrollment }, { data: eventRows }] = await Promise.all([
    svc.from('challenge_progress').select('logged_on').eq('enrollment_id', enrollmentId).eq('note', '__daily__'),
    svc.from('challenge_food_log').select('logged_on, source').eq('enrollment_id', enrollmentId),
    svc.from('challenge_enrollments').select('last_active_at').eq('id', enrollmentId).maybeSingle(),
    svc.from('fos_events').select('kind, occurred_on').eq('enrollment_id', enrollmentId).gte('occurred_on', addDaysISO(todayISO, -(STRESS_WINDOW_DAYS - 1))),
  ])

  const signals: PatternSignal[] = []

  const workoutDates = new Set((progressRows || []).map((r) => r.logged_on as string))
  if (detectDip(workoutDates, todayISO).isDip) signals.push('workout_dip')

  const foodDates = new Set((foodRows || []).map((r) => r.logged_on as string))
  if (detectDip(foodDates, todayISO).isDip) signals.push('food_dip')

  if (isSilentDip((enrollment?.last_active_at as string | null) ?? null)) signals.push('silent')

  const eatOutDates = (foodRows || []).filter((r) => r.source === 'escape_plan').map((r) => r.logged_on as string)
  if (isEatingOutSpike(eatOutDates, todayISO)) signals.push('eating_out_spike')

  const stressDays = new Set((eventRows || []).filter((e) => STRESS_EVENT_KINDS.has(e.kind as string)).map((e) => e.occurred_on as string))
  if (stressDays.size >= STRESS_MIN_DAYS) signals.push('recent_stress')

  // Only hit the Calendar API when nothing cheaper already fired — same
  // cost-conscious ordering the daily-nudge cron already used.
  if (signals.length === 0 && calendarConfigured && (await isPackedSchedule(enrollmentId))) {
    signals.push('packed_schedule')
  }

  return { isDip: signals.length > 0, signals, confidence: signals.length >= 2 ? 'high' : 'low' }
}

// Identity-affirming copy that scales with how much is actually going on — a
// real combination gets validated as "a lot," not treated the same as one
// isolated blip. Never names a count, never guilt, never "you missed."
export function messageForPattern(a: LifePatternAssessment): { title: string; body: string } {
  if (a.confidence === 'high') {
    return {
      title: "You've been carrying a lot 💛",
      body: "A few things have been heavier than usual lately — that's real, and it's okay. You don't have to catch up on everything at once. Just something small today still counts.",
    }
  }
  if (a.signals.includes('workout_dip')) {
    return { title: "You've been carrying a lot 💛", body: 'No pressure to bounce back to full speed. Just this today — that still counts.' }
  }
  if (a.signals.includes('food_dip')) {
    return { title: "Today doesn't have to be perfect 💛", body: "Let's not worry about the full plan today — just protein and water, that's the whole goal." }
  }
  if (a.signals.includes('eating_out_spike')) {
    return { title: 'No judgment on the takeout 💛', body: "It's been more grab-and-go than usual lately — totally okay. Want today to be simpler?" }
  }
  if (a.signals.includes('recent_stress')) {
    return { title: "I hear you 💛", body: "It sounds like it's been a lot lately. Today doesn't have to be perfect — just something, and that counts." }
  }
  if (a.signals.includes('packed_schedule')) {
    return { title: 'Your week looks stacked 💛', body: "Before it gets overwhelming — want today to be a smaller ask?" }
  }
  // 'silent' — no prior specific-behavior data to reference, just a warm re-entry.
  return { title: 'Good to see you 💛', body: "No pressure to catch up on anything — just pick back up from right here." }
}
