import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'
import { getNextAction, markActionCompleted, markActionSkipped, markActionSuperseded } from '@/lib/next-action'

// The Next Action engine's one door in and out (2026-08-25 spec). GET
// returns the single current instruction — today's most recent unresolved
// row if one exists (so a page refresh doesn't silently re-roll a fresh
// decision on top of one she hasn't acted on yet), otherwise a freshly
// scored one. POST closes the loop on it (done | skip | day_changed); on
// day_changed it immediately returns the ONE replacement instruction, never
// a choice.
async function resolve() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, enrollment: null, svc: null }
  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  return { user, enrollment, svc }
}

export async function GET() {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment) return NextResponse.json({ error: 'not enrolled' }, { status: 404 })
  const today = localDateISO()

  const { data: openRow } = await svc!
    .from('next_action_log')
    .select('id, kind, action_key, instruction, score')
    .eq('enrollment_id', enrollment.id)
    .gte('shown_at', `${today}T00:00:00Z`)
    .is('completed_at', null)
    .is('skipped_at', null)
    .is('superseded_at', null)
    .order('shown_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (openRow) {
    return NextResponse.json({ logId: openRow.id, kind: openRow.kind, actionKey: openRow.action_key, instruction: openRow.instruction, score: openRow.score })
  }

  const result = await getNextAction(enrollment.id as string, today)
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const { user, enrollment } = await resolve()
  if (!user || !enrollment) return NextResponse.json({ error: 'not enrolled' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const logId = body?.logId as string | undefined
  const action = body?.action as 'done' | 'skip' | 'day_changed' | undefined
  if (!logId || !action) return NextResponse.json({ error: 'logId and action required' }, { status: 400 })

  if (action === 'done') {
    await markActionCompleted(logId)
    return NextResponse.json({ ok: true })
  }
  if (action === 'skip') {
    await markActionSkipped(logId)
    return NextResponse.json({ ok: true })
  }
  if (action === 'day_changed') {
    await markActionSuperseded(logId)
    const result = await getNextAction(enrollment.id as string, localDateISO())
    return NextResponse.json(result)
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
