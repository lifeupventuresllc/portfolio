import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTimezone, localDateISO } from '@/lib/localdate'
import { getNextAction, getOpenAction, markActionCompleted, markActionSkipped, markActionSuperseded, type ResolveFailureReason } from '@/lib/next-action'

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
  const enrollmentId = enrollment.id as string
  const tz = getTimezone()
  const today = localDateISO(tz)

  const open = await getOpenAction(enrollmentId)
  if (open) {
    // Real gap a blind review caught: comparing shown_at to a literal
    // `${today}T00:00:00Z` treats a LOCAL calendar date as a UTC instant —
    // for any non-UTC timezone that's wrong by the zone's offset, so an
    // instruction shown late yesterday (local time) could still read as
    // "today," or the first hours of a real new local day could miss it.
    // Comparing two values computed through the same localDateISO is
    // timezone-safe regardless of offset or DST.
    if (localDateISO(tz, new Date(open.shown_at)) === today) {
      return NextResponse.json({ logId: open.id, kind: open.kind, actionKey: open.action_key, instruction: open.instruction, score: open.score })
    }
    // Genuinely stale — the calendar day changed under her without her ever
    // acting on it. That's a real "my day changed" disruption, just one she
    // didn't trigger herself, so it's handled the same way: supersede, then
    // hand her exactly one fresh instruction for today.
    await markActionSuperseded(open.id, enrollmentId)
  }

  const result = await getNextAction(enrollmentId, today)
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const { user, enrollment } = await resolve()
  if (!user || !enrollment) return NextResponse.json({ error: 'not enrolled' }, { status: 404 })
  const enrollmentId = enrollment.id as string

  const body = await req.json().catch(() => ({}))
  const logId = body?.logId as string | undefined
  const action = body?.action as 'done' | 'skip' | 'day_changed' | undefined
  if (!logId || !action) return NextResponse.json({ error: 'logId and action required' }, { status: 400 })

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
