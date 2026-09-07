import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { mapAuthError } from '@/lib/auth-errors'

// My Profile (Asa's ask, 2026-09-07): name/email/phone, editable from one
// place — the hamburger menu's new "My Profile" entry. Email changes bypass
// Supabase's normal confirm-the-new-address flow the same way
// app/api/auth/create-account/route.ts already does for signup: the
// project's Resend account is still suspended, so a real confirmation email
// can't go out regardless of what this route does. Since she's already
// authenticated (proving she owns the account) before she can even reach
// this form, applying the change directly via the admin API is the same
// tradeoff already accepted for signup, not a new one introduced here.
//
// Real bug found live testing (Asa's ask, 2026-09-07): email used to be
// required unconditionally, blocking an anonymous session from saving just
// a phone number — and if she HAD supplied one while anonymous, this route
// would have attached a real email via the admin API with no password ever
// set (this form doesn't collect one), leaving her with no way to log back
// in as that identity later. Re-checks `user.is_anonymous` from the actual
// session here (never trusts the client's own claim) — anonymous saves
// skip the email requirement and the auth-email update entirely; the real
// account+password claim flow stays exactly where it already lived
// correctly, app/plan/save's AuthForm mode="claim".
export async function POST(request: Request) {
  const { name, email, phone } = await request.json().catch(() => ({}))

  const cookieClient = createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  if (!user.is_anonymous && (typeof email !== 'string' || !email.trim())) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: enrollment } = await svc.from('challenge_enrollments').select('id, email').eq('user_id', user.id).maybeSingle()
  if (!enrollment) return NextResponse.json({ error: 'No account found.' }, { status: 404 })

  const trimmedEmail = typeof email === 'string' ? email.trim() : ''
  if (!user.is_anonymous && trimmedEmail !== enrollment.email) {
    const { error } = await svc.auth.admin.updateUserById(user.id, { email: trimmedEmail, email_confirm: true })
    if (error) return NextResponse.json({ error: mapAuthError(error) }, { status: 400 })
  }

  const { error: updateError } = await svc.from('challenge_enrollments').update({
    name: typeof name === 'string' && name.trim() ? name.trim() : null,
    ...(user.is_anonymous ? {} : { email: trimmedEmail }),
    phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
  }).eq('id', enrollment.id)
  if (updateError) return NextResponse.json({ error: 'Could not save — try again.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
