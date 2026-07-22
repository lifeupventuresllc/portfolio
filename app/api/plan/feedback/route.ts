import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'
import { FEEDBACK_CATEGORIES, FEEDBACK_SEVERITIES } from '@/lib/feedback-context'

const CATEGORY_KEYS = new Set(FEEDBACK_CATEGORIES.map((c) => c.key))
const SEVERITY_KEYS = new Set(FEEDBACK_SEVERITIES.map((s) => s.key))

// Lightweight pulse-check feedback — separate from the weekly check-in, for quick
// "is this working / did something break" signal during the 100-user beta test.
// Reuses challenge_progress (note '__feedback__') so no migration is needed.
// Beyond the original up/down + free text, this now also captures WHERE it came
// from (category + optional context label), HOW bad (severity, down-only), and
// auto-captured page/device — so Asa can filter and spot patterns instead of
// reading a flat list of one-off comments.
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
  const category = CATEGORY_KEYS.has(body.category) ? body.category : 'general'
  const severity = rating === 'down' && SEVERITY_KEYS.has(body.severity) ? body.severity : null
  const context = typeof body.context === 'string' ? body.context.slice(0, 200) : ''
  const page = typeof body.page === 'string' ? body.page.slice(0, 200) : ''
  const device = typeof body.device === 'string' ? body.device.slice(0, 100) : ''

  await svc.from('challenge_progress').insert({
    enrollment_id: enrollment.id, user_id: user.id, logged_on: localDateISO(),
    note: '__feedback__', measurements: { rating, text, category, severity, context, page, device },
  })
  return NextResponse.json({ success: true })
}
