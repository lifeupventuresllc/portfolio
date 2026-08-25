import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateWorkout, type WorkoutProgram, type TrainingStyle, type FocusArea } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'
import { currentWeekNumber } from '@/lib/localdate'

export const dynamic = 'force-dynamic'

// Priority 10 (beta feedback, 2026-08-25) — a real forward-looking week view,
// like every other fitness app has. Also the direct answer to a question
// raised live: "how does the user even know the plan updated going forward?"
// This reads the SAME real, freshly-regenerated program /plan/workout uses
// (not a separate generation path, not a guess) — every day shown here is
// exactly what she'll actually get, proof that a saved preference change
// (see /plan/preferences) really did reshape the whole week, not just today.
// "← My week" on the workout player used to just go back to the dashboard —
// a real, misleading dead end now fixed to point here.
export default async function WorkoutWeekPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/workout/week')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('*').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  const [{ data: workoutPlan }, { data: doneRows }, { data: intake }] = await Promise.all([
    svc.from('challenge_workout_plans').select('*').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('measurements, logged_on').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
    svc.from('challenge_intake').select('*').eq('enrollment_id', enrollment.id).maybeSingle(),
  ])

  if (!workoutPlan?.plan) redirect('/plan/workout')

  // Same regeneration as /plan/workout's default path (no today-only
  // overrides here — this is her real permanent plan, not a one-off swap) —
  // this MUST be the same real program, not a second, possibly-different
  // generation, or "my week" would show something she'd never actually get.
  let program = workoutPlan.plan as WorkoutProgram
  if (intake) {
    const level = (intake.experience_level === 'advanced' ? 3 : intake.experience_level === 'intermediate' ? 2 : 1) as Level
    const injuries = (Array.isArray((intake.form_data as { injuries?: Injury[] } | null)?.injuries) ? (intake.form_data as { injuries: Injury[] }).injuries : []) as Injury[]
    const goal = (intake.goal === 'gain' || intake.goal === 'maintain' ? intake.goal : 'lose') as 'lose' | 'gain' | 'maintain'
    const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
    const postpartum = !!(intake.form_data as { postpartum?: boolean } | null)?.postpartum
    const trainingStyle = ((intake.form_data as { training_style?: TrainingStyle } | null)?.training_style || 'none') as TrainingStyle
    const focusArea = ((intake.form_data as { focus_area?: FocusArea } | null)?.focus_area || 'overall') as FocusArea
    const weekNumber = currentWeekNumber((enrollment.created_at as string) || new Date().toISOString())
    program = generateWorkout({
      name: (enrollment.name as string) || 'Your', sex, track: intake.training_location === 'home' ? 'home' : 'gym',
      level, goal, daysPerWeek: Number(intake.days_per_week) || 3, weekNumber, injuries, postpartum, trainingStyle, focusArea,
    })
  }

  const days = program.track === 'home' ? (program.home?.days || []).map((d) => ({ title: d.title, muscles: undefined as string | undefined }))
    : (program.gymDays || []).map((d) => ({ title: d.title, muscles: d.muscles }))
  const numDays = days.length || 1
  const completed = (doneRows || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
  const todayIdx = completed % numDays

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link href="/plan/workout" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold active:scale-95 transition-all mb-6">← Today&apos;s workout</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">My week</p>
        <h1 className="text-white text-2xl font-bold mb-2">Your real plan, day by day</h1>
        <p className="text-ivory/50 text-sm mb-8">Exactly what you&apos;ll get, generated from your current goals and focus. Change your preferences and this list updates with it.</p>

        <div className="space-y-2">
          {days.map((d, i) => (
            <div key={i} className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 border ${i === todayIdx ? 'bg-gold/10 border-gold' : 'bg-charcoal border-smoke'}`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${i === todayIdx ? 'text-gold' : 'text-ivory/40'}`}>Day {i + 1}{i === todayIdx ? ' · Today' : ''}</p>
                <p className="text-white font-semibold text-sm">{d.title}</p>
                {d.muscles && <p className="text-ivory/40 text-xs mt-0.5">{d.muscles}</p>}
              </div>
              {i === todayIdx && <span className="text-gold text-xs font-bold shrink-0">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
