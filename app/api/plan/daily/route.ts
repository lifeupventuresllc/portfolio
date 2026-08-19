import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO, addDaysISO } from '@/lib/localdate'
import { streakFrom } from '@/lib/streak'

// Daily accountability check-in ("did you show up today?") + streak. Stored as a
// challenge_progress row per day (note '__daily__'). All day-boundaries use the user's
// LOCAL day (localDateISO) so a "day" is their real 24h, not UTC's.

// The current Mon–Sun week as 7 dots for the momentum strip.
function weekFrom(dates: Set<string>, todayISO: string): { date: string; showed: boolean; isToday: boolean; isFuture: boolean }[] {
  const dow = (new Date(todayISO + 'T00:00:00Z').getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  const monday = addDaysISO(todayISO, -dow)
  return Array.from({ length: 7 }, (_, d) => {
    const ds = addDaysISO(monday, d)
    return { date: ds, showed: dates.has(ds), isToday: ds === todayISO, isFuture: ds > todayISO }
  })
}

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

async function loadState(svc: ReturnType<typeof createServiceClient>, enrollmentId: string) {
  const todayISO = localDateISO()
  const { data } = await svc.from('challenge_progress').select('logged_on, measurements').eq('enrollment_id', enrollmentId).eq('note', '__daily__')
  const dates = new Set<string>((data || []).map((r) => r.logged_on as string))
  const today = (data || []).find((r) => r.logged_on === todayISO)
  return { streak: streakFrom(dates, todayISO), today: today?.measurements || null, week: weekFrom(dates, todayISO) }
}

export async function GET() {
  const { user, enrollment, svc } = await resolve()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  if (!enrollment || !svc) return NextResponse.json({ streak: 0, today: null, week: [] })
  return NextResponse.json(await loadState(svc, enrollment.id as string))
}

export async function POST(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  const body = await request.json()
  // effort is optional and 1-3 (1=easier than her usual, 2=normal, 3=tougher than
  // usual) — relative to HER OWN normal, not an absolute difficulty scale, same
  // baseline-relative philosophy as everything else in lib/fos/pattern.ts. Omitted
  // entirely (not defaulted) when she doesn't tap one, so "no data" stays distinct
  // from "logged as normal."
  const effort = Number.isFinite(Number(body.effort)) && [1, 2, 3].includes(Number(body.effort)) ? Number(body.effort) : undefined
  const measurements = { workout: !!body.workout, nutrition: !!body.nutrition, ...(effort !== undefined ? { effort } : {}) }
  const today = localDateISO()

  const { data: existing } = await svc.from('challenge_progress')
    .select('id').eq('enrollment_id', enrollment.id).eq('note', '__daily__').eq('logged_on', today).maybeSingle()
  if (existing) {
    await svc.from('challenge_progress').update({ measurements }).eq('id', existing.id)
  } else {
    await svc.from('challenge_progress').insert({ enrollment_id: enrollment.id, user_id: user.id, logged_on: today, note: '__daily__', measurements })
  }
  return NextResponse.json(await loadState(svc, enrollment.id as string))
}
