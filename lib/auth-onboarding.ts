import type { User } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email'
import { createServiceClient } from '@/lib/supabase/server'

// Provisions a real, active enrollment + sends the one-time welcome email for a
// newly-authenticated user. Shared by two entry points: the email-confirmation /
// OAuth callback (app/api/auth/callback/route.ts) and immediate post-signup access
// (app/api/auth/signup-complete/route.ts) — the app is free now, so she should be
// fully set up the moment she's actually logged in, regardless of which path got
// her there. Idempotent throughout (matches by user_id, then by email for the rare
// guest-purchase-then-signup case, before inserting; welcome email checked against
// the emails table) — safe to call more than once for the same user.
export async function ensureEnrollmentAndWelcome(user: User) {
  if (!user.email) return
  const service = createServiceClient()

  let { data: enrollment } = await service.from('challenge_enrollments').select('id').eq('user_id', user.id).maybeSingle()
  if (!enrollment) {
    const { data: byEmail } = await service.from('challenge_enrollments').select('id').eq('email', user.email).is('user_id', null).maybeSingle()
    if (byEmail) {
      await service.from('challenge_enrollments').update({ user_id: user.id }).eq('id', byEmail.id)
      enrollment = byEmail
    }
  }
  if (!enrollment) {
    await service.from('challenge_enrollments').insert({
      user_id: user.id,
      email: user.email,
      name: (user.user_metadata?.full_name as string | undefined) || user.email.split('@')[0],
      tier: 'inner_circle', status: 'active', amount: 0,
      tier_started_at: new Date().toISOString(), started_at: new Date().toISOString(),
    })
  }

  const { data: existing } = await service.from('emails').select('id').eq('user_id', user.id).eq('type', 'welcome').limit(1)
  if (!existing || existing.length === 0) {
    await sendWelcomeEmail(user.email)
    await service.from('emails').insert({ user_id: user.id, email: user.email, type: 'welcome' })
  }
}
