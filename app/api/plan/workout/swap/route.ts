import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { swapOptions, findGymExercise } from '@/lib/workout-swap'
import type { WorkoutProgram } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'

// Swap one exercise for another in her SAME slot, and make it stick — the new
// move is saved as her default for that slot. Server re-derives her level +
// injuries and re-validates the choice, so a swap can never leave the system.
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

    const body = await request.json()
    const dayNum = body.dayNum
    const supersetIndex = body.supersetIndex
    const newName = body.newName
    const side: 'push' | 'pull' = body.side
    if ((side !== 'push' && side !== 'pull') || typeof newName !== 'string') {
      return NextResponse.json({ error: 'Invalid swap request.' }, { status: 400 })
    }

    // Re-derive her real level + injuries from intake (source of truth).
    const { data: intake } = await svc.from('challenge_intake')
      .select('experience_level, form_data').eq('enrollment_id', enrollment.id).maybeSingle()
    const level = (intake?.experience_level === 'advanced' ? 3 : intake?.experience_level === 'intermediate' ? 2 : 1) as Level
    const injuries = (Array.isArray((intake?.form_data as { injuries?: Injury[] })?.injuries)
      ? (intake!.form_data as { injuries?: Injury[] }).injuries! : []) as Injury[]

    // Load her workout plan.
    const { data: planRow } = await svc.from('challenge_workout_plans')
      .select('id, plan').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle()
    const program = planRow?.plan as WorkoutProgram | undefined
    if (!program) return NextResponse.json({ error: 'No workout plan yet.' }, { status: 404 })
    if (program.track !== 'gym' || !program.gymDays) {
      return NextResponse.json({ error: 'Swaps are available for gym workouts.' }, { status: 400 })
    }

    const day = program.gymDays.find((d) => d.dayNum === dayNum)
    const superset = day?.supersets?.[supersetIndex]
    if (!day || !superset) return NextResponse.json({ error: 'That exercise slot no longer exists.' }, { status: 400 })

    const current = superset[side]

    // Everything else used that day — so a swap never duplicates a move.
    const usedNames = day.supersets.flatMap((s) => [s.push.name, s.pull.name])
      .concat(day.accessory.map((a) => a.name))
      .filter((n) => n !== current.name)

    const options = swapOptions({
      muscle: current.muscle, movement: current.movement, level, injuries, excludeNames: usedNames,
    })
    const chosen = findGymExercise(newName)
    if (!chosen || !options.some((o) => o.name === newName)) {
      return NextResponse.json({ error: 'That swap isn’t available for this slot.' }, { status: 400 })
    }

    // Apply + keep the superset title in sync, then persist.
    superset[side] = chosen
    superset.title = `${superset.push.name} + ${superset.pull.name}`

    const { error } = await svc.from('challenge_workout_plans')
      .update({ plan: program }).eq('id', planRow!.id)
    if (error) {
      console.error('workout swap save error:', error)
      return NextResponse.json({ error: 'Could not save your swap.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, name: chosen.name, cue: chosen.cue })
  } catch (error) {
    console.error('workout swap error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
