import { createServiceClient } from '@/lib/supabase/server'
import { streakFrom } from '@/lib/streak'
import { localDateISO, addDaysISO, localMondayIndex } from '@/lib/localdate'
import { parseStoredPayoffs, type Payoff } from '@/lib/payoff'
import { mealKeyFromLog, mealPhoto, shortName, type MealOption } from '@/lib/meal-pick'
import { sendPush, pushConfigured } from '@/lib/push'
export { CHEERS, type CheerId } from '@/lib/partner-cheers'

// The Friends tab is one accountability partner, not a follow graph — the
// open "everyone" feed already exists as the Community/Connect tab. Streak
// and check-in data here reuse the exact same source (challenge_progress
// '__daily__' rows + streakFrom) the dashboard and leaderboard already read,
// so a partner's numbers never drift from what she'd see on her own profile.
//
// Sharing (2026-10-26, friends-plan.md): four switches per person — I showed
// up, My goal, My meals, My progress. They're stored on HER OWN living
// profile (fos_profile.preferences.partner_shares), tagged with the
// partnership they were chosen for, so no new table or column is needed and
// a new partner always gets asked again. Everything switched off is dropped
// HERE, on the server — it never reaches her partner's phone. Calories and
// weight never leave the server at all.

// ---- share switches ---------------------------------------------------------

export interface Shares { showed_up: boolean; goal: boolean; meals: boolean; progress: boolean }

/** What the consent screen starts on: three on, progress off. */
export const SUGGESTED_SHARES: Shares = { showed_up: true, goal: true, meals: true, progress: false }
/** Before she's opened the screen for this partner: only what partners
 * could always see (showed up). Nothing new is shared without a yes. */
const UNCHOSEN_SHARES: Shares = { showed_up: true, goal: false, meals: false, progress: false }

type Prefs = Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Svc = any

async function readPrefs(svc: Svc, enrollmentId: string): Promise<Prefs> {
  try {
    const { data, error } = await svc.from('fos_profile').select('preferences').eq('enrollment_id', enrollmentId).maybeSingle()
    if (error || !data) return {}
    return (data.preferences && typeof data.preferences === 'object' ? data.preferences : {}) as Prefs
  } catch { return {} }
}

/** Merge keys into her fos_profile.preferences (creates the row if needed).
 * `undefined` values remove a key. */
async function patchPrefs(svc: Svc, enrollmentId: string, patch: Prefs): Promise<boolean> {
  try {
    const { data: row } = await svc.from('fos_profile').select('enrollment_id, preferences').eq('enrollment_id', enrollmentId).maybeSingle()
    const next: Prefs = { ...((row?.preferences as Prefs) || {}) }
    for (const [k, v] of Object.entries(patch)) { if (v === undefined) delete next[k]; else next[k] = v }
    const now = new Date().toISOString()
    const { error } = row
      ? await svc.from('fos_profile').update({ preferences: next, updated_at: now }).eq('enrollment_id', enrollmentId)
      : await svc.from('fos_profile').insert({ enrollment_id: enrollmentId, preferences: next, updated_at: now })
    return !error
  } catch { return false }
}

function sharesFrom(prefs: Prefs, partnershipId: string): { shares: Shares; chosen: boolean } {
  const s = prefs.partner_shares as (Partial<Shares> & { partnership_id?: string }) | undefined
  if (!s || s.partnership_id !== partnershipId) return { shares: { ...UNCHOSEN_SHARES }, chosen: false }
  return { shares: { showed_up: !!s.showed_up, goal: !!s.goal, meals: !!s.meals, progress: !!s.progress }, chosen: true }
}

// ---- the goal line ------------------------------------------------------------
// Built ONLY from the reasons she tapped — never her own typed words (why_own).
const GOAL_WORDS: Record<Payoff, [string, string]> = {
  energy: ['my energy', 'her energy'], kids: ['my kids', 'her kids'], mood: ['my peace of mind', 'her peace of mind'],
  family: ['my family', 'her family'], look: ['feeling good in my skin', 'feeling good in her skin'],
  health: ['my health', 'her health'], confidence: ['my confidence', 'her confidence'],
}
function goalWords(formData: Prefs | null | undefined, who: 0 | 1): string | null {
  const first = parseStoredPayoffs(formData?.payoffs)[0]
  return first ? GOAL_WORDS[first][who] : null
}

// ---- status ---------------------------------------------------------------------

export interface PartnerMeal { slot: string; name: string; place: string; photo: string }

