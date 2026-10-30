import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ATOMIC_LIBRARY } from '@/lib/exercise-library'
import { logSetEffort, logSetDone, immediateAdjustment, type Effort } from '@/lib/progression'

// The one write path for the full-screen rest-timer effort tap (layer four
// of the workout-engine rebuild). Two simultaneous effects of one input,
// per spec: this call handles the LONG-TERM half (logs the real set, moves
// progression_state) and hands back the IMMEDIATE half in the same
// response so WorkoutPlayer can apply it to the very next set without a
// second round trip.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const svc = createServiceClient()

    let { data: enrollment } = await svc.from('challenge_enrollments').select('id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
    if (!enrollment && user.email) {
      const { data: byEmail } = await svc.from('challenge_enrollments').select('id')
        .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
      enrollment = byEmail || null
    }
    if (!enrollment) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const exerciseName = String(body.exerciseName || '')
    // Double progression (2026-10-30): `done: true` = she tapped Done on a
    // set (no Easy/Hard) — logged as 'right' so a finished session can be
    // told apart from a cut-short one. 0-based set index (0 used to collapse
    // into 1 here via `|| 1`, merging her first two sets).
    const isDone = body.done === true
    const effort = (isDone ? 'right' : body.effort) as Effort
    const rawIndex = Number(body.setIndex)
    const setIndex = Number.isFinite(rawIndex) && rawIndex >= 0 ? Math.floor(rawIndex) : 0
    if (!exerciseName || !['easy', 'right', 'hard'].includes(effort)) {
      return NextResponse.json({ error: 'exerciseName and a valid effort (easy|right|hard) are required.' }, { status: 400 })
    }

    // Looked up by name against the real atomic library (the single source
    // of truth every generated exercise comes from) rather than trusting a
    // client-supplied movement pattern — an unrecognized name (should never
    // happen from the real player, but a stale client build or a swapped-in
    // exercise from an older plan snapshot could send one) degrades to a
    // generic 'compound' pattern instead of failing the tap outright; she
    // still gets her immediate feedback either way.
    // The one real exception: walkFinisher's 'Incline Treadmill Walk' (lib/
    // workout-assembly.ts) is a computed cardio finisher, never drawn from
    // ATOMIC_LIBRARY, so the lookup above would always miss it and silently
    // log her cardio effort as 'compound' instead — the exact gap that kept
    // cardioFinisherFor's new progression lookup from ever having real
    // history to read.
    const entry = ATOMIC_LIBRARY.find((e) => e.name === exerciseName)
    const movementPattern = exerciseName === 'Incline Treadmill Walk' ? 'cardio' : entry?.movementPattern || 'compound'
    const muscleGroups = entry?.muscleGroups || []

    if (isDone) {
      await logSetDone(enrollment.id as string, user.id, exerciseName, movementPattern, muscleGroups, setIndex)
      return NextResponse.json({ ok: true })
    }
    const state = await logSetEffort(enrollment.id as string, user.id, exerciseName, movementPattern, muscleGroups, effort, setIndex)
    const immediate = immediateAdjustment(effort)

    return NextResponse.json({ ok: true, immediate, progression: state })
  } catch (error) {
    console.error('set-effort error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
