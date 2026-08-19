import { createServiceClient } from '@/lib/supabase/server'
import { detectDip, isSilentDip } from '@/lib/dip-detection'
import { isPackedSchedule, calendarConfigured } from '@/lib/google-calendar'
import { addDaysISO } from '@/lib/localdate'

// ============================================================
// The unified life-pattern engine — Layer 1's real "already knows you"
// mechanism. Everything below it (workout dip, food dip, effort, silence,
// calendar, eating-out frequency, chat-reported stress, travel, chat reply
// latency/tone) used to be separate, siloed checks, each blind to the others. A real bad week rarely shows up
// as one clean signal crossing one threshold — it shows up as a
// COMBINATION (still logging food, but more takeout; opening the app
// later; mentioned being tired in chat). This reads all of it together and
// treats a real combination as a stronger, earlier signal than any one
// piece alone — exactly the "predictive, not reactive" pillar from the
// original brief. Every input here is data already being collected; this
// asks her nothing new (2026-08-07 standing rule, see luf-reduce-her-
// input-principle).
// ============================================================

export type PatternSignal = 'workout_dip' | 'food_dip' | 'effort_dip' | 'chat_pullback' | 'silent' | 'eating_out_spike' | 'recent_stress' | 'traveling' | 'packed_schedule'
export type RiskBand = 'low' | 'medium' | 'high'

export type LifePatternAssessment = {
  isDip: boolean
  signals: PatternSignal[]
  score: number
  riskBand: RiskBand
}

// Relative severity, NOT the detection thresholds above (those stay tuned as-is) —
// an internal targeting weight only, never surfaced to her as a number. Ordered by
// how directly each signal reflects an actual behavior change vs. an indirect or
// self-reported one:
//  - silent (40): the earliest, passive, hardest-to-fake signal — she stopped
//    opening the app at all, before anything was even "due."
//  - workout_dip (35) / food_dip (30): both a broken REAL streak (3+ day prior
//    peak, per detectDip) — already-observed behavior change, not a prediction.
//    Workout weighted slightly above food since it's the higher-friction habit —
//    losing it is typically the earlier domino.
//  - effort_dip (25) / chat_pullback (25): real behavior-QUALITY changes, not
//    just completion — she's still showing up (workout_dip hasn't fired) and
//    still talking to the operator (silent hasn't fired), but HOW she's
//    doing both is quietly shifting: sessions reading as easier than her
//    baseline, or her replies getting slower/shorter than her baseline.
//    Weighted below the binary dips since both are continuous trends against
//    subjective/inferred data, not a clean logged-or-not fact — but above the
//    indirect tier since effort is explicit per-session data she chose to
//    give, and chat_pullback is measured straight off her own real messages,
//    not a keyword guess.
//  - eating_out_spike (20) / recent_stress (20) / traveling (20): real but
//    indirect — she's still engaging (still logging food; still talking to
//    the operator), just differently. traveling sits at the same weight as
//    recent_stress even though it only needs ONE mention, not two — it's a
//    stated fact from her, not an inferred keyword match, so it doesn't
//    carry the same one-off-noise risk stress language does.
//  - packed_schedule (15): weakest single indicator, and structurally can only
//    ever fire ALONE (see the signals.length===0 gate below) — calendar-inferred
//    risk, not a behavior that's already happened.
const SIGNAL_WEIGHT: Record<PatternSignal, number> = {
  silent: 40,
  workout_dip: 35,
  food_dip: 30,
  effort_dip: 25,
  chat_pullback: 25,
  eating_out_spike: 20,
  recent_stress: 20,
  traveling: 20,
  packed_schedule: 15,
}

// Deliberately conservative: a single moderate signal alone should never read as
// "high" (that's still just a normal off day) — only a real COMBINATION, or one of
// the two strongest signals firing alone, should escalate past "low". Starting
// proposal for beta, not tuned against real outcome data yet — revisit once the
// beta-metrics backtest (fos_risk_flags) has real prediction-accuracy numbers in.
//
// One Thing Checker note (deliberate, not an oversight): under the old rule
// (signals.length>=2 -> high), EVERY 2-signal combo hit "high". Under this weighted
// rule, only the heavier combos do (e.g. eating_out_spike+recent_stress=40 lands
// medium, not high). That's intentional, not a regression: whether she gets reached
// out to at all (assessLifePattern's isDip) and whether the response is warm/
// specific/ask-less (messageForPattern's per-signal fallthrough below) are BOTH
// unaffected by band — a "medium" 2-weak-signal week still gets a fully warm,
// identity-affirming, specific message, just not the generic "carrying a lot"
// framing reserved for when things are genuinely heaviest. Lowering this threshold
// to force every 2-signal combo back to "high" would make a single `silent` day
// (40) alone read as "high" too, which is a real behavior change with its own
// downside — not chosen here.
const MEDIUM_THRESHOLD = 35
const HIGH_THRESHOLD = 65