export interface PartnerSide {
  enrollmentId: string
  name: string
  // null = she isn't sharing "I showed up"
  streak: number | null
  checkedInToday: boolean | null
  weeklyCount: number | null
  goalLine: string | null       // "her health" — only when she shares her goal
  meals: PartnerMeal[]          // today's picked meals — only when she shares meals
  progressLine?: string | null  // "Down 4 lbs since you paired" — only when she shares progress (never a weight)
}

export interface TeamTarget {
  goal: number
  count: number                 // both of you, this week (resets Monday)
  myCount: number
  partnerCount: number
  accepted: boolean
  startedByMe: boolean
}

export interface PartnerStatus {
  partnershipId: string
  weeklyGoal: number
  me: PartnerSide
  partner: PartnerSide
  myShares: Shares
  sharesChosen: boolean         // false → show the consent screen first
  canShareProgress: boolean     // false when she's pregnant or nursing — the switch is hidden
  myGoalLine: string | null     // "my health" — the preview on her own switch
  teamAvailable: boolean        // both share "I showed up"
  team: TeamTarget | null
}

/** Her change since the pair started, in words only (friends-plan phase 5).
 * Rounded to whole pounds; a gain never shows a number. null = nothing to
 * show yet (no weigh-in since pairing). The weight itself never leaves here. */
async function progressSincePaired(svc: Svc, enrollmentId: string, pairedAt: string): Promise<string | null> {
  try {
    const [{ data: before }, { data: after }] = await Promise.all([
      svc.from('challenge_progress').select('weight_lbs').eq('enrollment_id', enrollmentId).not('weight_lbs', 'is', null)
        .lte('created_at', pairedAt).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      svc.from('challenge_progress').select('weight_lbs, created_at').eq('enrollment_id', enrollmentId).not('weight_lbs', 'is', null)
        .gt('created_at', pairedAt).order('created_at', { ascending: true }),
    ])
    const later = (after || []) as { weight_lbs: number }[]
    if (!later.length) return null
    const start = Number(before?.weight_lbs) || Number(later[0].weight_lbs)
    const latest = Number(later[later.length - 1].weight_lbs)
    if (!start || !latest || (!before && later.length < 2)) return null
    const diff = Math.round(start - latest)
    if (diff >= 1) return `Down ${diff} lb${diff === 1 ? '' : 's'} since you paired`
    if (diff === 0) return 'Holding steady'
    return 'Keeping at it'
  } catch { return null }
}

async function checkinDates(svc: Svc, enrollmentId: string): Promise<Set<string>> {
  const { data } = await svc.from('challenge_progress').select('logged_on')
    .eq('enrollment_id', enrollmentId).eq('note', '__daily__')
  return new Set((data || []).map((r: { logged_on: string }) => r.logged_on))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActivePartnership(enrollmentId: string): Promise<any | null> {
  const svc = createServiceClient()
  const { data } = await svc.from('accountability_partnerships').select('*')
    .eq('status', 'active')
    .or(`enrollment_a.eq.${enrollmentId},enrollment_b.eq.${enrollmentId}`)
    .maybeSingle()
  return data || null
}

/** The enrollment for a signed-in user (newest first, email fallback). */
export async function enrollmentIdFor(user: { id: string; email?: string | null }): Promise<string | null> {
  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id')
      .eq('email', user.email).order('created_at', { ascending: false }).limit(1).maybeSingle()
    enrollment = byEmail || null
  }
  return (enrollment?.id as string) || null
}

async function todaysPickedMeals(svc: Svc, enrollmentId: string): Promise<PartnerMeal[]> {
  const since = new Date(Date.now() - 24 * 3600000).toISOString()
  const { data } = await svc.from('challenge_food_log').select('name, brand, meal, created_at')
    .eq('enrollment_id', enrollmentId).eq('source', 'meal_pick').gte('created_at', since)
    .order('created_at', { ascending: false }).limit(3)
  return ((data || []) as { name: string; brand: string | null; meal: string | null }[]).map((r) => {
    const key = mealKeyFromLog(r.name, r.brand)
    const o = { key, kind: key.startsWith('cook:') ? 'cook' : 'out', name: r.name, place: r.brand || '' } as MealOption
    return {
      slot: (r.meal || 'meal').toUpperCase(),
      name: shortName(o),
      place: o.kind === 'cook' ? 'Cooked at home' : (r.brand || ''),
      photo: mealPhoto(o),
    }
  }).reverse()
}

type TeamPref = { partnership_id?: string; goal?: number; started_at?: string; accepted_at?: string | null }

