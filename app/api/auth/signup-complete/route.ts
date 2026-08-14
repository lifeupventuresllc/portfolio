import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureEnrollmentAndWelcome } from '@/lib/auth-onboarding'

// Called by AuthForm right after supabase.auth.signUp() returns a real session
// (i.e. "Confirm email" is off in Supabase and she's immediately logged in) — same
// provisioning the confirmation-link callback does, just triggered on this path
// instead. Idempotent, so it's harmless if she later also clicks a stale
// confirmation email — see lib/auth-onboarding.ts.
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  await ensureEnrollmentAndWelcome(user)
  return NextResponse.json({ ok: true })
}
