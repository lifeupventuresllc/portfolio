import { createServiceClient } from '@/lib/supabase/server'
import { streakFrom } from '@/lib/streak'
import { localDateISO, addDaysISO, localMondayIndex } from '@/lib/localdate'

// The Friends tab is one accountability partner, not a follow graph — the
// open "everyone" feed already exists as the Community/Connect tab. Streak
// and check-in data here reuse the exact same source (challenge_progress
// '__daily__' rows + streakFrom) the dashboard and leaderboard already read,
// so a partner's numbers never drift from what she'd see on her own profile.

export interface PartnerSide {
  enrollmentId: string
  name: string
  streak: number
  checkedInToday: boolean
  weeklyCount: number
}

export interface PartnerStatus {
  partnershipId: string
  weeklyGoal: number
  me: PartnerSide
  partner: PartnerSide
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkinDates(svc: any, enrollmentId: string): Promise<Set<string>> {
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

export async function getPartnerStatus(enrollmentId: string): Promise<PartnerStatus | null> {
  const svc = createServiceClient()
  const partnership = await getActivePartnership(enrollmentId)
  if (!partnership) return null
  const partnerEnrollmentId = partnership.enrollment_a === enrollmentId ? partnership.enrollment_b : partnership.enrollment_a

  const [{ data: enrollments }, myDates, partnerDates] = await Promise.all([
    svc.from('challenge_enrollments').select('id, name').in('id', [enrollmentId, partnerEnrollmentId]),
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

  return {
    partnershipId: partnership.id,
    weeklyGoal: partnership.weekly_goal_workouts,
    me: { enrollmentId, name: nameFor(enrollmentId), streak: streakFrom(myDates, today), checkedInToday: myDates.has(today), weeklyCount: weeklyCount(myDates) },
    partner: { enrollmentId: partnerEnrollmentId, name: nameFor(partnerEnrollmentId), streak: streakFrom(partnerDates, today), checkedInToday: partnerDates.has(today), weeklyCount: weeklyCount(partnerDates) },
  }
}

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

  return { ok: true, partnershipId: partnership.id as string }
}

export async function sendPartnerMessage(partnershipId: string, senderEnrollmentId: string, body: string, kind: 'text' | 'nudge' = 'text') {
  const svc = createServiceClient()
  await svc.from('partner_messages').insert({ partnership_id: partnershipId, sender_enrollment_id: senderEnrollmentId, body, kind })
}

export async function getPartnerMessages(partnershipId: string, limit = 50) {
  const svc = createServiceClient()
  const { data } = await svc.from('partner_messages').select('id, sender_enrollment_id, body, kind, created_at')
    .eq('partnership_id', partnershipId).order('created_at', { ascending: true }).limit(limit)
  return data || []
}