function scoreSignals(signals: PatternSignal[]): number {
  return signals.reduce((sum, s) => sum + SIGNAL_WEIGHT[s], 0)
}

function bandFor(score: number): RiskBand {
  return score >= HIGH_THRESHOLD ? 'high' : score >= MEDIUM_THRESHOLD ? 'medium' : 'low'
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

// The intensity half of "completion & intensity trend" — detectDip only ever
// caught did-she-show-up. effort is 1 (easier than her usual) / 2 (normal) /
// 3 (tougher than usual), tapped once on the workout-completion screen (see
// components/EffortTap.tsx) — relative to HER OWN normal, never an absolute
// scale, same philosophy as isEatingOutSpike above. Same recent-vs-baseline
// shape deliberately: a quiet decline only counts against her own history,
// and only once there's enough data on both sides to trust the read.
const EFFORT_RECENT_WINDOW_DAYS = 7
const EFFORT_BASELINE_WINDOW_DAYS = 21
const EFFORT_MIN_RECENT_COUNT = 3
const EFFORT_MIN_BASELINE_COUNT = 3
const EFFORT_DECLINE_THRESHOLD = 0.5 // recent avg <= baseline avg - this, on the 1-3 scale

function isEffortDeclining(entries: { date: string; effort: number }[], todayISO: string): boolean {
  const recentCutoff = addDaysISO(todayISO, -(EFFORT_RECENT_WINDOW_DAYS - 1))
  const baselineCutoff = addDaysISO(recentCutoff, -EFFORT_BASELINE_WINDOW_DAYS)
  const recent = entries.filter((e) => e.date >= recentCutoff && e.date <= todayISO)
  const baseline = entries.filter((e) => e.date >= baselineCutoff && e.date < recentCutoff)
  if (recent.length < EFFORT_MIN_RECENT_COUNT || baseline.length < EFFORT_MIN_BASELINE_COUNT) return false
  const avg = (arr: { effort: number }[]) => arr.reduce((s, e) => s + e.effort, 0) / arr.length
  return avg(recent) <= avg(baseline) - EFFORT_DECLINE_THRESHOLD
}

// "Response latency & tone" — the one input from Asa's original 5 with no
// existing infra to extend. fos_messages already logs every real chat turn
// (role + content + created_at, written by app/api/plan/operator/route.ts on
// every message) — nothing new asked of her, same as everything else here.
// Two sub-signals, either one alone is enough to fire (this stays ONE
// PatternSignal, matching how Asa named it as one combined item):
//   - reply latency: the gap between an operator message and her next real
//     reply, trending longer than her own baseline.
//   - message length: her own word count trending shorter than her baseline.
// Both compared to HER OWN history, never a fixed rule — same philosophy as
// every other signal in this file.
type ChatMessage = { role: string; content: string; created_at: string }

// The structured daily-context check-in (app/api/plan/daily-context/route.ts)
// writes synthetic user/operator rows ("Daily check-in: feeling tired...")
// back-to-back in the same request — not a real conversational turn, and
// its near-zero latency would fake a "fast reply" data point, and its fixed
// template would fake a "message length" data point. Excluded from both.
const DAILY_CHECKIN_PREFIX = 'Daily check-in:'
function isRealUserMessage(m: ChatMessage): boolean {
  return m.role === 'user' && !m.content.startsWith(DAILY_CHECKIN_PREFIX)
}

const CHAT_RECENT_WINDOW_DAYS = 7
const CHAT_BASELINE_WINDOW_DAYS = 21
const CHAT_MIN_RECENT_COUNT = 3
const CHAT_MIN_BASELINE_COUNT = 3
// A gap longer than this reads as "she stepped away," not "this specific
// reply was slow" — that's isSilentDip's job, not this one. Excluded, not
// capped, so one multi-day gap can't single-handedly wreck the average.
const REPLY_GAP_MAX_MINUTES = 12 * 60
// Proportional (like isEatingOutSpike's 1.8x) with a floor so a baseline of
// "replies in 2 minutes" doesn't flag over a swing to 4 minutes — real noise,
// not a real pattern.
const LATENCY_SLOWDOWN_MULTIPLIER = 1.8
const LATENCY_MIN_ABSOLUTE_INCREASE_MINUTES = 20
// Word count dropping to 60% of her own normal or below.
const LENGTH_DECLINE_RATIO = 0.6
const LENGTH_MIN_BASELINE_WORDS = 4 // someone who was already terse can't "decline" further

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function windowed<T extends { date: string }>(entries: T[], todayISO: string) {
  const recentCutoff = addDaysISO(todayISO, -(CHAT_RECENT_WINDOW_DAYS - 1))
  const baselineCutoff = addDaysISO(recentCutoff, -CHAT_BASELINE_WINDOW_DAYS)
  return {
    recent: entries.filter((e) => e.date >= recentCutoff && e.date <= todayISO),
    baseline: entries.filter((e) => e.date >= baselineCutoff && e.date < recentCutoff),
  }
}

function isChatPullingBack(messages: ChatMessage[], todayISO: string): boolean {
  const ordered = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at))

  const latencies: { date: string; minutes: number }[] = []
  for (let i = 0; i < ordered.length - 1; i++) {
    const cur = ordered[i]
    const next = ordered[i + 1]
    if (cur.role !== 'operator' || !isRealUserMessage(next)) continue
    const minutes = (new Date(next.created_at).getTime() - new Date(cur.created_at).getTime()) / 60000
    if (minutes >= 0 && minutes <= REPLY_GAP_MAX_MINUTES) latencies.push({ date: next.created_at.slice(0, 10), minutes })
  }
  const lengths = ordered
    .filter(isRealUserMessage)
    .map((m) => ({ date: m.created_at.slice(0, 10), words: wordCount(m.content) }))

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length

  const { recent: recentLatency, baseline: baselineLatency } = windowed(latencies, todayISO)
  const slower = recentLatency.length >= CHAT_MIN_RECENT_COUNT && baselineLatency.length >= CHAT_MIN_BASELINE_COUNT
    && (() => {
      const r = avg(recentLatency.map((e) => e.minutes))
      const b = avg(baselineLatency.map((e) => e.minutes))
      return r >= Math.max(b * LATENCY_SLOWDOWN_MULTIPLIER, b + LATENCY_MIN_ABSOLUTE_INCREASE_MINUTES)
    })()

  const { recent: recentLength, baseline: baselineLength } = windowed(lengths, todayISO)
  const shorter = recentLength.length >= CHAT_MIN_RECENT_COUNT && baselineLength.length >= CHAT_MIN_BASELINE_COUNT
    && (() => {
      const r = avg(recentLength.map((e) => e.words))
      const b = avg(baselineLength.map((e) => e.words))
      return b >= LENGTH_MIN_BASELINE_WORDS && r <= b * LENGTH_DECLINE_RATIO
    })()

  return slower || shorter
}

