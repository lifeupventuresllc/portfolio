import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import WorkoutPlayer from '@/components/WorkoutPlayer'
import type { WorkoutProgram } from '@/lib/workout'

export const dynamic = 'force-dynamic'

export default async function WorkoutSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/workout')

  const svc = createServiceClient()
  let { data: enrollment } = await svc
    .from('challenge_enrollments').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc
      .from('challenge_enrollments').select('*')
      .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  const firstName = (enrollment.name || user.email?.split('@')[0] || 'there').split(' ')[0]
  const [{ data: workoutPlan }, { data: doneRows }] = await Promise.all([
    svc.from('challenge_workout_plans').select('*').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
  ])

  if (!workoutPlan?.plan) {
    return (
      <div className="min-h-screen bg-obsidian px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-2">No workout yet</h1>
          <p className="text-ivory/50 text-sm mb-6">Finish your quick intake and I&apos;ll build your training.</p>
          <Link href="/plan/intake" className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl">Build my plan</Link>
        </div>
      </div>
    )
  }

  // "Today" = the next day in her week, rotating by how many workouts she's finished.
  const program = workoutPlan.plan as WorkoutProgram
  const numDays = program.track === 'home' ? (program.home?.days.length || 1) : (program.gymDays?.length || 1)
  const completed = (doneRows || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
  const startDay = numDays > 0 ? completed % numDays : 0

  return (
    <div className="min-h-screen bg-obsidian px-4 py-8">
      <WorkoutPlayer program={program} firstName={firstName} startDay={startDay} />
    </div>
  )
}
