import { createServiceClient } from '@/lib/supabase/server'
import { addDaysISO } from '@/lib/localdate'
import { streakDetail, milestoneMoment } from '@/lib/streak'
import { AFFIRMATIONS } from '@/lib/affirmations'
import { computeBadges } from '@/lib/achievements'

// ============================================================
// Reward Drops (2026-10-26, Desktop/LUF-Plans/rewards-plan.md).
// A surprise that only ever sits on the far side of a healthy action — a
// finished workout or a logged / ordered meal. Never for opening the app.
//
// Guardrails (plan section 2), all enforced here on the server:
//  - she always gets the baseline (the check + a kind line); the surprise
//    is a bonus on top, nothing is ever taken away
//  - one drop per action per day (unique enrollment + trigger + day)
//  - the same card never comes back within 14 days
//  - hard week (dip risk high): always kind, shield odds go up, no rares
//  - she never sees odds, points or countdowns — none of it leaves here
// ============================================================

export type DropTrigger = 'workout' | 'meal' | 'nutrition'
export type DropTier = 'every' | 'bonus' | 'rare'
export type DropKind = 'kind' | 'selftalk' | 'badge' | 'shield' | 'recipe' | 'milestone' | 'check' | 'note'

export type DropPayload = {
  tag: string          // 'SELF-TALK CARD', 'BADGE', 'STREAK SHIELD', 'NEW RECIPE', 'MILESTONE'
  title: string
  body: string
  big?: string         // rare: the big number line ("10 workouts.")
  photo?: string       // recipe photo
  quote?: boolean      // self-talk: show the title as a quote
  note?: string        // a written note from Coach Asa, built from her real numbers (replaces video clips, 2026-10-27)
}

export type Drop = {
  id: string | null
  trigger: DropTrigger
  day: string
  tier: DropTier
  kind: DropKind
  itemKey: string | null
  payload: DropPayload
  createdAt: string
  openedAt: string | null
  sharedAt?: string | null
}

export type RecipeBonus = { key: string; name: string; cal: number; price: number | null; photo: string; minutes?: number }

const NO_REPEAT_DAYS = 14
const RARE_MIN_GAP_DAYS = 4