export async function assessLifePattern(enrollmentId: string, todayISO: string): Promise<LifePatternAssessment> {
  const svc = createServiceClient()
  const [{ data: progressRows }, { data: foodRows }, { data: enrollment }, { data: eventRows }, { data: messageRows }] = await Promise.all([
    svc.from('challenge_progress').select('logged_on, measurements').eq('enrollment_id', enrollmentId).eq('note', '__daily__'),
    svc.from('challenge_food_log').select('logged_on, source').eq('enrollment_id', enrollmentId),
    svc.from('challenge_enrollments').select('last_active_at').eq('id', enrollmentId).maybeSingle(),
    svc.from('fos_events').select('kind, occurred_on').eq('enrollment_id', enrollmentId).gte('occurred_on', addDaysISO(todayISO, -(STRESS_WINDOW_DAYS - 1))),
    svc.from('fos_messages').select('role, content, created_at').eq('enrollment_id', enrollmentId)
      .gte('created_at', `${addDaysISO(todayISO, -(CHAT_RECENT_WINDOW_DAYS + CHAT_BASELINE_WINDOW_DAYS - 1))}T00:00:00Z`)
      .order('created_at', { ascending: true }),
  ])

  const signals: PatternSignal[] = []

  const workoutDates = new Set((progressRows || []).map((r) => r.logged_on as string))
  if (detectDip(workoutDates, todayISO).isDip) signals.push('workout_dip')

  const foodDates = new Set((foodRows || []).map((r) => r.logged_on as string))
  if (detectDip(foodDates, todayISO).isDip) signals.push('food_dip')

  const effortEntries = (progressRows || [])
    .map((r) => ({ date: r.logged_on as string, effort: (r.measurements as { effort?: number } | null)?.effort }))
    .filter((e): e is { date: string; effort: number } => typeof e.effort === 'number')
  if (isEffortDeclining(effortEntries, todayISO)) signals.push('effort_dip')

  if (isChatPullingBack((messageRows || []) as ChatMessage[], todayISO)) signals.push('chat_pullback')

  if (isSilentDip((enrollment?.last_active_at as string | null) ?? null)) signals.push('silent')

  const eatOutDates = (foodRows || []).filter((r) => r.source === 'escape_plan').map((r) => r.logged_on as string)
  if (isEatingOutSpike(eatOutDates, todayISO)) signals.push('eating_out_spike')

  const stressDays = new Set((eventRows || []).filter((e) => STRESS_EVENT_KINDS.has(e.kind as string)).map((e) => e.occurred_on as string))
  if (stressDays.size >= STRESS_MIN_DAYS) signals.push('recent_stress')

  // Same window/query as the stress check above (no extra fetch needed) — a
  // single 'travel' event is enough (see the weight comment: this is a
  // stated fact, not an inferred keyword). Previously captured via
  // app/api/plan/daily-context and app/api/plan/operator's location override
  // but never read by anything — dead data. Fixed 2026-08-19.
  if ((eventRows || []).some((e) => e.kind === 'travel')) signals.push('traveling')

  // Only hit the Calendar API when nothing cheaper already fired — same
  // cost-conscious ordering the daily-nudge cron already used.
  if (signals.length === 0 && calendarConfigured && (await isPackedSchedule(enrollmentId))) {
    signals.push('packed_schedule')
  }

  const score = scoreSignals(signals)
  return { isDip: signals.length > 0, signals, score, riskBand: bandFor(score) }
}