export async function getPartnerStatus(enrollmentId: string): Promise<PartnerStatus | null> {
  const svc = createServiceClient()
  const partnership = await getActivePartnership(enrollmentId)
  if (!partnership) return null
  const partnerEnrollmentId = partnership.enrollment_a === enrollmentId ? partnership.enrollment_b : partnership.enrollment_a

  const [{ data: enrollments }, { data: intakes }, myPrefs, partnerPrefs, myDates, partnerDates] = await Promise.all([
    svc.from('challenge_enrollments').select('id, name').in('id', [enrollmentId, partnerEnrollmentId]),
    svc.from('challenge_intake').select('enrollment_id, form_data').in('enrollment_id', [enrollmentId, partnerEnrollmentId]),
    readPrefs(svc, enrollmentId),
    readPrefs(svc, partnerEnrollmentId),
    checkinDates(svc, enrollmentId),
    checkinDates(svc, partnerEnrollmentId),
  ])

  const today = localDateISO()
  const weekStart = addDaysISO(today, -localMondayIndex())

  const weeklyCount = (dates: Set<string>) => {
    let c = 0
    for (let d = weekStart; d <= today; d = addDaysISO(d, 1)) if (dates.has(d)) c++
    return c
  }
  const nameFor = (id: string) => (enrollments || []).find((e: { id: string; name: string }) => e.id === id)?.name || 'Your partner'
  const formFor = (id: string) => ((intakes || []).find((i: { enrollment_id: string }) => i.enrollment_id === id)?.form_data || {}) as Prefs

  const mine = sharesFrom(myPrefs, partnership.id)
  const theirs = sharesFrom(partnerPrefs, partnership.id).shares
  const myForm = formFor(enrollmentId)
  const pregnantOrNursing = myForm.life_stage === 'pregnant' || myForm.life_stage === 'nursing'

  // Her partner's side: only what her partner switched on.
  const partnerMeals = theirs.meals ? await todaysPickedMeals(svc, partnerEnrollmentId) : []
  // Progress: only if she switched it on, and never when she's pregnant or nursing.
  const partnerLife = (formFor(partnerEnrollmentId) as { life_stage?: string }).life_stage
  const partnerProgress = theirs.progress && partnerLife !== 'pregnant' && partnerLife !== 'nursing'
    ? await progressSincePaired(svc, partnerEnrollmentId, String(partnership.created_at || new Date(0).toISOString())) : null
  const myWeek = weeklyCount(myDates)
  const partnerWeek = weeklyCount(partnerDates)

  // Team target: kept on whoever started it, for this partnership only.
  const teamAvailable = mine.shares.showed_up && theirs.showed_up
  let team: TeamTarget | null = null
  if (teamAvailable) {
    const mineT = myPrefs.team_target as TeamPref | undefined
    const theirT = partnerPrefs.team_target as TeamPref | undefined
    const valid = [mineT && mineT.partnership_id === partnership.id ? { t: mineT, me: true } : null, theirT && theirT.partnership_id === partnership.id ? { t: theirT, me: false } : null]
      .filter((x): x is { t: TeamPref; me: boolean } => !!x)
      .sort((a, b) => Number(!!b.t.accepted_at) - Number(!!a.t.accepted_at) || String(a.t.started_at).localeCompare(String(b.t.started_at)))
    const pick = valid[0]
    if (pick) {
      team = {
        goal: Math.max(2, Math.min(14, Number(pick.t.goal) || 8)),
        count: myWeek + partnerWeek, myCount: myWeek, partnerCount: partnerWeek,
        accepted: !!pick.t.accepted_at, startedByMe: pick.me,
      }
    }
  }

  return {
    partnershipId: partnership.id,
    weeklyGoal: partnership.weekly_goal_workouts,
    me: {
      enrollmentId, name: nameFor(enrollmentId),
      streak: streakFrom(myDates, today), checkedInToday: myDates.has(today), weeklyCount: myWeek,
      goalLine: goalWords(myForm, 0), meals: [],
    },
    partner: {
      enrollmentId: partnerEnrollmentId, name: nameFor(partnerEnrollmentId),
      streak: theirs.showed_up ? streakFrom(partnerDates, today) : null,
      checkedInToday: theirs.showed_up ? partnerDates.has(today) : null,
      weeklyCount: theirs.showed_up ? partnerWeek : null,
      goalLine: theirs.goal ? goalWords(formFor(partnerEnrollmentId), 1) : null,
      meals: partnerMeals,
      progressLine: partnerProgress,
    },
    myShares: { ...mine.shares, progress: pregnantOrNursing ? false : mine.shares.progress },
    sharesChosen: mine.chosen,
    canShareProgress: !pregnantOrNursing,
    myGoalLine: goalWords(myForm, 0),
    teamAvailable,
    team,
  }
}

