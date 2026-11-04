import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { mapAuthError } from '@/lib/auth-errors'
import { GUEST_COOKIE, guestToken } from '@/lib/adopt-guest'

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

  // Real bug found live, 2026-09-09: this comment used to claim "an existing
  // session here is always the anonymous one from the 'no signup wall' flow"
  // -- that assumption was wrong, and it was a real, live account-hijacking
  // bug, not just a theoretical one. A live QA pass hit /signup from a
  // browser that still had an active REAL session (a Google-linked account
  // that was never signed out) and this route silently overwrote THAT
  // account's login email and password with whatever was typed into the
  // signup form -- no confirmation, no error, indistinguishable from a
  // normal successful signup. Anyone landing on /signup while already
  // signed in for real (a stale tab, a shared/public computer, a link
  // clicked from an old session) would have had their real account's
  // credentials silently reset out from under them.
  //
  // The claim flow this was actually written for only ever promotes a true
  // anonymous session (currentUser.is_anonymous) -- a real, already-signed-in
  // account must sign out first rather than have this route act on it.
  if (currentUser && !currentUser.is_anonymous) {
    return NextResponse.json({ error: "You're already signed in — sign out first to create a different account." }, { status: 409 })
  }

  // An anonymous session here is the "no signup wall" flow (app/plan/save's
  // "claim" mode) -- promote it in place, same user.id, so every row already
  // linked to it (challenge_intake, workout/nutrition plans, fos_messages)
  // stays correctly attached, exactly like the updateUser() call this
  // replaces was already designed to do.
  const { error } = currentUser
    ? await service.auth.admin.updateUserById(currentUser.id, { email, password, email_confirm: true })
    : await service.auth.admin.createUser({ email, password, email_confirm: true })

  if (error) {
    // 2026-11-04 (live call: "Error updating user"): the email already
    // belonged to an older account, and Supabase only says "Error updating
    // user". Say what's really going on and how to get in.
    const taken = await accountForEmail(service, email)
    if (taken) {
      const google = taken.providers.includes('google') && !taken.providers.includes('email')
      const res = NextResponse.json({
        code: 'email_taken', provider: google ? 'google' : 'email',
        error: google
          ? 'This email already has an account that signs in with Google. Tap "Continue with Google" to open it.'
          : 'This email already has an account. Log in with it instead, or use a different email.',
      }, { status: 409 })
      // Remember this guest so her answers move into that account once she's in.
      if (currentUser?.is_anonymous) res.cookies.set({ name: GUEST_COOKIE, value: guestToken(currentUser.id), httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 3600 })
      return res
    }
    return NextResponse.json({ error: mapAuthError(error) }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}

// Finds an existing (non-guest) account by email. Pages through the admin
// list; fine at this app's size. Returns its sign-in providers.
async function accountForEmail(service: ReturnType<typeof createServiceClient>, email: string): Promise<{ providers: string[] } | null> {
  const want = email.trim().toLowerCase()
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users.length) return null
    const u = data.users.find((x) => (x.email || '').toLowerCase() === want && !x.is_anonymous)
    if (u) return { providers: ((u.app_metadata?.providers as string[] | undefined) || [u.app_metadata?.provider as string]).filter(Boolean) }
    if (data.users.length < 1000) return null
  }
  return null
}
