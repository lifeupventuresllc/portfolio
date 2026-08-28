import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTimezone, localDateISO } from '@/lib/localdate'
import { getNextAction, getOpenAction, resolveCurrentAction, markActionCompleted, markActionSkipped, markActionSuperseded, parseNextActionSignal, recordStatedPreference, type ResolveFailureReason } from '@/lib/next-action'

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

    // Reward profile source #2 (explicit) — captured from ANY message that
    // clearly states something she values, independent of whether this
    // happens to be answering a reward_question. Never blocks the rest of
    // this handler if it fails.
    if (signal.statedPreference) {
      await recordStatedPreference(enrollmentId, user.id, signal.statedPreference.label, signal.statedPreference.category).catch(() => {})
    }

    // A reward_question's answer is a natural conversational reply — it
    // rarely also states an energy level or a minutes number, so requiring
    // one of those (like every other redirect) would leave the question
    // stuck open forever once she'd already answered it.
    const open = await getOpenAction(enrollmentId)
    const answeringRewardQuestion = open?.id === logId && open.kind === 'reward_question'

    const hasSignal = !!signal.energy || !!signal.minutesAvailable || !!signal.dayChanged || typeof signal.eatingOut === 'boolean' || !!signal.restaurantName || !!signal.mealSlot
    if (!hasSignal && !answeringRewardQuestion) return NextResponse.json({ changed: false })

    const outcome = answeringRewardQuestion ? await markActionCompleted(logId, enrollmentId) : await markActionSuperseded(logId, enrollmentId)
    if (!outcome.ok) return NextResponse.json({ error: outcome.reason }, { status: statusFor(outcome.reason) })
    // A named restaurant always implies she's eating out, even if the model
    // didn't separately flag eating_out=true for some reason. A bare named
    // meal ("a snack idea") does NOT by itself — she could be asking that
    // from home — it only refines the SLOT once eating-out is otherwise true
    // (her own schedule, an explicit eating_out signal, or a named
    // restaurant), never forces the eating-out flow on its own.
    const result = await getNextAction(enrollmentId, localDateISO(getTimezone()), {
      energy: signal.energy,
      minutesAvailable: signal.minutesAvailable,
      eatingOut: signal.eatingOut || (signal.restaurantName ? true : undefined),
      eatingOutRestaurant: signal.restaurantName,
      eatingOutMealSlot: signal.mealSlot,
    })
    return NextResponse.json({ changed: true, ...result })
  }

  if (action === 'done') {
    // skipFoodLog: /plan/eating-out's own "I ordered this" flow already
    // logged the real order she picked before resolving this row this way
    // (see EatingOutPicks.tsx) — never a client-trusted way to skip real
    // food tracking otherwise, since this only ever suppresses a REDUNDANT
    // second insert, it can't fabricate or remove a real log entry.
    const skipFoodLog = body?.skipFoodLog === true
    const outcome = await markActionCompleted(logId, enrollmentId, { skipFoodLog })
    if (!outcome.ok) return NextResponse.json({ error: outcome.reason }, { status: statusFor(outcome.reason) })
    return NextResponse.json({ ok: true })
  }
  if (action === 'skip') {
    const outcome = await markActionSkipped(logId, enrollmentId)
    if (!outcome.ok) return NextResponse.json({ error: outcome.reason }, { status: statusFor(outcome.reason) })
    return NextResponse.json({ ok: true })
  }
  if (action === 'day_changed') {
    // Grabbed BEFORE superseding, purely so the fresh pick below can skip
    // re-serving this exact one (see index.ts's getNextAction) — the row
    // itself is still closed out the same way regardless.
    const closing = await getOpenAction(enrollmentId)
    const outcome = await markActionSuperseded(logId, enrollmentId)
    if (!outcome.ok) return NextResponse.json({ error: outcome.reason }, { status: statusFor(outcome.reason) })
    // forceFallback: true (Asa's ask, 2026-08-28) — this button is literally
    // "Keep it simple," which used to still hand her another full-size real
    // candidate (a different workout, a meal reminder) whenever one
    // outscored the generic fallback pool. That's real and personalized,
    // but not what she's asking for when she taps this — always the small
    // universal tier now, never a same-size substitute. Her real
    // calorie/workout numbers underneath are untouched either way.
    const result = await getNextAction(enrollmentId, localDateISO(getTimezone()), {}, closing?.action_key, true)
    return NextResponse.json(result)
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
