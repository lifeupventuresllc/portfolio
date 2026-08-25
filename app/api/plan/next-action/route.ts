import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTimezone, localDateISO } from '@/lib/localdate'
import { getNextAction, resolveCurrentAction, markActionCompleted, markActionSkipped, markActionSuperseded, parseNextActionSignal, type ResolveFailureReason } from '@/lib/next-action'

// The Next Action engine's one door in and out (2026-08-25 spec). GET
// returns the single current instruction — today's open row if one exists
// (so a page refresh doesn't silently re-roll a fresh decision on top of one
// she hasn't acted on yet), otherwise a freshly scored one. POST closes the
// loop on it (done | skip | day_changed); on day_changed it immediately
// returns the ONE replacement instruction, never a choice.
async function resolve() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, enrollment: null }
  const svc = createServiceClient()
  // .limit(1) before .maybeSingle() — a bare .maybeSingle() errors out (and
  // silently reads as "not enrolled") if a user ever has 2+ enrollment rows,
  // since there's no unique constraint on user_id. Real gap, pre-existing
  // across ~15 other routes in this codebase; fixed here, not chased there.
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).limit(1).maybeSingle()
    enrollment = byEmail || null
  }
  return { user, enrollment }
}

function statusFor(reason: ResolveFailureReason) {
  return reason === 'not_found' ? 404 : reason === 'already_resolved' ? 409 : 500
}

export async function GET() {
  const { user, enrollment } = await resolve()
  if (!user || !enrollment) return NextResponse.json({ error: 'not enrolled' }, { status: 404 })
  const result = await resolveCurrentAction(enrollment.id as string)
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const { user, enrollment } = await resolve()
  if (!user || !enrollment) return NextResponse.json({ error: 'not enrolled' }, { status: 404 })
  const enrollmentId = enrollment.id as string

  const body = await req.json().catch(() => ({}))
  const logId = body?.logId as string | undefined
  const action = body?.action as 'done' | 'skip' | 'day_changed' | 'message' | undefined
  if (!logId || !action) return NextResponse.json({ error: 'logId and action required' }, { status: 400 })

  // Prompt 5's NL/voice access point — she can question or redirect the
  // current instruction in her own words instead of tapping a button. Still
  // routes through the exact same recommendation layer as every other path
  // (getNextAction): the LLM only ever extracts signals here, never decides.
  if (action === 'message') {
    const message = body?.message as string | undefined
    if (!message || !message.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })
    const signal = await parseNextActionSignal(message)
    const hasSignal = !!signal.energy || !!signal.minutesAvailable || !!signal.dayChanged || typeof signal.eatingOut === 'boolean'
    if (!hasSignal) return NextResponse.json({ changed: false })
    const outcome = await markActionSuperseded(logId, enrollmentId)
    if (!outcome.ok) return NextResponse.json({ error: outcome.reason }, { status: statusFor(outcome.reason) })
    const result = await getNextAction(enrollmentId, localDateISO(getTimezone()), { energy: signal.energy, minutesAvailable: signal.minutesAvailable, eatingOut: signal.eatingOut })
    return NextResponse.json({ changed: true, ...result })
  }

  if (action === 'done') {
    const outcome = await markActionCompleted(logId, enrollmentId)
    if (!outcome.ok) return NextResponse.json({ error: outcome.reason }, { status: statusFor(outcome.reason) })
    return NextResponse.json({ ok: true })
  }
  if (action === 'skip') {
    const outcome = await markActionSkipped(logId, enrollmentId)
    if (!outcome.ok) return NextResponse.json({ error: outcome.reason }, { status: statusFor(outcome.reason) })
    return NextResponse.json({ ok: true })
  }
  if (action === 'day_changed') {
    const outcome = await markActionSuperseded(logId, enrollmentId)
    if (!outcome.ok) return NextResponse.json({ error: outcome.reason }, { status: statusFor(outcome.reason) })
    const result = await getNextAction(enrollmentId, localDateISO(getTimezone()))
    return NextResponse.json(result)
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
