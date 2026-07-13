import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ⚠️ TEMPORARY — QA ONLY. Free-enrolls a KNOWN test account into the challenge
// so the full post-purchase journey (intake → plan → check-ins) can be walked
// without a real Stripe charge. Guarded to a hardcoded allowlist so real
// visitors can never self-enroll. REMOVE this route before public launch.
const TEST_EMAILS = ['bookingasaredic@gmail.com', 'demo@asaluke.io', 'asalukeredic@gmail.com']

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 })
  if (!TEST_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'Test enrollment is limited to QA accounts.' }, { status: 403 })
  }

  const svc = createServiceClient()
  const { data: existing } = await svc.from('challenge_enrollments')
    .select('id').eq('email', user.email).maybeSingle()

  if (existing) {
    await svc.from('challenge_enrollments')
      .update({ user_id: user.id, tier: 'inner_circle', status: 'active', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await svc.from('challenge_enrollments').insert({
      user_id: user.id,
      email: user.email,
      name: user.email.split('@')[0],
      tier: 'inner_circle',
      status: 'active',
      amount: 0,
    })
  }

  return NextResponse.json({ success: true })
}
