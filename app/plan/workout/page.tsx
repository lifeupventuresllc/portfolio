import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import WorkoutPlayer from '@/components/WorkoutPlayer'
import QuickstartWorkout from '@/components/QuickstartWorkout'
import { generateWorkout, pickFocusDayIndex, applyProgressiveOverload, type WorkoutProgram, type TrainingStyle, type FocusArea, type WorkoutInputs } from '@/lib/workout'
import { getProgressionOverrides } from '@/lib/progression'
import { generateCardioSession } from '@/lib/cardio-session'
import type { Level, Injury } from '@/lib/workout-exercises'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { localDateISO, addDaysISO, currentWeekNumber, getTimezone, localHourNumber } from '@/lib/localdate'
import { computeLowFuelToday } from '@/lib/workout-assembly'
import { getRecentlyTrainedMuscles } from '@/lib/progression'
import { parseStoredGoal } from '@/lib/goals'

export const dynamic = 'force-dynamic'

// Real progressive-overload trigger — counts consecutive PAST full weeks
// (not the current, still-in-progress one) where she hit at least ~70% of
// her planned training days, stopping at the first miss. A genuine earned
// streak, computed from her actual logged workout dates, not a guess.
function consistentWeeksStreak(loggedDates: Set<string>, plannedPerWeek: number, todayISO: string, maxWeeks = 8): number {
  if (plannedPerWeek <= 0) return 0
  const threshold = Math.max(2, Math.round(plannedPerWeek * 0.7))
  let streak = 0
  for (let w = 1; w <= maxWeeks; w++) {
    const weekStart = addDaysISO(todayISO, -7 * w)
    let count = 0
    for (let d = 0; d < 7; d++) if (loggedDates.has(addDaysISO(weekStart, d))) count++
    if (count >= threshold) streak++
    else break
  }
  return streak
}

