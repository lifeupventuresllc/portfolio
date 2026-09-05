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

  let { data: enrollment } = await service.from('challenge_enrollments').select('id, email').eq('user_id', user.id).maybeSingle()
  if (!enrollment) {
    const { data: byEmail } = await service.from('challenge_enrollments').select('id, email').eq('email', user.email).is('user_id', null).maybeSingle()
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
  } else if (!enrollment.email) {
    // She just converted from an anonymous session (supabase.auth.updateUser
    // adding email/password to an existing anon user.id) — the enrollment
    // row already exists (created by ensureAnonEnrollment below) but was
    // never given a real email, since handle_new_user() only backfills
    // profiles/emails on auth.users INSERT, not on this later UPDATE.
    // Backfill both here so every existing "by email" lookup/link path
    // (guest-checkout linking, blueprint carryover, admin views) starts
    // working for her immediately instead of silently never matching.
    await service.from('challenge_enrollments').update({ email: user.email }).eq('id', enrollment.id)
    await service.from('profiles').update({ email: user.email }).eq('id', user.id)
  }

  const { data: existing } = await service.from('emails').select('id').eq('user_id', user.id).eq('type', 'welcome').limit(1)
  if (!existing || existing.length === 0) {
    // Real bug found live, 2026-09-05: this call was unguarded, and every
    // email in this app currently fails (the project's Resend account is
    // suspended) -- an unhandled throw here propagated straight out of
    // this function to its callers, and app/api/auth/callback/route.ts
    // (Google OAuth + email-confirmation-link signups) awaits this with no
    // try/catch of its own, so a first-time Google sign-up 500'd and never
    // completed its redirect. Enrollment must never depend on email
    // deliverability -- log and move on instead of throwing, matching how
    // signup-complete/route.ts already tolerated this (its fetch() call
    // doesn't check response.ok), just made explicit and safe everywhere.
    try {
      await sendWelcomeEmail(user.email)
      await service.from('emails').insert({ user_id: user.id, email: user.email, type: 'welcome' })
    } catch (err) {
      console.error('sendWelcomeEmail failed (enrollment still succeeded):', err)
    }
  }
}

// Anonymous counterpart to ensureEnrollmentAndWelcome — for a
// signInAnonymously() session (user.email is null). Same idempotent
// "look up by user_id, insert if missing" shape, but no welcome email
// (nothing to send it to yet) and no email-based guest-checkout linking
// (nothing to link by). Called from app/api/anon/start/route.ts, the single
// choke point every anonymous entry (marketing CTA, feature card) routes
// through via app/try/page.tsx.
export async function ensureAnonEnrollment(user: User) {
  const service = createServiceClient()
  const { data: enrollment } = await service.from('challenge_enrollments').select('id').eq('user_id', user.id).maybeSingle()
  if (enrollment) return

  await service.from('challenge_enrollments').insert({
    user_id: user.id,
    email: null,
    // name intentionally left null, not a placeholder — app/api/challenge/
    // intake/route.ts:150 builds her workout with `enrollment.name ||
    // body.name || 'Your'`, and enrollment.name wins if truthy. A
    // placeholder here would permanently shadow the real name she types at
    // intake; null correctly falls through to it.
    name: null,
    tier: 'inner_circle', status: 'active', amount: 0,
    tier_started_at: new Date().toISOString(), started_at: new Date().toISOString(),
  })
}
