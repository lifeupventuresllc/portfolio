import { createServiceClient } from '@/lib/supabase/server'
import { streakFrom } from '@/lib/streak'
import { getTimezone, localDateISO, addDaysISO } from '@/lib/localdate'

// The reward system (prompt 7) — a component INSIDE the Next Action engine,
// not a parallel feature. Purpose: occasionally weave something she
// genuinely values into the one real instruction, as reinforcement for a
// consistency pattern that's already happening — never the reason she's
// doing it, and never something she can learn to expect. Every rule below
// exists to protect that: eligibility reads ONLY consistency (never size or
// effort), the trigger is a real random roll (never a day-count), and nothing
// here is ever exposed to her — she just occasionally gets something nice
// woven into her day, and occasionally a natural single question.

export type RewardCategory = 'nutrition' | 'fitness' | 'recovery' | 'other'
export type RewardSource = 'explicit' | 'asked' | 'inferred'
export type RewardPreference = { id: string; label: string; category: RewardCategory; source: RewardSource }

// Consistency floor before a reward can even be considered — "reinforcement
// for an ALREADY-EXISTING pattern," not a reward for a single isolated day.
const MIN_STREAK_FOR_ELIGIBILITY = 2
// A floor, not a period — prevents back-to-back reward moments from
// feeling like a daily bonus, without ever implying a fixed cadence.
const MIN_DAYS_BETWEEN_REWARDS = 2
// The actual variable-ratio trigger. Deliberately a flat probability with
// no memory of "how long since last time" beyond the floor above — that's
// what keeps it unpredictable rather than creeping toward a due date.
const BASE_REWARD_PROBABILITY = 0.18

const CATEGORY_WEIGHT: Record<RewardCategory, number> = { nutrition: 1.3, fitness: 1.3, recovery: 1.15, other: 1 }
const SOURCE_WEIGHT: Record<RewardSource, number> = { explicit: 1.3, asked: 1.2, inferred: 1 }
const RECENCY_FULL_RECOVERY_DAYS = 14
const MIN_FOOD_REPEATS_FOR_INFERENCE = 3
const FOOD_INFERENCE_WINDOW_DAYS = 60

