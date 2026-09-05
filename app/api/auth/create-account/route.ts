import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { mapAuthError } from '@/lib/auth-errors'

// Real bug found live, 2026-09-05: the project's Resend account/API key is
// suspended (confirmed via a direct call to api.resend.com/domains: 403
// suspended_api_key). Supabase's own Auth service (GoTrue) relays its
// signup-confirmation and email-change-confirmation emails through that
// same account, so the client-side supabase.auth.signUp() /
// supabase.auth.updateUser() calls in AuthForm.tsx were 500ing on every
// attempt -- no new account could ever be created, regardless of anything
// in our own app code. This route sidesteps that dependency entirely: the
// admin API's createUser/updateUserById apply "directly without
// confirmation flows" (Supabase's own doc comment on updateUserById) --
// no email is sent, so the still-broken Resend account can't block this
// path. AuthForm calls this first, then signs in client-side with the
// same password to pick up a real session (updateUserById explicitly does
// NOT notify client-side listeners on its own, per the same doc comment).
export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}))
  if (typeof email !== 'string' || typeof password !== 'string' || !email || password.length < 6) {
    return NextResponse.json({ error: 'A valid email and a password of at least 6 characters are required.' }, { status: 400 })
  }

  const cookieClient = createClient()
  const { data: { user: currentUser } } = await cookieClient.auth.getUser()
  const service = createServiceClient()

  // An existing session here is always the anonymous one from the "no
  // signup wall" flow (app/plan/save's "claim" mode) -- promote it in
  // place, same user.id, so every row already linked to it (challenge_intake,
  // workout/nutrition plans, fos_messages) stays correctly attached, exactly
  // like the updateUser() call this replaces was already designed to do.
  const { error } = currentUser
    ? await service.auth.admin.updateUserById(currentUser.id, { email, password, email_confirm: true })
    : await service.auth.admin.createUser({ email, password, email_confirm: true })

  if (error) return NextResponse.json({ error: mapAuthError(error) }, { status: 400 })
  return NextResponse.json({ ok: true })
}
