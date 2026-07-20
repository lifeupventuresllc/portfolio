import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'

// Lightweight pulse-check feedback — separate from the weekly check-in, for quick
// "is this working / did something break" signal during the 100-user beta test.
// Reuses challenge_progress (note '__feedback__') so no migration is needed.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })

  const body = await request.json()
  const rating = body.rating === 'up' || body.rating === 'down' ? body.rating : null
  if (!rating) return NextResponse.json({ error: 'Rating required.' }, { status: 400 })
  const text = typeof body.text === 'string' ? body.text.slice(0, 1000) : ''

  await svc.from('challenge_progress').insert({
    enrollment_id: enrollment.id, user_id: user.id, logged_on: localDateISO(),
    note: '__feedback__', measurements: { rating, text },
  })
  return NextResponse.json({ success: true })
}
