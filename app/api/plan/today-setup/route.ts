import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import type { WorkoutChange } from '@/lib/fos/types'

// "Today I'm at: Gym | Home" + "Kettlebell day · Switch" (2026-11-10, Asa):
// no new intake question — she tells the workout screen where she is, for
// TODAY only. Saved as an approved today-only adjustment so every screen
// (workout, Home, week) agrees, and tomorrow goes back to her normal plan.
// The one-time "Do you have kettlebells at home?" answer is kept on her intake.

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).limit(1).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  const eid = enrollment.id as string

  const body = (await request.json().catch(() => null)) as { where?: unknown; weight?: unknown; homeKettlebells?: unknown } | null
  const where = body?.where === 'gym' || body?.where === 'home' ? body.where : undefined
  const weight = body?.weight === 'dumbbell' || body?.weight === 'kettlebell' ? body.weight : undefined
  const homeKettlebells = typeof body?.homeKettlebells === 'boolean' ? body.homeKettlebells : undefined
  if (!where && !weight && homeKettlebells === undefined) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 })

  if (homeKettlebells !== undefined) {
    const { data: intake } = await svc.from('challenge_intake').select('form_data').eq('enrollment_id', eid).maybeSingle()
    if (intake) {
      const form = { ...((intake.form_data as Record<string, unknown> | null) || {}), home_kettlebells: homeKettlebells }
      await svc.from('challenge_intake').update({ form_data: form }).eq('enrollment_id', eid)
    }
  }

  if (where || weight) {
    const today = localDateISO()
    const prev = await getApprovedTodayAdjustment(eid, today)
    const change: WorkoutChange = { ...(prev?.workoutChange || {}) }
    if (where) { change.trackOverride = where; delete change.weightOverride } // new place = fresh weight pick
    if (weight) change.weightOverride = weight
    const trigger = `Today setup: ${[where && `at ${where}`, weight && `${weight} day`].filter(Boolean).join(', ')}`
    const { error } = await svc.from('fos_adjustments').insert({
      enrollment_id: eid, user_id: user.id, for_date: today, trigger,
      workout_change: change, nutrition_change: prev?.nutritionChange ?? null,
      message: prev?.message ?? null, status: 'approved', source: 'rule',
    })
    if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