export async function saveShares(enrollmentId: string, shares: Shares): Promise<boolean> {
  const svc = createServiceClient()
  const partnership = await getActivePartnership(enrollmentId)
  if (!partnership) return false
  const { data: intake } = await svc.from('challenge_intake').select('form_data').eq('enrollment_id', enrollmentId).maybeSingle()
  const ls = (intake?.form_data as Prefs | null)?.life_stage
  const progress = ls === 'pregnant' || ls === 'nursing' ? false : !!shares.progress
  return patchPrefs(svc, enrollmentId, {
    partner_shares: {
      partnership_id: partnership.id, showed_up: !!shares.showed_up, goal: !!shares.goal, meals: !!shares.meals, progress,
      saved_at: new Date().toISOString(),
    },
  })
}

// ---- end partnership ------------------------------------------------------------

/** Ends her partnership right away. Her partner is told only that it ended
 * (one quiet note on her Friends tab), never a reason. */
export async function endPartnership(enrollmentId: string): Promise<boolean> {
  const svc = createServiceClient()
  const partnership = await getActivePartnership(enrollmentId)
  if (!partnership) return false
  const { error } = await svc.from('accountability_partnerships').update({ status: 'ended' }).eq('id', partnership.id)
  if (error) return false
  const partnerEnrollmentId = partnership.enrollment_a === enrollmentId ? partnership.enrollment_b : partnership.enrollment_a
  await patchPrefs(svc, partnerEnrollmentId, { partner_ended_notice: { id: partnership.id, at: new Date().toISOString() } })
  return true
}

/** True for 3 days after her partner ended things (or until she pairs
 * again). Read-only, so a background refresh can never swallow it. */
export async function hasEndedNotice(enrollmentId: string): Promise<boolean> {
  const svc = createServiceClient()
  const n = (await readPrefs(svc, enrollmentId)).partner_ended_notice as { at?: string } | string | undefined
  if (!n || typeof n !== 'object' || !n.at) return false
  return Date.now() - new Date(n.at).getTime() < 3 * 86400000
}

// ---- team target -------------------------------------------------------------------

export async function startTeamTarget(enrollmentId: string, goal: number): Promise<boolean> {
  const svc = createServiceClient()
  const partnership = await getActivePartnership(enrollmentId)
  if (!partnership) return false
  return patchPrefs(svc, enrollmentId, {
    team_target: { partnership_id: partnership.id, goal: Math.max(2, Math.min(14, Math.round(goal) || 8)), started_at: new Date().toISOString(), accepted_at: null },
  })
}

/** "I'm in" — accepts the target her partner started. */
export async function acceptTeamTarget(enrollmentId: string): Promise<boolean> {
  const svc = createServiceClient()
  const partnership = await getActivePartnership(enrollmentId)
  if (!partnership) return false
  const partnerEnrollmentId = partnership.enrollment_a === enrollmentId ? partnership.enrollment_b : partnership.enrollment_a
  const prefs = await readPrefs(svc, partnerEnrollmentId)
  const t = prefs.team_target as TeamPref | undefined
  if (!t || t.partnership_id !== partnership.id) return false
  return patchPrefs(svc, partnerEnrollmentId, { team_target: { ...t, accepted_at: new Date().toISOString() } })
}

// ---- "<Name> had this" (Nutrition) ---------------------------------------------------

/** Her partner's picked meals from the last 3 days, as meal keys — only
 * when her partner shares meals. Exact source 'meal_pick' only (never add-ons
 * or anything typed in by hand). */
export async function partnerMealKeys(enrollmentId: string): Promise<{ name: string; keys: Set<string> } | null> {
  try {
    const svc = createServiceClient()
    const partnership = await getActivePartnership(enrollmentId)
    if (!partnership) return null
    const partnerEnrollmentId = partnership.enrollment_a === enrollmentId ? partnership.enrollment_b : partnership.enrollment_a
    const prefs = await readPrefs(svc, partnerEnrollmentId)
    if (!sharesFrom(prefs, partnership.id).shares.meals) return null
    const since = new Date(Date.now() - 3 * 86400000).toISOString()
    const [{ data: rows }, { data: who }] = await Promise.all([
      svc.from('challenge_food_log').select('name, brand').eq('enrollment_id', partnerEnrollmentId).eq('source', 'meal_pick').gte('created_at', since).limit(30),
      svc.from('challenge_enrollments').select('name').eq('id', partnerEnrollmentId).maybeSingle(),
    ])
    const keys = new Set(((rows || []) as { name: string; brand: string | null }[]).map((r) => mealKeyFromLog(r.name, r.brand)))
    if (!keys.size) return null
    const name = String(who?.name || '').trim().split(/\s+/)[0] || 'Your partner'
    return { name, keys }
  } catch { return null }
}