// Consistency, never intensity or completion size — the ONLY input here is
// whether she showed up on a given day at all (streakFrom treats a
// minimum-viable fallback exactly the same as a full workout, since both
// write the same '__daily__' progress row). Nothing about which action she
// did, how big it was, or how it scored ever enters this function.
export async function isRewardEligible(enrollmentId: string, todayISO: string, dipRiskBand: 'low' | 'medium' | 'high'): Promise<boolean> {
  if (dipRiskBand === 'high') return false // a rough patch isn't when this reads as reinforcement
  const svc = createServiceClient()
  const tz = getTimezone()
  const [{ data: progressRows }, { data: lastReward }] = await Promise.all([
    svc.from('challenge_progress').select('logged_on').eq('enrollment_id', enrollmentId).eq('note', '__daily__'),
    svc.from('next_action_log').select('shown_at').eq('enrollment_id', enrollmentId).eq('is_reward', true).order('shown_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const dates = new Set((progressRows || []).map((r) => r.logged_on as string))
  if (streakFrom(dates, todayISO) < MIN_STREAK_FOR_ELIGIBILITY) return false

  if (lastReward?.shown_at) {
    const lastLocalDay = localDateISO(tz, new Date(lastReward.shown_at as string))
    const floor = addDaysISO(todayISO, -MIN_DAYS_BETWEEN_REWARDS)
    if (lastLocalDay > floor) return false
  }

  return Math.random() < BASE_REWARD_PROBABILITY
}

export type RewardDecision = { type: 'question' } | { type: 'reward'; preference: RewardPreference }

// Builds her real candidate pool from all three profile sources and picks
// ONE — ranked toward nutrition/fitness/recovery (spec's explicit tiebreak
// rule) with a source-confidence multiplier and a recency decay so the same
// thing doesn't get offered back-to-back, plus a small random jitter so the
// top-ranked item isn't deterministically always the pick (that predictability
// would undercut the same "never an expected transaction" goal). Returns a
// question instead when the profile has nothing usable yet — the two
// occasional experiences the spec describes share one trigger.
export async function pickRewardOrQuestion(enrollmentId: string): Promise<RewardDecision> {
  const svc = createServiceClient()
  const [{ data: stored }, { data: foodRows }] = await Promise.all([
    svc.from('reward_preferences').select('id, label, category, source, last_offered_at').eq('enrollment_id', enrollmentId),
    // Behavior-history source: a food she keeps logging on her own, often
    // enough that it's clearly a real favorite rather than a one-off, is a
    // concrete signal without ever asking her about it directly.
    svc.from('challenge_food_log').select('name').eq('enrollment_id', enrollmentId).gte('logged_on', addDaysISO(localDateISO(getTimezone()), -FOOD_INFERENCE_WINDOW_DAYS)),
  ])

  const known = stored || []
  const counts = new Map<string, number>()
  for (const r of foodRows || []) {
    const name = ((r.name as string) || '').trim()
    if (name) counts.set(name, (counts.get(name) || 0) + 1)
  }
  const inferredLabels = Array.from(counts.entries())
    .filter(([name, count]) => count >= MIN_FOOD_REPEATS_FOR_INFERENCE && !known.some((k) => (k.label as string).toLowerCase() === name.toLowerCase()))
    .map(([name]) => name)

  type Ranked = { preference: RewardPreference; lastOfferedAt: string | null }
  const pool: Ranked[] = [
    ...known.map((k) => ({
      preference: { id: k.id as string, label: k.label as string, category: (k.category as RewardCategory) || 'other', source: ((k as { source?: RewardSource }).source) || 'explicit' },
      lastOfferedAt: k.last_offered_at as string | null,
    })),
    ...inferredLabels.map((label) => ({ preference: { id: '', label, category: 'nutrition' as RewardCategory, source: 'inferred' as RewardSource }, lastOfferedAt: null })),
  ]

  if (pool.length === 0) return { type: 'question' }

  const now = Date.now()
  const ranked = pool
    .map((r) => {
      let score = CATEGORY_WEIGHT[r.preference.category] * SOURCE_WEIGHT[r.preference.source]
      if (r.lastOfferedAt) {
        const daysAgo = (now - Date.parse(r.lastOfferedAt)) / 86400000
        score *= Math.min(1, Math.max(0, daysAgo) / RECENCY_FULL_RECOVERY_DAYS)
      }
      return { r, score: score + Math.random() * 0.25 }
    })
    .sort((a, b) => b.score - a.score)

  return { type: 'reward', preference: ranked[0].r.preference }
}

// Persists the pick (giving an inferred, not-yet-stored preference a real
// row) and stamps last_offered_at so the recency decay above actually does
// something on the next occasion. Called only once a reward is actually
// shown, never speculatively.
export async function recordRewardOffered(enrollmentId: string, userId: string | null, preference: RewardPreference): Promise<string> {
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('reward_preferences')
    .upsert(
      { enrollment_id: enrollmentId, user_id: userId, label: preference.label, category: preference.category, source: preference.source, last_offered_at: new Date().toISOString() },
      { onConflict: 'enrollment_id,label' }
    )
    .select('id')
    .single()
  if (error || !data) throw error || new Error('failed to record reward preference')
  return data.id as string
}

// Source #2, explicit — a stated preference from natural language (index.ts
// wires this to parseNextActionSignal's statedPreference field). Weight
// starts higher than an inferred one and is never overwritten down.
export async function recordStatedPreference(enrollmentId: string, userId: string | null, label: string, category: RewardCategory): Promise<void> {
  const svc = createServiceClient()
  await svc.from('reward_preferences').upsert(
    { enrollment_id: enrollmentId, user_id: userId, label, category, source: 'explicit' },
    { onConflict: 'enrollment_id,label' }
  )
}

// Light-touch gap-filling questions (source #3) — a handful of natural
// phrasings rotated randomly so the SAME question doesn't repeat verbatim
// every time the profile is still thin. Always ONE open question, never a
// multiple-choice menu — answering is free text through the same message
// channel as everything else in this engine.
const QUESTION_TEMPLATES = [
  "Quick one — what's a small treat that actually feels good to you after a solid stretch like this?",
  "Out of curiosity, what's something simple that helps you unwind — a snack, a show, a walk, anything?",
  "What's one little thing you genuinely look forward to? Might be food, might be downtime — just curious.",
  "If you got to pick one small nice thing for later today, what would it actually be?",
]

export function pickRewardQuestion(): string {
  return QUESTION_TEMPLATES[Math.floor(Math.random() * QUESTION_TEMPLATES.length)]
}

// Deterministic fallback weave for when the LLM isn't configured or fails —
// humanizeInstruction (llm.ts) is the primary path; this guarantees the
// reward still lands as part of the one instruction either way, never
// silently dropped.
export function weaveRewardDeterministic(baseInstruction: string, preference: RewardPreference): string {
  return `${baseInstruction} And after that — ${preference.label}, love. You've kept showing up, and you deserve it.`
}
