import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Daily accountability check-in ("did you show up today?") + streak.
// Stored as a challenge_progress row per day (note '__daily__', no weight → excluded from the weight chart).
const iso = (d: Date) => d.toISOString().slice(0, 10)

function streakFrom(dates: Set<string>): number {
  let streak = 0
  const cur = new Date()
  if (!dates.has(iso(cur))) cur.setDate(cur.getDate() - 1) // grace: streak holds through yesterday
  while (dates.has(iso(cur))) { streak++; cur.setDate(cur.getDate() - 1) }
  return streak
}

// The current Mon–Sun week as 7 dots for the momentum strip.
function weekFrom(dates: Set<string>): { date: string; showed: boolean; isToday: boolean; isFuture: boolean }[] {
  const now = new Date()
  const todayIso = iso(now)
  const dow = (now.getDay() + 6) % 7 // Mon=0 … Sun=6
  const monday = new Date(now); monday.setDate(now.getDate() - dow)
  return Array.from({ length: 7 }, (_, d) => {
    const day = new Date(monday); day.setDate(monday.getDate() + d)
    const ds = iso(day)
    return { date: ds, showed: dates.has(ds), isToday: ds === todayIso, isFuture: ds > todayIso }
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
  const { data } = await svc.from('challenge_progress').select('logged_on, measurements').eq('enrollment_id', enrollmentId).eq('note', '__daily__')
  const dates = new Set<string>((data || []).map((r) => r.logged_on as string))
  const today = (data || []).find((r) => r.logged_on === iso(new Date()))
  return { streak: streakFrom(dates), today: today?.measurements || null, week: weekFrom(dates) }
}

export async function GET() {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ streak: 0, today: null, week: [] })
  return NextResponse.json(await loadState(svc, enrollment.id as string))
}

export async function POST(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  const body = await request.json()
  const measurements = { workout: !!body.workout, nutrition: !!body.nutrition }
  const today = iso(new Date())

  const { data: existing } = await svc.from('challenge_progress')
    .select('id').eq('enrollment_id', enrollment.id).eq('note', '__daily__').eq('logged_on', today).maybeSingle()
  if (existing) {
    await svc.from('challenge_progress').update({ measurements }).eq('id', existing.id)
  } else {
    await svc.from('challenge_progress').insert({ enrollment_id: enrollment.id, user_id: user.id, logged_on: today, note: '__daily__', measurements })
  }
  return NextResponse.json(await loadState(svc, enrollment.id as string))
}