// ---- invites ------------------------------------------------------------------------

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I ambiguity
function randomCode(len = 6): string {
  let s = ''
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return s
}

export async function getOrCreateInviteCode(enrollmentId: string): Promise<string> {
  const svc = createServiceClient()
  const { data: existing } = await svc.from('partner_invites').select('code')
    .eq('inviter_enrollment_id', enrollmentId).is('used_by_enrollment_id', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (existing) return existing.code as string

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode()
    const { error } = await svc.from('partner_invites').insert({ code, inviter_enrollment_id: enrollmentId })
    if (!error) return code
  }
  throw new Error('Could not generate an invite code')
}

export async function redeemInviteCode(code: string, joiningEnrollmentId: string): Promise<{ ok: true; partnershipId: string } | { ok: false; error: string }> {
  const svc = createServiceClient()
  const normalized = code.trim().toUpperCase()
  const { data: invite } = await svc.from('partner_invites').select('*')
    .eq('code', normalized).is('used_by_enrollment_id', null).maybeSingle()
  if (!invite) return { ok: false, error: 'That code is invalid or already used.' }
  if (new Date(invite.expires_at as string) < new Date()) return { ok: false, error: 'That code has expired.' }
  if (invite.inviter_enrollment_id === joiningEnrollmentId) return { ok: false, error: "That's your own invite code." }

  if (await getActivePartnership(joiningEnrollmentId)) return { ok: false, error: 'You already have an accountability partner.' }
  if (await getActivePartnership(invite.inviter_enrollment_id as string)) return { ok: false, error: 'That person already has an accountability partner.' }

  const { data: partnership, error: pErr } = await svc.from('accountability_partnerships')
    .insert({ enrollment_a: invite.inviter_enrollment_id, enrollment_b: joiningEnrollmentId })
    .select('id').single()
  if (pErr || !partnership) return { ok: false, error: 'Something went wrong pairing you up.' }

  await svc.from('partner_invites').update({ used_by_enrollment_id: joiningEnrollmentId, used_at: new Date().toISOString() }).eq('id', invite.id)
  // A new partner: any old "partnership ended" note is done.
  await Promise.all([
    patchPrefs(svc, joiningEnrollmentId, { partner_ended_notice: undefined }),
    patchPrefs(svc, invite.inviter_enrollment_id as string, { partner_ended_notice: undefined }),
  ])

  return { ok: true, partnershipId: partnership.id as string }
}

// ---- messages + cheers ----------------------------------------------------------------

export type MessageKind = 'text' | 'nudge' | 'cheer'

export async function sendPartnerMessage(partnershipId: string, senderEnrollmentId: string, body: string, kind: MessageKind = 'text') {
  const svc = createServiceClient()
  const { error } = await svc.from('partner_messages').insert({ partnership_id: partnershipId, sender_enrollment_id: senderEnrollmentId, body, kind })
  // 'cheer' needs migration 046 (kind check). Until it's run, a cheer is
  // saved as a nudge — same thread, same look, nothing breaks.
  if (error && kind === 'cheer') {
    await svc.from('partner_messages').insert({ partnership_id: partnershipId, sender_enrollment_id: senderEnrollmentId, body, kind: 'nudge' })
  }
}

/** A phone alert to her partner, when push is set up and she allowed it. */
export async function pushToPartner(partnerEnrollmentId: string, title: string, body: string) {
  if (!pushConfigured) return
  try {
    const svc = createServiceClient()
    const { data: e } = await svc.from('challenge_enrollments').select('user_id').eq('id', partnerEnrollmentId).maybeSingle()
    if (!e?.user_id) return
    const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', e.user_id)
    for (const s of (subs || []) as { endpoint: string; p256dh: string; auth: string }[]) {
      const r = await sendPush(s, { title, body, url: '/plan/friends' })
      if (r === 'gone') await svc.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
    }
  } catch { /* an alert is a bonus — the cheer is already in the thread */ }
}

export async function getPartnerMessages(partnershipId: string, limit = 50) {
  const svc = createServiceClient()
  // Newest 50, shown oldest first.
  const { data } = await svc.from('partner_messages').select('id, sender_enrollment_id, body, kind, created_at')
    .eq('partnership_id', partnershipId).order('created_at', { ascending: false }).limit(limit)
  return (data || []).reverse()
}
