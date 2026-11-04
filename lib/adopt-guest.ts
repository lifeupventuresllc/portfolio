import { createHmac, timingSafeEqual } from 'crypto'
import type { createServiceClient } from '@/lib/supabase/server'

// Moving a guest's answers into the account she really has (2026-11-04,
// live call: "Save your progress" hit an email that already had an account
// — "Error updating user" — and everything she'd entered was stranded on
// the guest). When that happens we remember the guest (a signed, short-lived
// httpOnly cookie), sign her into her real account, and move the guest's
// plan over so nothing is retyped.

type Svc = ReturnType<typeof createServiceClient>
export const GUEST_COOKIE = 'luf_guest'

const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev'
const sign = (id: string) => createHmac('sha256', secret()).update(`guest:${id}`).digest('hex').slice(0, 32)

export function guestToken(guestUserId: string): string {
  return `${guestUserId}.${sign(guestUserId)}`
}

export function readGuestToken(token: string | undefined | null): string | null {
  if (!token) return null
  const [id, mac] = token.split('.')
  if (!id || !mac) return null
  const want = Buffer.from(sign(id)), got = Buffer.from(mac)
  return want.length === got.length && timingSafeEqual(want, got) ? id : null
}

/**
 * Move the guest's enrollment (answers, plans, food log, everything keyed by
 * enrollment) onto her real account — but only if her real account doesn't
 * already have a finished plan (then her real plan wins and nothing moves).
 * Returns what happened.
 */
export async function adoptGuest(svc: Svc, guestUserId: string, real: { id: string; email?: string | null }): Promise<'moved' | 'kept_real' | 'nothing'> {
  if (!guestUserId || guestUserId === real.id) return 'nothing'
  const { data: g } = await svc.auth.admin.getUserById(guestUserId)
  if (!g?.user?.is_anonymous) return 'nothing'

  const { data: guestEnr } = await svc.from('challenge_enrollments').select('id, intake_completed')
    .eq('user_id', guestUserId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!guestEnr) return 'nothing'

  const ors = [`user_id.eq.${real.id}`, ...(real.email ? [`email.eq.${real.email}`] : [])].join(',')
  const { data: realEnrs } = await svc.from('challenge_enrollments').select('id, intake_completed').or(ors)
  if ((realEnrs || []).some((e) => e.intake_completed)) return 'kept_real'

  // Her real account's empty enrollment(s) step aside; the guest's becomes hers.
  const emptyIds = (realEnrs || []).map((e) => e.id as string).filter((id) => id !== guestEnr.id)
  if (emptyIds.length) await svc.from('challenge_enrollments').update({ user_id: null, email: null }).in('id', emptyIds)
  const { error } = await svc.from('challenge_enrollments').update({ user_id: real.id, ...(real.email ? { email: real.email } : {}) }).eq('id', guestEnr.id)
  if (error) return 'nothing'
  // Rows that also carry the user id directly.
  for (const t of ['challenge_intake', 'challenge_workout_plans', 'challenge_nutrition_plans']) {
    await svc.from(t).update({ user_id: real.id }).eq('enrollment_id', guestEnr.id).then(() => null, () => null)
  }
  return 'moved'
}
