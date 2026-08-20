import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import WorkoutPlayer from '@/components/WorkoutPlayer'
import QuickstartWorkout from '@/components/QuickstartWorkout'
import { generateWorkout, pickFocusDayIndex, type WorkoutProgram, type TrainingStyle, type FocusArea } from '@/lib/workout'
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
    // The Sculpt Sessions fast lane — one photo, one question (home or gym),
    // straight into a real beginner-friendly full-body workout. No injury/focus
    // question here (that's Coach Asa's chat path for anything more tailored).
    return <QuickstartWorkout />
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
  // A chat-approved "focus on arms/legs/core today" request — same TODAY-ONLY
  // regeneration mechanism as trackOverride/injuryOverride, not a permanent
  // plan change. Real gap found live: this used to only ever be read from her
  // PERMANENT intake.form_data.focus_area default, so approving a one-off
  // "build me an arm workout" in chat never actually showed an arm-focused
  // session here — the dashboard kept rendering her regular saved program.
  const focusOverride = todayAdjustment?.workoutChange?.focusOverride
  if (((trackOverride && trackOverride !== program.track) || injuryOverride || focusOverride) && intake) {
    const goal = (intake.goal === 'gain' || intake.goal === 'maintain' ? intake.goal : 'lose') as 'lose' | 'gain' | 'maintain'
    const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
    const postpartum = !!(intake.form_data as { postpartum?: boolean } | null)?.postpartum
    const trainingStyle = ((intake.form_data as { training_style?: TrainingStyle } | null)?.training_style || 'none') as TrainingStyle
    const focusArea = (focusOverride || (intake.form_data as { focus_area?: FocusArea } | null)?.focus_area || 'overall') as FocusArea
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
  let startDay = numDays > 0 ? completed % numDays : 0
  // Real bug found live: focusOverride alone never changes which day comes
  // first in her weekly rotation — a chat-approved "build me an arm
  // workout" saved a real workoutChange and regenerated `program` correctly
  // above, but this page still opened her on her ROTATION-based day
  // (whichever leg/upper/whatever day she was naturally due for), not the
  // day that actually matches what she asked for. "View my updated
  // workout" clicked through fine; what it landed on just wasn't an arm
  // day. Route to the focus-matching day today specifically, same as the
  // track/injury overrides above already do implicitly by regenerating
  // `program` itself.
  if (focusOverride) startDay = pickFocusDayIndex(program, focusOverride)
  // Real gap found live: a Coach Asa COLD-START build (no account/profile yet,
  // built right in chat) has no fos_adjustment at all, so focusOverride above
  // is never set — "build me a chest and arm workout" got the right content
  // in the chat summary, but tapping through to this actual page still opened
  // on her plain rotation day (day 0 for a fresh plan), not the day matching
  // what she'd just asked for. Only applies before she's completed anything —
  // once she's actually progressing through her week, real rotation takes
  // over same as always; this is purely about her first landing matching
  // what the chat she just came from told her.
  else if (completed === 0) {
    const storedFocusArea = (intake?.form_data as { focus_area?: FocusArea } | null)?.focus_area
    if (storedFocusArea && storedFocusArea !== 'overall') startDay = pickFocusDayIndex(program, storedFocusArea)
  }

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
      {/* The quickstart flow (QuickstartWorkout) only ever shows its home/gym
          picker once, on the very first build — real behavior, not a bug, since
          re-showing it every visit would defeat the "no wall" point. But she
          still needs a real, visible way to switch after that first choice —
          this reuses the same trackOverride mechanism Coach Asa's chat already
          uses (see the trackOverride block above), rather than building a
          second, separate switching path. */}
      <div className="max-w-lg mx-auto text-center mt-6">
        <a href="/plan/coach" className="text-ivory/40 text-sm underline underline-offset-4">
          Training somewhere different today? Tell Coach Asa
        </a>
      </div>
    </div>
  )
}
