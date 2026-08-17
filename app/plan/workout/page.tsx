import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import WorkoutPlayer from '@/components/WorkoutPlayer'
import { generateWorkout, type WorkoutProgram, type TrainingStyle, type FocusArea } from '@/lib/workout'
import { generateCardioSession } from '@/lib/cardio-session'
import type { Level, Injury } from '@/lib/workout-exercises'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { localDateISO } from '@/lib/localdate'

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
  const [{ data: workoutPlan }, { data: doneRows }, { data: intake }, todayAdjustment] = await Promise.all([
    svc.from('challenge_workout_plans').select('*').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
    svc.from('challenge_intake').select('*').eq('enrollment_id', enrollment.id).maybeSingle(),
    getApprovedTodayAdjustment(enrollment.id as string, localDateISO()),
  ])

  if (!workoutPlan?.plan) {
    // No forced form here either — Coach Asa can build a real session straight from
    // a chat message (see app/api/plan/operator/route.ts's cold-start build), so
    // that's offered first; the structured form stays as the alternative.
    return (
      <div className="min-h-[100dvh] bg-obsidian px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-2">No workout yet</h1>
          <p className="text-ivory/60 text-sm mb-6">Tell Coach Asa what you&apos;re looking for and she&apos;ll build it right there — or fill in your stats yourself.</p>
          <Link href="/plan/coach" className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl mb-3">Talk to Coach Asa</Link>
          <Link href="/plan/intake" className="block text-ivory/50 text-sm underline underline-offset-4">Or build it myself</Link>
        </div>
      </div>
    )
  }

  // "Today" = the next day in her week, rotating by how many workouts she's finished.
  let program = workoutPlan.plan as WorkoutProgram

  // She told the daily check-in she's somewhere different than her stored program's
  // track (e.g. plan says gym, she said home today) — regenerate a TODAY-ONLY session
  // on the track she's actually on, from the same stored intake, without touching her
  // permanent plan. This is the fix for "I said home but still got barbell squats."
  // A freshly-approved injury needs the same TODAY-ONLY regeneration: by the time she
  // lands here, the operator route already wrote it into intake.form_data.injuries
  // (permanent, every future plan honors it too), but today's cached weekly program
  // was generated before that write, so it still needs a fresh pull to reflect it.
  // Available unconditionally — reused below for both the track/injury regeneration
  // path and the cardio-content-swap path.
  const level = (intake?.experience_level === 'advanced' ? 3 : intake?.experience_level === 'intermediate' ? 2 : 1) as Level
  const injuries = (Array.isArray((intake?.form_data as { injuries?: Injury[] } | null)?.injuries)
    ? (intake?.form_data as { injuries?: Injury[] }).injuries! : []) as Injury[]

  const trackOverride = todayAdjustment?.workoutChange?.trackOverride
  const injuryOverride = todayAdjustment?.workoutChange?.injuryBodyPart
  if (((trackOverride && trackOverride !== program.track) || injuryOverride) && intake) {
    const goal = (intake.goal === 'gain' || intake.goal === 'maintain' ? intake.goal : 'lose') as 'lose' | 'gain' | 'maintain'
    const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
    const postpartum = !!(intake.form_data as { postpartum?: boolean } | null)?.postpartum
    const trainingStyle = ((intake.form_data as { training_style?: TrainingStyle } | null)?.training_style || 'none') as TrainingStyle
    const focusArea = ((intake.form_data as { focus_area?: FocusArea } | null)?.focus_area || 'overall') as FocusArea
    program = generateWorkout({
      name: (enrollment.name as string) || 'Your', sex, track: trackOverride || program.track, level, goal,
      daysPerWeek: Number(intake.days_per_week) || 3, weekNumber: 1, injuries, postpartum, trainingStyle, focusArea,
    })
  }

  // Anchor rotation to her PERMANENT plan's day count, not the (possibly track-swapped)
  // program being shown today — her position in the push-pull sequence shouldn't shift
  // just because today's session is on a different track. generateHome/generateGym now
  // always produce matching day counts for the same daysPerWeek, so this is belt-and-suspenders.
  const permanentPlan = workoutPlan.plan as WorkoutProgram
  const numDays = permanentPlan.track === 'home' ? (permanentPlan.home?.days.length || 1) : (permanentPlan.gymDays?.length || 1)
  const completed = (doneRows || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
  const startDay = numDays > 0 ? completed % numDays : 0

  // Coach Asa approved a real cardio/HIIT swap (not just a shorter version of
  // whatever was scheduled) — splice today's slot only, request-scoped, her stored
  // weekly plan is never touched. See lib/cardio-session.ts.
  if (todayAdjustment?.workoutChange?.contentSwap === 'cardio') {
    const offset = completed + startDay
    if (program.track === 'home' && program.home) {
      const days = [...program.home.days]
      days[startDay] = { ...generateCardioSession('home', level, injuries, offset), dayNum: days[startDay]?.dayNum ?? startDay + 1 }
      program = { ...program, home: { ...program.home, days } }
    } else if (program.gymDays) {
      const gymDays = [...program.gymDays]
      gymDays[startDay] = { ...generateCardioSession('gym', level, injuries, offset), dayNum: gymDays[startDay]?.dayNum ?? startDay + 1 }
      program = { ...program, gymDays }
    }
  }

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-8">
      <WorkoutPlayer program={program} firstName={firstName} startDay={startDay} targetMinutes={todayAdjustment?.workoutChange?.toMinutes} />
    </div>
  )
}
