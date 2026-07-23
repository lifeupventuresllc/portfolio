import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { shouldSuggestLevelUp, nextLevel, levelName } from '@/lib/level-up'
import type { Level } from '@/lib/workout-exercises'

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

function toLevel(raw: string | null): Level {
  return raw === 'advanced' ? 3 : raw === 'intermediate' ? 2 : 1
}
const LEVEL_STR: Record<Level, string> = { 1: 'beginner', 2: 'intermediate', 3: 'advanced' }

export async function GET() {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ eligible: false })

  const { data: intake } = await svc.from('challenge_intake').select('experience_level, level_started_at').eq('enrollment_id', enrollment.id).maybeSingle()
  if (!intake?.level_started_at) return NextResponse.json({ eligible: false })

  const currentLevel = toLevel(intake.experience_level as string)
  const { count } = await svc
    .from('challenge_progress')
    .select('id', { count: 'exact', head: true })
    .eq('enrollment_id', enrollment.id)
    .eq('note', '__daily__')
    .gte('logged_on', (intake.level_started_at as string).slice(0, 10))

  const eligible = shouldSuggestLevelUp(currentLevel, intake.level_started_at as string, count || 0)
  const next = nextLevel(currentLevel)
  return NextResponse.json({
    eligible,
    currentLevelName: levelName(currentLevel),
    nextLevelName: next ? levelName(next) : null,
  })
}

export async function POST(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })

  const { data: intake } = await svc.from('challenge_intake').select('id, experience_level').eq('enrollment_id', enrollment.id).maybeSingle()
  if (!intake) return NextResponse.json({ error: 'No intake found.' }, { status: 404 })

  const { accept } = await request.json().catch(() => ({ accept: false }))
  if (!accept) return NextResponse.json({ ok: true }) // declined — front end handles its own cooldown

  const next = nextLevel(toLevel(intake.experience_level as string))
  if (!next) return NextResponse.json({ ok: true })

  await svc.from('challenge_intake').update({ experience_level: LEVEL_STR[next], level_started_at: new Date().toISOString() }).eq('id', intake.id)
  return NextResponse.json({ ok: true, newLevel: LEVEL_STR[next] })
}