export default async function WorkoutSession({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
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

  // Same real bug as /plan/today's "Today, there" (found live, screenshot):
  // "there" only works for an idiomatic "Hey there," never for a vocative
  // "That's done, {name}." — WorkoutPlayer's finish screen needs the same
  // hasRealName gate, not just this page's own copy.
  const hasRealName = !!(enrollment.name || user.email)
  const firstName = (enrollment.name || user.email?.split('@')[0] || 'there').split(' ')[0]
  const today = localDateISO()
  // Nutrition -> workout (Asa's ask: "the two main brains" should connect).
  // Same shared rule as lib/next-action/state.ts's getUserState — this page
  // and the chat/circle must mean the identical thing by "low fuel," not
  // two independently-tuned thresholds.
  const [{ data: workoutPlan }, { data: doneRows }, { data: intake }, todayAdjustment, { data: foodToday }] = await Promise.all([
    svc.from('challenge_workout_plans').select('*').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('measurements, logged_on').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
    svc.from('challenge_intake').select('*').eq('enrollment_id', enrollment.id).maybeSingle(),
    getApprovedTodayAdjustment(enrollment.id as string, today),
    svc.from('challenge_food_log').select('calories').eq('enrollment_id', enrollment.id).eq('logged_on', today),
  ])
  const caloriesSoFar = (foodToday || []).reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  const lowFuelToday = computeLowFuelToday(caloriesSoFar, localHourNumber(getTimezone()))

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
  // An approved injury override needs no separate branch here anymore — it's
  // already permanently written into intake.form_data.injuries by the time
  // this page loads (see the comment below), and regeneration now always
  // reads that fresh on every visit rather than only on an explicit override.
  // A chat-approved "focus on arms/legs/core today" request — same TODAY-ONLY
  // regeneration mechanism as trackOverride/injuryOverride, not a permanent
  // plan change. Real gap found live: this used to only ever be read from her
  // PERMANENT intake.form_data.focus_area default, so approving a one-off
  // "build me an arm workout" in chat never actually showed an arm-focused
  // session here — the dashboard kept rendering her regular saved program.
  const focusOverride = todayAdjustment?.workoutChange?.focusOverride
  // Real gap found live: this used to only regenerate on an explicit
  // track/injury/focus override, so the DEFAULT case — no override at all,
  // what every visit looks like most of the time — just read the stored
  // plan.plan blob as-is forever. That blob was generated exactly ONCE, at
  // intake time, with weekNumber permanently baked in at 1 — so exercise
  // SELECTION (not which day she's on, which already correctly rotates by
  // completed-workout count below) never actually varied week to week, ever,
  // for as long as she used the app — the opposite of what "Deterministic by
  // weekNumber ... weeks vary" in lib/workout.ts was actually meant to do.
  // Regenerating from her real intake + a real current week number on every
  // visit makes that genuinely true, while a same-day chat override still
  // wins for today specifically via trackOverride/overrideAreas below.
  if (intake) {
    // Real bug found live, 2026-09-03: this silently downgraded 'recomp'
    // (both "Lose fat" and "Build & tone" selected — see lib/goals.ts) back
    // to a plain 'lose' plan on every single regeneration, right at the one
    // real-time call site that rebuilds her workout on every visit —
    // undoing the fix at intake time before it ever reached the engine.
    const goal = parseStoredGoal(intake.goal as string | null)
    const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
    const postpartum = !!(intake.form_data as { postpartum?: boolean } | null)?.postpartum
    const trainingStyle = ((intake.form_data as { training_style?: TrainingStyle } | null)?.training_style || 'none') as TrainingStyle
    const focusArea = ((intake.form_data as { focus_area?: FocusArea } | null)?.focus_area || 'overall') as FocusArea
    const weekNumber = currentWeekNumber((enrollment.created_at as string) || new Date().toISOString())
    // Layer three (lib/progression.ts) — real logged set-effort history,
    // per movement pattern. This is the ONE place her actual dynamic
    // skill/intensity state reaches the assembly engine for her real,
    // displayed session (as opposed to a preview/PDF render elsewhere that
    // doesn't need to reflect live progression).
    const [progressionOverrides, recentlyTrainedMuscles] = await Promise.all([
      getProgressionOverrides(enrollment.id as string),
      getRecentlyTrainedMuscles(enrollment.id as string),
    ])
    program = generateWorkout({
      name: (enrollment.name as string) || 'Your', sex,
      track: trackOverride || (intake.training_location === 'home' ? 'home' : 'gym'),
      level, goal,
      daysPerWeek: Number(intake.days_per_week) || 3, weekNumber, injuries, postpartum, trainingStyle, focusArea,
      overrideAreas: focusOverride?.length ? focusOverride : undefined,
      progressionOverrides,
      activityLevel: intake.activity_level as WorkoutInputs['activityLevel'],
      lowFuelToday,
      recentlyTrainedMuscles,
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
  // Real progressive overload — see applyProgressiveOverload in lib/workout.ts.
  // Post-process only, applied to whichever program is about to be shown
  // (regenerated-for-today or her stored plan) — never changes which
  // exercises get picked, only the load/duration presented for them.
  const loggedDates = new Set((doneRows || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).map((r) => r.logged_on as string))
  const consistencyWeeks = consistentWeeksStreak(loggedDates, Number(intake?.days_per_week) || 3, localDateISO())
  program = applyProgressiveOverload(program, consistencyWeeks)
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
  // overrideAreas above builds day 0 directly from exactly the requested
  // areas (lib/workout-assembly.ts maps them to FOCUS_MUSCLES and assembles
  // day 0 from that), so it's already the right day by construction — no
  // per-day scoring needed the way a single focusArea used to require.
  if (focusOverride?.length) startDay = 0
  // Real gap found live: a Coach Asa COLD-START build (no account/profile yet,
  // built right in chat) has no fos_adjustment at all, so focusOverride above
  // is never set — "build me a chest and arm workout" got the right content
  // in the chat summary, but tapping through to this actual page still opened
  // on her plain rotation day (day 0 for a fresh plan), not the day matching
  // what she'd just asked for. Only applies before she's completed anything —
  // once she's actually progressing through her week, real rotation takes
  // over same as always; this is purely about her first landing matching
  // what the chat she just came from told her.
  //
  // Real gap found live (beta feedback Priority 1, 2026-08-25): the SAME
  // problem, from a different source — saving a new permanent focus_area
  // via /plan/preferences regenerates the program correctly, but "did it
  // affect my workout?" still showed whatever plain rotation happened to
  // land on (a Full Body day, unrelated to what she'd just picked), since
  // `completed === 0` is false for anyone who's already done even one
  // workout. She just told the app what she wants to focus on — the very
  // next session she opens should reflect that, not "eventually, whenever
  // rotation happens to get there." /plan/preferences redirects here with
  // ?focusUpdated=1 specifically so this one visit jumps to the matching
  // day; every visit after that goes back to normal rotation (real variety
  // across her week is still the point — this isn't "pin every day to one
  // focus forever," just "the change I just asked for should be visible now").
  else if (completed === 0 || searchParams?.focusUpdated === '1') {
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
      <WorkoutPlayer program={program} firstName={firstName} hasRealName={hasRealName} startDay={startDay} targetMinutes={todayAdjustment?.workoutChange?.toMinutes} />
      {/* The quickstart flow (QuickstartWorkout) only ever shows its home/gym
          picker once, on the very first build — real behavior, not a bug, since
          re-showing it every visit would defeat the "no wall" point. But she
          still needs a real, visible way to switch after that first choice —
          this reuses the same trackOverride mechanism Coach Asa's chat already
          uses (see the trackOverride block above), rather than building a
          second, separate switching path. */}
      <div className="max-w-lg mx-auto text-center mt-6">
        <a href="/plan/coach" className="text-ivory/40 text-sm underline underline-offset-4">
          Training somewhere different today? Tell Coach
        </a>
      </div>
    </div>
  )
}
