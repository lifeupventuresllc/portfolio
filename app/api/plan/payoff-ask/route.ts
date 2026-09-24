import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { PAYOFF_OPTIONS } from '@/lib/payoff'

// The Home catch-up ask (components/PayoffHomeAsk.tsx) for anyone who
// finished real intake before the "what's your why" step existed — no plan
// rebuild needed (payoffs is pure messaging data, never read by the
// workout/nutrition generator), so this is a direct, small form_data patch,
// not a trip through buildInitialPlans. Same real "skip is a permanent
// server-side answer for THIS account" pattern as
// app/api/plan/quickstart-goal/route.ts — never a device-scoped flag.
const VALID = new Set<string>(PAYOFF_OPTIONS.map((o) => o.v))

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: { payoffs?: string[]; skip?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id')
      .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

  const { data: intake } = await svc.from('challenge_intake').select('id, form_data').eq('enrollment_id', enrollment.id).maybeSingle()
  if (!intake) return NextResponse.json({ error: 'No intake found.' }, { status: 404 })
  const fd = (intake.form_data || {}) as Record<string, unknown>

  if (body.skip) {
    await svc.from('challenge_intake').update({ form_data: { ...fd, payoff_asked: true } }).eq('id', intake.id)
    return NextResponse.json({ ok: true })
  }

  const picked = Array.isArray(body.payoffs) ? body.payoffs.filter((v) => VALID.has(v)) : []
  await svc.from('challenge_intake').update({ form_data: { ...fd, payoffs: picked, payoff_asked: true } }).eq('id', intake.id)
  return NextResponse.json({ ok: true })
}
