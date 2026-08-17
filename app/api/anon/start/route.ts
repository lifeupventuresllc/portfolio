import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureAnonEnrollment } from '@/lib/auth-onboarding'

// Called by app/try/page.tsx right after supabase.auth.signInAnonymously()
// returns a real (anonymous) session — provisions a real, active enrollment
// for her the same moment ensureEnrollmentAndWelcome does for a real
// signup, just without an email or welcome email to send. See
// lib/auth-onboarding.ts for why this is a separate function rather than
// reusing ensureEnrollmentAndWelcome (which bails immediately with no
// email).
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  await ensureAnonEnrollment(user)
  return NextResponse.json({ ok: true })
}