// Identity-affirming copy that scales with how much is actually going on — a
// real combination gets validated as "a lot," not treated the same as one
// isolated blip. Never names a count, never guilt, never "you missed." Also
// deliberately written as presence, not a report — "I noticed" and "let's,"
// never a neutral system observation about her from a distance (see
// luf-hand-in-hand-principle: this should read like someone walking next to
// her, not accountability alone).
export function messageForPattern(a: LifePatternAssessment): { title: string; body: string } {
  if (a.riskBand === 'high') {
    return {
      title: "You've been carrying a lot 💛",
      body: "I can tell a few things have been heavier than usual lately — that's real, and it's okay. You don't have to catch up on everything at once. I'm not going anywhere — something small today still counts.",
    }
  }
  if (a.signals.includes('workout_dip')) {
    return { title: "You've been carrying a lot 💛", body: "No pressure to bounce back to full speed. I'm right here — just this today still counts." }
  }
  if (a.signals.includes('effort_dip')) {
    return { title: "Your sessions have felt lighter than usual 💛", body: "That's worth naming, not ignoring — if something's making it harder to push right now, tell me and I'll actually adjust today's session down, not just say the words." }
  }
  if (a.signals.includes('chat_pullback')) {
    return { title: "I've noticed a shift in our chats 💛", body: "You don't have to explain it or sound upbeat for me — I just want you to know I noticed, and I'm not going anywhere. Whenever you're ready to actually talk, I'm right here." }
  }
  if (a.signals.includes('food_dip')) {
    return { title: "Today doesn't have to be perfect 💛", body: "Let's not worry about the full plan today — just protein and water, that's the whole goal. I'll pick it back up with you tomorrow either way." }
  }
  if (a.signals.includes('eating_out_spike')) {
    return { title: "I noticed, and it's okay 💛", body: "It's been more grab-and-go than usual lately — no judgment from me. Want me to make today simpler with you?" }
  }
  if (a.signals.includes('recent_stress')) {
    return { title: "I hear you 💛", body: "It sounds like it's been a lot lately, and I'm not just checking a box here — today doesn't have to be perfect, just something, and I'll count that with you." }
  }
  if (a.signals.includes('traveling')) {
    return { title: "I know you're traveling 💛", body: "No gym, no real kitchen, no problem — I can swap today to a bodyweight session and have exactly what to order lined up wherever you are. Just say the word." }
  }
  if (a.signals.includes('packed_schedule')) {
    return { title: 'I see how stacked your week looks 💛', body: "Before it catches up with you — let's make today a smaller ask, together." }
  }
  // 'silent' — no prior specific-behavior data to reference, just a warm re-entry.
  return { title: "I'm glad you're back 💛", body: "You didn't lose anything by stepping away — let's just pick back up, right from here." }
}