// ---- seeded roll ---------------------------------------------------------
// One roll per enrollment + trigger + day: asking twice gives the same
// answer even before the table exists, so the drop can't be re-rolled by
// reloading the finish screen.
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h >>> 0
}
export function seededRng(seed: string): () => number {
  let a = hash(seed) || 1
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- storage (degrades cleanly until migration 047 runs) -----------------

type Svc = ReturnType<typeof createServiceClient>
type Row = { id: string; trigger: string; day: string; tier: string; kind: string; item_key: string | null; payload: DropPayload; created_at: string; opened_at: string | null; shared_at?: string | null }
const COLS = 'id, trigger, day, tier, kind, item_key, payload, created_at, opened_at, shared_at'

function toDrop(r: Row): Drop {
  return { id: r.id, trigger: r.trigger as DropTrigger, day: r.day, tier: r.tier as DropTier, kind: r.kind as DropKind, itemKey: r.item_key, payload: r.payload || { tag: '', title: '', body: '' }, createdAt: r.created_at, openedAt: r.opened_at, sharedAt: r.shared_at ?? null }
}

/** Every drop she's earned, newest first. `ok: false` = the table isn't there yet. */
export async function loadDrops(svc: Svc, enrollmentId: string): Promise<{ ok: boolean; drops: Drop[] }> {
  try {
    const { data, error } = await svc.from('reward_drops').select(COLS).eq('enrollment_id', enrollmentId).order('created_at', { ascending: false }).limit(200)
    if (error) return { ok: false, drops: [] }
    return { ok: true, drops: ((data || []) as Row[]).map(toDrop) }
  } catch {
    return { ok: false, drops: [] }
  }
}

/** Shield dates (local day earned) for streakFrom/streakDetail. */
export function shieldDatesFrom(drops: Drop[]): string[] {
  return drops.filter((d) => d.kind === 'shield').map((d) => d.day)
}

/** What the "Your wins" shelf shows: the real cards, not plain checks or kind lines. */
export function winsFrom(drops: Drop[]): Drop[] {
  return drops.filter((d) => d.tier !== 'every' && d.kind !== 'check' && d.kind !== 'kind')
}

// ---- what she gets --------------------------------------------------------

const WHY_FOR: Record<string, string> = {
  energy: 'For your energy.', kids: 'For your kids.', mood: 'For your peace of mind.', family: 'For your family.',
  look: 'For you, feeling good in your skin.', health: 'For your health.', confidence: 'For your confidence.',
}

export type RollInput = {
  trigger: DropTrigger
  enrollmentId: string
  todayIso: string
  dates: Set<string>            // '__daily__' days she showed up
  workoutDates: string[]        // days with a finished workout
  daysEnrolled: number
  dipHigh: boolean
  whyOwn?: string | null
  payoffs?: string[]
  history: Drop[]               // her past drops (empty when the table is missing)
  recipe?: () => Promise<RecipeBonus | null>
  firstName?: string
  mealsHandled?: number          // meals she picked/logged from her picks, all time
  foodStreak?: number            // nutrition: days in a row on her food target, ending on the drop's day
}

function kindLine(inp: RollInput, rng: () => number, recent: Set<string>): { key: string; payload: DropPayload } {
  const weekStart = addDaysISO(inp.todayIso, -((new Date(inp.todayIso + 'T00:00:00Z').getUTCDay() + 6) % 7))
  const thisWeek = inp.workoutDates.filter((d) => d >= weekStart && d <= inp.todayIso).length
  const own = (inp.whyOwn || '').trim().replace(/[.!]+$/, '')
  const payoff = (inp.payoffs || []).find((p) => WHY_FOR[p])
  const why = own ? `“${own}.” This one counts toward it.` : payoff ? `${WHY_FOR[payoff]} Every one of these is for that.` : 'You did this one for you.'
  const fs = inp.foodStreak || 1
  const lines: [string, string][] = inp.trigger === 'meal'
    ? [['Fed and on track.', why], ['That meal counts.', 'You picked one that fits. That is the whole skill.']]
    : inp.trigger === 'nutrition'
    ? [
      [fs > 1 ? `${fs} days on target.` : 'Yesterday: on target.', why],
      ['Right on your number.', 'You ate for your goal yesterday. That is the hardest part, and you did it.'],
      ['Food handled.', 'Nobody counted for you. You just did it. That is a habit forming.'],
    ]
    : [
      [thisWeek > 1 ? `${thisWeek} this week.` : 'You showed up.', why],
      ['You kept your word.', "You said you'd do it. You did it. That's who you are now."],
      ['That time was all yours.', 'Nobody else got that time today. You did.'],
    ]
  const fresh = lines.map((l, i) => i).filter((i) => !recent.has(`kind:${inp.trigger}:${i}`))
  const pool = fresh.length ? fresh : lines.map((_, i) => i)
  const i = pool[Math.floor(rng() * pool.length)]
  return { key: `kind:${inp.trigger}:${i}`, payload: { tag: "TODAY'S WIN", title: lines[i][0], body: lines[i][1] } }
}

function selfTalk(rng: () => number, recent: Set<string>): { key: string; payload: DropPayload } {
  let idx = Math.floor(rng() * AFFIRMATIONS.length)
  for (let n = 0; n < 50 && recent.has(`talk:${idx}`); n++) idx = (idx + 97) % AFFIRMATIONS.length
  return { key: `talk:${idx}`, payload: { tag: 'SELF-TALK CARD', title: AFFIRMATIONS[idx], body: 'A new line for you. Say it once tomorrow morning.', quote: true } }
}

function shield(): { key: string; payload: DropPayload } {
  return { key: 'shield', payload: { tag: 'STREAK SHIELD', title: '1 shield banked', body: 'Life happens. If you miss a day, this holds your streak for you. Automatic.' } }
}

// A note from Coach Asa (2026-10-27, Asa: no video clips — something like
// them). Written, short, and built only from her real numbers, so it reads
// like he was watching. Rare drops always carry one; sometimes it's a bonus.
function coachNote(inp: RollInput, workouts: number, streak: number, rng: () => number): string {
  const name = (inp.firstName || '').trim()
  const hi = name ? `${name},` : 'Hey,'
  const facts: string[] = []
  if (workouts) facts.push(`${workouts} workout${workouts === 1 ? '' : 's'} done`)
  if (inp.mealsHandled) facts.push(`${inp.mealsHandled} meal${inp.mealsHandled === 1 ? '' : 's'} handled`)
  if (inp.dates.size) facts.push(`${inp.dates.size} day${inp.dates.size === 1 ? '' : 's'} you showed up`)
  const own = (inp.whyOwn || '').trim().replace(/[.!]+$/, '')
  const middle = [
    "You're not trying anymore. This is just who you are now.",
    "Nobody made you do this. You chose you, again and again.",
    "Most people quit before here. You didn't. I see it.",
    "This is what it looks like when it stops being a goal and starts being you.",
  ]
  const close = own ? `Keep going for “${own}.”` : streak >= 3 ? `${streak} days in a row. Protect it.` : 'Same time tomorrow. I got the plan.'
  return `${hi} ${facts.length ? facts.join(', ') + '. ' : ''}${middle[Math.floor(rng() * middle.length)]} ${close}`
}

export async function rollDrop(inp: RollInput): Promise<Omit<Drop, 'id' | 'createdAt' | 'openedAt'>> {
  const rng = seededRng(`${inp.enrollmentId}:${inp.trigger}:${inp.todayIso}`)
  const since = addDaysISO(inp.todayIso, -NO_REPEAT_DAYS)
  const recent = new Set(inp.history.filter((d) => d.day >= since && d.itemKey).map((d) => d.itemKey as string))
  const everGot = new Set(inp.history.map((d) => d.itemKey).filter(Boolean) as string[])
  const lastRare = inp.history.find((d) => d.tier === 'rare')?.day
  const shieldsBanked = streakDetail(inp.dates, inp.todayIso, shieldDatesFrom(inp.history)).shieldsLeft
  const base = { trigger: inp.trigger, day: inp.todayIso }
  const every = () => { const k = kindLine(inp, rng, recent); return { ...base, tier: 'every' as const, kind: 'kind' as const, itemKey: k.key, payload: k.payload } }
  const r = rng()

  // ---- nutrition: a day she ended on her food target (given next morning) ----
  if (inp.trigger === 'nutrition') {
    const fs = inp.foodStreak || 1
    const FOOD_MARKS = [3, 7, 14, 30, 60, 100]
    if (FOOD_MARKS.includes(fs) && !everGot.has(`milestone:food:${fs}`)) {
      return { ...base, tier: 'rare', kind: 'milestone', itemKey: `milestone:food:${fs}`, payload: { tag: 'MILESTONE', big: `${fs} days\non target.`, title: `${fs} days on target`, body: `${fs} days in a row you ate for your goal. That is how it changes for good.` } }
    }
    if (r < (inp.daysEnrolled < 7 ? 0.3 : 0.2)) {
      const rec = inp.recipe ? await inp.recipe().catch(() => null) : null
      if (rec && !recent.has(`recipe:${rec.key}`)) {
        return { ...base, tier: 'bonus', kind: 'recipe', itemKey: `recipe:${rec.key}`, payload: {
          tag: 'NEW RECIPE', title: rec.name, photo: rec.photo,
          body: `${rec.cal} cal${rec.price != null ? ` · about $${rec.price} a serving` : ''}. Fits your calories and your budget.`,
        } }
      }
      const t = selfTalk(rng, recent)
      return { ...base, tier: 'bonus', kind: 'selftalk', itemKey: t.key, payload: t.payload }
    }
    return every()
  }

  // ---- meal: most times just the check ----
  if (inp.trigger === 'meal') {
    const bonusP = inp.dipHigh ? 0.15 : inp.daysEnrolled < 7 ? 0.3 : 0.2
    if (r >= bonusP) return { ...base, tier: 'every', kind: 'check', itemKey: null, payload: { tag: 'CHECK', title: '', body: '' } }
    const rec = inp.recipe ? await inp.recipe().catch(() => null) : null
    if (rec && !recent.has(`recipe:${rec.key}`)) {
      return { ...base, tier: 'bonus', kind: 'recipe', itemKey: `recipe:${rec.key}`, payload: {
        tag: 'NEW RECIPE', title: rec.name, photo: rec.photo,
        body: `${rec.cal} cal${rec.price != null ? ` · about $${rec.price} a serving` : ''}. Fits your calories and your budget.`,
      } }
    }
    const t = selfTalk(rng, recent)
    return { ...base, tier: 'bonus', kind: 'selftalk', itemKey: t.key, payload: t.payload }
  }

  // ---- workout ----
  const { streak } = streakDetail(inp.dates, inp.todayIso, shieldDatesFrom(inp.history))
  const workouts = inp.workoutDates.length
  const moment = milestoneMoment(streak, inp.enrollmentId)

  // Streak milestones are always rare — fixed, earned moments.
  if (moment && !everGot.has(`milestone:streak:${streak}`)) {
    return { ...base, tier: 'rare', kind: 'milestone', itemKey: `milestone:streak:${streak}`, payload: { note: coachNote(inp, workouts, streak, rng), tag: 'MILESTONE', big: `${streak} days\nin a row.`, title: `${streak} days in a row`, body: moment } }
  }
  const WORKOUT_MARKS = [10, 25, 50, 75, 100, 150, 200]
  if (WORKOUT_MARKS.includes(workouts) && !everGot.has(`milestone:workouts:${workouts}`)) {
    return { ...base, tier: 'rare', kind: 'milestone', itemKey: `milestone:workouts:${workouts}`, payload: { note: coachNote(inp, workouts, streak, rng), tag: 'MILESTONE', big: `${workouts}\nworkouts.`, title: `${workouts} workouts`, body: `That's ${workouts} times you picked you. Most people never get here.` } }
  }

  // A badge on the day she earns it — earned moments always come with a card.
  const badges = computeBadges({ streak, daysShowedUp: inp.dates.size, workoutsDone: workouts, checkins: 0, photos: 0, mealPlanBuilt: false, daysEnrolled: inp.daysEnrolled })
  const fresh = badges.find((b) => b.earned && ['first-workout', 'streak-3', 'streak-7', 'workouts-10', 'streak-14', 'streak-21', 'workouts-25'].includes(b.id)
    && b.current === b.goal && !everGot.has(`badge:${b.id}`)
    && (b.id === 'first-workout' ? workouts === 1 : b.id === 'day-one' ? inp.dates.size === 1 : b.id.startsWith('streak') ? streak === b.goal : workouts === b.goal))
  if (fresh) {
    return { ...base, tier: 'bonus', kind: 'badge', itemKey: `badge:${fresh.id}`, payload: { tag: 'BADGE', title: fresh.title, body: fresh.blurb } }
  }

  // Hard week: always kind, higher shield odds, never "almost won".
  if (inp.dipHigh) {
    if (r < 0.4 && shieldsBanked < 3) return { ...base, tier: 'bonus', kind: 'shield', itemKey: 'shield', payload: shield().payload }
    return every()
  }

  const rareOk = !lastRare || lastRare < addDaysISO(inp.todayIso, -RARE_MIN_GAP_DAYS)
  const rareP = rareOk ? 0.05 : 0
  const bonusP = inp.daysEnrolled < 7 ? 0.4 : 0.25
  if (r < rareP && workouts >= 3) {
    return { ...base, tier: 'rare', kind: 'milestone', itemKey: `rare:${inp.todayIso}`, payload: { note: coachNote(inp, workouts, streak, rng), tag: 'MILESTONE', big: `${workouts}\nworkouts.`, title: `${workouts} workouts`, body: `${workouts} times you showed up for you. That's real.` } }
  }
  if (r < rareP + bonusP) {
    const pick = rng()
    if (pick < 0.25 && shieldsBanked < 3) return { ...base, tier: 'bonus', kind: 'shield', itemKey: 'shield', payload: shield().payload }
    if (pick >= 0.45 && pick < 0.6 && workouts >= 2 && !recent.has('note')) {
      return { ...base, tier: 'bonus', kind: 'note', itemKey: 'note', payload: { tag: 'NOTE FROM COACH ASA', title: 'A note for you', body: 'Read it. Then go be proud.', note: coachNote(inp, workouts, streak, rng) } }
    }
    if (pick < 0.45 && inp.recipe) {
      const rec = await inp.recipe().catch(() => null)
      if (rec && !recent.has(`recipe:${rec.key}`)) {
        return { ...base, tier: 'bonus', kind: 'recipe', itemKey: `recipe:${rec.key}`, payload: {
          tag: 'NEW RECIPE', title: rec.name, photo: rec.photo,
          body: `${rec.cal} cal${rec.price != null ? ` · about $${rec.price} a serving` : ''}. Fits your calories and your budget.`,
        } }
      }
    }
    const t = selfTalk(rng, recent)
    return { ...base, tier: 'bonus', kind: 'selftalk', itemKey: t.key, payload: t.payload }
  }
  return every()
}

/** Save it once per enrollment + trigger + day. Returns the saved drop, or
 * null when the table isn't there yet (the drop still shows, unsaved). */
export async function saveDrop(svc: Svc, enrollmentId: string, userId: string, d: Omit<Drop, 'id' | 'createdAt' | 'openedAt'>): Promise<{ drop: Drop; fresh: boolean } | null> {
  try {
    const { data, error } = await svc.from('reward_drops').insert({
      enrollment_id: enrollmentId, user_id: userId, trigger: d.trigger, day: d.day, tier: d.tier, kind: d.kind, item_key: d.itemKey, payload: d.payload,
    }).select(COLS).single()
    if (!error && data) return { drop: toDrop(data as Row), fresh: true }
    // Unique clash = she already got today's (two taps at once) → hand that one back.
    const { data: existing } = await svc.from('reward_drops').select(COLS).eq('enrollment_id', enrollmentId).eq('trigger', d.trigger).eq('day', d.day).maybeSingle()
    return existing ? { drop: toDrop(existing as Row), fresh: false } : null
  } catch {
    return null
  }
}
