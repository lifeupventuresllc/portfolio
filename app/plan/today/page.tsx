import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import LifePatternCard from '@/components/LifePatternCard'
import PlanEvolutionCard from '@/components/PlanEvolutionCard'
import ClientMenu from '@/components/ClientMenu'
import RebuildPlanButton from '@/components/RebuildPlanButton'
import MondayMemo from '@/components/MondayMemo'
import LevelUpNudge from '@/components/LevelUpNudge'
import StreakChip from '@/components/StreakChip'
import TrendCard from '@/components/TrendCard'
import { getProgressScoreTrend } from '@/lib/progress-score'
import { getTimezone, localMondayIndex, localDateISO } from '@/lib/localdate'
import { assessLifePattern, messageForPattern } from '@/lib/fos/pattern'
import { assessStructuralPattern, messageForStructural } from '@/lib/fos/plan-evolution'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { getEffectiveTodayWorkout, getEffectiveCalorieBudget, isEatingOutToday } from '@/lib/fos/effective-plan'
import { streakFrom, milestoneMoment } from '@/lib/streak'
import { shortVersionFor } from '@/lib/workout-short'
import { LIVE_CALL } from '@/lib/live-call'
import { pickFocusDayIndex, type WorkoutProgram, type FocusArea } from '@/lib/workout'
import type { WeekPlan } from '@/lib/meal-plan'

export const dynamic = 'force-dynamic'

// Plain outline glyphs, never emoji — standing style rule (same stroke/weight
// convention as CoachHero's SendIcon/NoteIcon).
function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4.5 4V17H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}
function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  )
}
function MealIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11M16 3c-1.4 0-2.5 1.6-2.5 4.5S14.6 12 16 12s2.5-1.6 2.5-4.5S17.4 3 16 3ZM16 12v9" />
    </svg>
  )
}
function FlameIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5c1.2 2.3-1 3.6-1 6 0 1.4 1 2.3 2.2 2.3S15 9.7 14.4 8c1.8 1.4 3.1 3.9 3.1 6.3A5.5 5.5 0 0 1 12 20a5.5 5.5 0 0 1-5.5-5.7c0-3.4 2.2-5.6 3.3-7.1.6-.9.9-2 .9-3.2S11.6 1.8 12 2.5Z" />
    </svg>
  )
}

export default async function TodayView({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Real gap found live: a totally fresh visitor (no session at all, not
  // even anonymous — e.g. a direct/shared link to this exact page) hit a
  // login wall here, contradicting the app's own "no signup wall" anonymous-
  // access design (see /try, the real bootstrap for every other entry
  // point). Route through the same anonymous-session flow instead of
  // demanding a real account just to see this page.
  if (!user) redirect('/try?to=/plan/today')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('*').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')
  if (!enrollment.intake_completed) redirect('/plan')

  // Real bug found live (screenshot): "there" is a fine fallback for an idiomatic
  // "Hey there," but the heading below is a vocative "Today, {name}" construction —
  // "Today, there" reads as broken, not friendly. hasRealName gates whether that
  // comma-name suffix renders at all, instead of ever substituting the fallback word
  // into a sentence shape it was never written for.
  const hasRealName = !!(enrollment.name || user.email)
  const firstName = (enrollment.name || user.email?.split('@')[0] || 'there').split(' ')[0]

  const tz = getTimezone()
  const todayIso = localDateISO(tz)
  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: doneRows }, todayAdjustment, { data: intakeRow }, { data: foodRows }, trendPoints, { data: recentWorkoutActions }] = await Promise.all([
    svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('meals, calories, protein_g').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('measurements, logged_on').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
    getApprovedTodayAdjustment(enrollment.id as string, todayIso),
    svc.from('challenge_intake').select('form_data').eq('enrollment_id', enrollment.id).maybeSingle(),
    // Real numbers for the slim nutrition row below (Whoop-mockup match) — the
    // same challenge_food_log table FoodLog itself reads client-side, queried
    // here server-side so the glance row never has to wait on a second
    // client fetch just to show "X cal left."
    svc.from('challenge_food_log').select('calories, protein_g').eq('enrollment_id', enrollment.id).eq('logged_on', todayIso),
    // Weighted, lifetime progress trend (Asa's call, 2026-08-26: "everything
    // counts towards their goal" — not just weigh-ins) — see lib/progress-score.ts.
    getProgressScoreTrend(enrollment.id as string),
    // Real gap found live (Asa's ask, 2026-08-28): "if she simplified her
    // workout via the circle, this page shouldn't act like nothing
    // happened." Same recent-workout-actions read next-action/state.ts
    // already does for its own workoutSkippedToday — reused here, not
    // duplicated logic, just a second consumer of the same real signal.
    svc.from('next_action_log').select('shown_at, skipped_at, superseded_at').eq('enrollment_id', enrollment.id).eq('kind', 'workout').gte('shown_at', new Date(Date.now() - 2 * 86400000).toISOString()).order('shown_at', { ascending: false }),
  ])
  // Moved here from /plan's dashboard (2026-08-12 redesign) — one-time invite into
  // the profile pass(es) she skipped to get here fast. Disappears for good once done.
  // Real gap found+fixed: this used to only ever check optional_completed, so a
  // Quickstart-origin user (goal/focus/body/location/injuries never asked at all —
  // goal defaults to 'lose' silently) got the SAME "fine-tune your plan" nudge as
  // someone who'd already done the real required tier and just skipped the extras —
  // and that nudge only opens the OPTIONAL tier, which doesn't include goal at all.
  // She'd have no path back to ever set her real goal. Now checks required_tier_completed
  // first (see lib/plan-builder.ts) and routes to the actual required form when that's
  // what's missing, matching the goal-tailoring fix (see lib/workout.ts's repScheme) —
  // a silently-defaulted goal matters more now than it used to.
  const intakeFormData = (intakeRow?.form_data as { optional_completed?: boolean; required_tier_completed?: boolean; focus_area?: FocusArea } | null)
  const needsRequiredTier = !intakeFormData?.required_tier_completed
  const needsOptionalTier = !needsRequiredTier && !intakeFormData?.optional_completed

  const weekdayLabel = new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'short', day: 'numeric' })
  const mealIdx = localMondayIndex(tz) // Mon=0 … Sat=5, Sun=6, in the user's timezone

  // Today's meals from the weekly plan (Mon–Sat). Sunday = recovery, no cook plan.
  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null

  // Real bug found live (verification agent, screenshot): this used to only
  // ever read todayMeals.target, so anyone without a WEEKLY meal plan built
  // showed "No meal plan yet" even with a real calorie/protein goal already
  // set and food already logged — because that goal lives as flat columns on
  // challenge_nutrition_plans (calories, protein_g), the exact same fallback
  // /api/plan/food-log's own loadTarget() already reads for FoodLog's ring.
  // This page needs the same fallback so it never disagrees with FoodLog.
  const flatCalTarget = Number(nutritionPlan?.calories) || null
  const flatProteinTarget = Number(nutritionPlan?.protein_g) || null
  const baseCalTarget = todayMeals?.target ?? flatCalTarget ?? undefined
  const baseProteinTarget = todayMeals?.totalProtein ?? flatProteinTarget ?? undefined
  // Coach Asa adjusted today's calories? Reflect it in the budget — same as /plan's dashboard.
  const calBudget = baseCalTarget != null ? getEffectiveCalorieBudget(baseCalTarget, todayAdjustment) : null
  // Real numbers for the slim nutrition row (Whoop-mockup match) and the
  // hero ring's second half — what she's actually logged today, not what
  // the plan merely intends. foodLoggedToday also feeds the ring below.
  const loggedCalories = (foodRows || []).reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  const loggedProtein = (foodRows || []).reduce((sum, r) => sum + (Number(r.protein_g) || 0), 0)
  const calRemaining = calBudget != null ? Math.max(0, calBudget - loggedCalories) : null
  // Real bug fixed 2026-08-28 (Asa's live report): this used to mean "logged
  // ANY food today" — so one small snack lit up the ring's second half and
  // the circle's "done for today" message even with most of her real budget
  // still unspent. With a known budget, "done" now means she actually used
  // it, matching the same real-completion definition the circle's terminal
  // state uses (lib/next-action/candidates.ts's nutritionDoneToday). With no
  // budget to compare against, a real entry still counts.
  const foodLoggedToday = calBudget != null ? loggedCalories >= calBudget : (foodRows || []).length > 0

  // She told Coach Asa she's eating out today (an ad-hoc chat approval, not a
  // pre-scheduled plan day) — the fixed meal list below is now irrelevant, she's
  // not cooking it. Same "Eat-out day" treatment as a plan day that was already
  // scheduled that way, so approving in chat has a real, visible effect here
  // instead of only living in the chat transcript.
  const eatingOutToday = isEatingOutToday(todayMeals?.eatOut, todayAdjustment)

  // Today's workout — same rotation as the session player (by # workouts finished).
  const program = (workoutPlan?.plan as WorkoutProgram) || null
  const numDays = program ? (program.track === 'home' ? (program.home?.days.length || 1) : (program.gymDays?.length || 1)) : 1
  const completed = (doneRows || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
  // Layout-simplify pass (Option A, Asa's pick from 3 real-app-inspired
  // mockups — Whoop's "one score" move): the hero ring below needs a real,
  // honest TODAY-specific signal, not the cumulative `completed` count above
  // (that one's for rotation position, answers "how many ever," not "did she
  // already go today"). logged_on was already being selected for doneRows —
  // this was one filter away, not a new query.
  const workoutDoneToday = (doneRows || []).some((r) => r.logged_on === todayIso && (r.measurements as { workout?: boolean } | null)?.workout)
  // "Keep it simple" via the circle supersedes today's workout row rather
  // than completing it — a deliberate, real choice, not the same as never
  // showing up at all. Same today-local-date match as
  // lib/next-action/state.ts's workoutSkippedToday (same underlying signal,
  // a second real consumer of it here).
  const todaysWorkoutAction = (recentWorkoutActions || []).find((r) => localDateISO(tz, new Date(r.shown_at as string)) === todayIso)
  const workoutSimplifiedToday = !workoutDoneToday && !!(todaysWorkoutAction?.skipped_at || todaysWorkoutAction?.superseded_at)
  // The hero ring's real "1/2" — two genuine today-specific wins (workout,
  // real logged food), not an arbitrary made-up score.
  const dailyScore = (workoutDoneToday ? 1 : 0) + (foodLoggedToday ? 1 : 0)
  // The investment loop the app was missing: a real, banked number that makes
  // NOT coming back today feel like a loss. Reuses the exact same streak
  // definition already driving the dashboard chip, Monday memo, dip detection,
  // and leaderboard (see lib/streak.ts) — doneRows above is already every
  // '__daily__' row with no date filter, the same universe streakFrom expects
  // everywhere else. Never a second, drifting streak number.
  const checkinDates = new Set((doneRows || []).map((r) => r.logged_on as string))
  const currentStreak = streakFrom(checkinDates, todayIso)
  // Real gap found live (Asa's ask, 2026-08-28): a day she genuinely engaged
  // with — did the simplified version, or logged some food — but hasn't hit
  // either full "done," used to look IDENTICAL to a day she did nothing at
  // all: a flat, unlit ring and a nag to start the very workout she already
  // consciously chose to simplify. Effort she actually put in deserves to
  // read differently from a blank day, without inflating dailyScore itself
  // (that number still has to mean what it says — see bug #15).
  const showedUpToday = checkinDates.has(todayIso) || workoutSimplifiedToday
  // The genuinely new piece: a real, varying message on the exact day a
  // milestone lands, instead of the identical static confirmation every day
  // gets today regardless of how long a streak she's actually built.
  const streakMoment = milestoneMoment(currentStreak, enrollment.id as string)
  // Real gap found live: this card (the one the bottom-tab nav actually lands
  // on) had zero focus-area awareness, same class of bug as /plan's dashboard
  // card and /plan/workout — a chat-approved or cold-start-built "focus on
  // my X" request never showed up here either. Same resolved-focus logic as
  // those two surfaces: an approved override wins, else (only before her
  // first completed workout) her freshly-stored focus preference.
  //
  // Real gap found live (beta feedback Priority 1, 2026-08-25): "I changed
  // my preferences and it still shows a Full Body day" — this is the FIRST
  // page she lands on after saving, and had the same completed===0-only
  // restriction as /plan/workout. /plan/preferences redirects here with
  // ?focusUpdated=1 for exactly this one visit so the change is actually
  // visible right away, same fix as there.
  const focusJustUpdated = searchParams?.focusUpdated === '1'
  const effectiveFocusArea = todayAdjustment?.workoutChange?.focusOverride
    || ((completed === 0 || focusJustUpdated) && intakeFormData?.focus_area && intakeFormData.focus_area !== 'overall' ? intakeFormData.focus_area : undefined)
  // Simplify pass (5-step algorithm run against this whole page): this used to
  // compute "today's day" twice — once here via plain rotation for the dip-
  // pattern's suggested moves, once inside getEffectiveTodayWorkout via
  // pickFocusDayIndex for the main workout card — which could disagree the
  // moment a focus request was active (main card shows her requested focus
  // day, dip suggestion still shows whatever plain rotation landed on). One
  // resolved index now, used everywhere on this page that needs "today's day."
  const startDay = program && effectiveFocusArea ? pickFocusDayIndex(program, effectiveFocusArea)
    : numDays > 0 ? completed % numDays : 0
  // Approved cardio swap already reflected in the title — see effective-plan.ts.
  const todayWorkout = getEffectiveTodayWorkout(program, completed, todayAdjustment, effectiveFocusArea)

  // Layer 1's primary feature, unified: reads across every behavioral signal
  // already being collected (workout, food logging, app-open silence,
  // eating-out frequency, chat-reported stress, calendar) as ONE combined
  // read instead of separate siloed checks — a real rough patch shows up as
  // a combination, not one clean threshold crossing. See lib/fos/pattern.ts.
  // Layer 1 Phase 5 (structural) is the longer-horizon counterpart — a real
  // 3-week pattern means the plan itself doesn't match her life anymore, not
  // just a rough day. Never rewrites anything without her approval.
  // Speed-up found running the 5-step algorithm against this whole page:
  // these two were awaited one after another even though neither reads the
  // other's result — real, unnecessary sequential latency on every load.
  // Parallelized, same as every other independent fetch on this page.
  const [patternAssessment, structuralAssessment] = await Promise.all([
    assessLifePattern(enrollment.id as string, localDateISO(tz)),
    assessStructuralPattern(enrollment.id as string, localDateISO(tz)),
  ])
  const dipMoves = patternAssessment.isDip && program ? shortVersionFor(program, startDay) : []
  const patternMessage = patternAssessment.isDip ? messageForPattern(patternAssessment) : null
  const showWorkoutAction = dipMoves.length > 0 && patternAssessment.signals.includes('workout_dip')
  const structuralMessage = messageForStructural(structuralAssessment)

  // For You page — recolored to match the exact Option A mockup Asa picked
  // (a real published comparison of 3 real-app-inspired directions): a
  // near-black forest ground, flat dark cards with a thin border instead of
  // the previous gold-glow gradient treatment, gold reserved for accents and
  // the one hero ring. Real course-correction, live — the page background
  // and card treatment below are a direct, literal match to that mockup's
  // own palette, not an approximation of it.
  const ACCENT = '#c9a84c'
  const INK = '#1c1509'
  const CARD_BG = '#12241a'
  const CARD_BORDER = '1px solid #24402f'
  const CARD_GLOW = 'none'
  const CARD_TEXT = '#ffffff'
  const CARD_MUTED = 'rgba(232,223,200,0.62)'
  const CARD_ACCENT = '#c9a84c'
  // Simplify pass: every card on this page repeated this same three-property
  // style object by hand — the actual friction that made scoping the gold
  // recolor to just the budget card require several rounds of careful
  // find-and-replace instead of one change. One definition, used everywhere.
  const cardStyle = { background: CARD_BG, border: CARD_BORDER, boxShadow: CARD_GLOW }

  return (
    <div className="min-h-[100dvh] px-4 py-6" style={{ background: '#0b1712' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link href="/plan" className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full active:scale-95 transition-all" style={{ background: CARD_BG, border: CARD_BORDER, color: ACCENT }}>← Home</Link>
          <ClientMenu firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} />
        </div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: ACCENT }}>{weekdayLabel}</p>
          {/* The always-visible half of the streak loop — banked progress she'd
              see, and feel the loss of, every single time she opens this page,
              not just on a milestone day. Reuses the same chip already live on
              the dashboard (same /api/plan/daily streak, same component) rather
              than a second hand-rolled counter — one true streak, everywhere. */}
          <StreakChip />
        </div>
        <h1 className="font-bold mb-6" style={{ color: '#ffffff', fontFamily: 'Georgia, "Times New Roman", ui-serif, serif', fontSize: 'clamp(1.75rem, 6vw, 2.25rem)' }}>Today{hasRealName ? `, ${firstName}` : ''}</h1>

        <div className="space-y-6">
          {/* Variable reward — fires only on the exact day a real milestone lands
              (see lib/streak.ts), pulling one of several real lines instead of a
              single fixed "nice job," so a personal record doesn't read as a
              form letter. This is the piece the app had zero of before: every
              completion produced the identical static confirmation regardless
              of how long a streak she'd actually built. */}
          {streakMoment && (
            <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)' }}>
              <span style={{ color: ACCENT }}><FlameIcon /></span>
              <p className="text-sm font-semibold" style={{ color: CARD_TEXT }}>{streakMoment}</p>
            </div>
          )}
          {/* The primary feature, live: one unified read across everything she does,
              not a stack of separate cards. This leads, ahead of everything else —
              the smaller ask comes first. */}
          {patternMessage && <LifePatternCard title={patternMessage.title} body={patternMessage.body} showWorkoutAction={showWorkoutAction} moves={dipMoves} />}

          {/* Layer 1 Phase 5 — a real multi-week pattern, not a today problem.
              Sits below the acute card since it's a bigger decision, never forced. */}
          {structuralMessage && <PlanEvolutionCard title={structuralMessage.title} body={structuralMessage.body} />}

          {/* Moved here from /plan's dashboard (2026-08-12 redesign) — Challenge +
              Inner Circle exclusive, invisible unless it's actually her Monday AND
              Asa has recorded real audio for the slot her week earned. */}
          {(enrollment.tier === 'challenge' || enrollment.tier === 'inner_circle') && <MondayMemo />}

          {/* Layout-simplify pass (Option A, Asa's pick from 3 real-app-inspired
              mockups — Whoop's "one score" move): compress today into one
              glanceable ring + one sentence naming exactly what's next.
              Real gap found live: this first pass still boxed the ring in
              the same bordered/glowing card style as every other section —
              Whoop (and the approved mockup) never puts its hero score in a
              box, it's the one thing on the screen that's deliberately NOT a
              card, floating directly on the background, bigger than
              anything else here. workoutDoneToday is a real, today-specific
              signal (see above), not the cumulative rotation counter. */}
          <section className="flex flex-col items-center text-center py-2">
            {todayWorkout ? (
              <>
                <div className="relative w-48 h-48 mb-5">
                  <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                    {/* Real gap found live (Asa's ask, 2026-08-28): this track
                        used to read identically on a day she genuinely
                        engaged (simplified her workout, logged some food) and
                        a day she did nothing at all — both flat, unlit gray.
                        A dim accent tint (not the full solid arc dailyScore
                        earns) gives real effort a visibly different look
                        from a blank day, without claiming either slot is
                        actually done. */}
                    <circle cx="50" cy="50" r="45" fill="none" stroke={showedUpToday && dailyScore < 2 ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'} strokeWidth="6" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke={CARD_ACCENT} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${2 * Math.PI * 45 * (1 - dailyScore / 2)}`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold" style={{ color: CARD_TEXT, fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}>{dailyScore}/2</p>
                    <p className="text-[10px] uppercase tracking-wider font-semibold mt-1" style={{ color: CARD_MUTED }}>
                      {dailyScore < 2 && showedUpToday ? 'showed up today' : 'done today'}
                    </p>
                  </div>
                </div>
                <p className="font-semibold" style={{ color: CARD_TEXT }}>
                  {workoutDoneToday
                    ? 'You already showed up today.'
                    : workoutSimplifiedToday
                    // Real gap found live (Asa's ask, 2026-08-28): she
                    // consciously kept today simple via the circle, but this
                    // card — reading its own separate rotation, not the
                    // circle's live decision — kept nagging her toward the
                    // very workout she'd already chosen not to do, with a
                    // pulsing "Start workout" CTA. Acknowledge the real
                    // choice instead of contradicting it.
                    ? 'You kept it simple today — that still counts.'
                    : <>Next: <span style={{ color: CARD_ACCENT }}>{todayWorkout.title}</span></>}
                </p>
                {!workoutDoneToday && !workoutSimplifiedToday && todayAdjustment?.workoutChange && (
                  <p className="text-[11px] mt-1 font-semibold" style={{ color: CARD_ACCENT }}>Adjusted: {todayAdjustment.workoutChange.toMinutes ? `${todayAdjustment.workoutChange.toMinutes}-min ` : ''}{todayAdjustment.workoutChange.swapTo || 'adapted for today'}</p>
                )}
                {!workoutDoneToday && !workoutSimplifiedToday && (
                  <Link href="/plan/workout" className="luf-pulse mt-5 w-full max-w-xs inline-flex items-center justify-center gap-1.5 px-4 py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-transform" style={{ background: CARD_ACCENT, color: INK }}>▶ Start workout</Link>
                )}
                {workoutSimplifiedToday && !workoutDoneToday && (
                  // Quieter, optional — not the same insistent pulsing CTA a
                  // day she hasn't engaged at all gets. Still real and
                  // reachable, never removed outright (see bug #13: never
                  // leave the real workout unreachable).
                  <Link href="/plan/workout" className="mt-5 text-xs font-semibold underline underline-offset-2" style={{ color: CARD_MUTED }}>Still want to do it today?</Link>
                )}
              </>
            ) : (
              <div className="rounded-2xl p-5 w-full" style={cardStyle}>
                <p className="font-semibold mb-1" style={{ color: CARD_TEXT }}>We hit a snag building your workout</p>
                <p className="text-sm mb-3" style={{ color: CARD_MUTED }}>Shouldn&apos;t take more than a second to fix.</p>
                <RebuildPlanButton />
              </div>
            )}
          </section>

          {/* The zero-decision escape hatch — for the moment she's out, off-plan, and
              would otherwise have to decide (or skip eating entirely). Hidden when
              today's already flagged as an eat-out day (the meal section below
              becomes this exact same link) so she isn't shown the same CTA twice. */}
          {!eatingOutToday && (
            <Link href="/plan/eating-out" className="group flex items-center justify-between gap-3 rounded-2xl px-5 py-4 transition-colors" style={cardStyle}>
              <div>
                <p className="font-semibold text-sm" style={{ color: CARD_TEXT }}>Away from home right now?</p>
                <p className="text-xs mt-0.5" style={{ color: CARD_MUTED }}>Tap for exactly what to order — no thinking, no searching.</p>
              </div>
              <span className="text-sm group-hover:translate-x-0.5 transition-transform shrink-0" style={{ color: CARD_ACCENT }}>→</span>
            </Link>
          )}

          {/* Layout-simplify pass (Option A, Asa's pick — exact mockup match):
              the full FoodLog card (budget ring, protein bar, inline search/
              voice/AI-estimate logging, entry list) moved to its own screen
              (/plan/nutrition, "Meal Prep" below) — nothing in it was cut,
              it just isn't a second full card competing with the hero ring
              for the top of this page anymore. This is the one-line glance
              the mockup showed in its place, real numbers, not a guess. */}
          <Link href="/plan/nutrition" className="flex items-center justify-between gap-3 rounded-2xl px-5 py-4 transition-colors" style={cardStyle}>
            {eatingOutToday ? (
              <span className="text-sm font-semibold" style={{ color: CARD_TEXT }}>Eating out today — see exactly what to order</span>
            ) : baseCalTarget != null ? (
              <>
                <span className="text-sm" style={{ color: CARD_TEXT }}>{calRemaining != null ? `${calRemaining} cal left today` : "Today's meals"}</span>
                {baseProteinTarget != null && (
                  <span className="text-sm font-bold shrink-0" style={{ color: CARD_ACCENT }}>{Math.max(0, baseProteinTarget - loggedProtein)}g protein to go</span>
                )}
              </>
            ) : (
              <span className="text-sm" style={{ color: CARD_MUTED }}>{mealIdx > 5 ? 'Sunday — no cook plan, log whatever you have.' : 'No meal plan yet — tap to build one.'}</span>
            )}
          </Link>

          {/* Real weight trend, same source as the Check-In page's chart — Asa's
              call, 2026-08-26, to surface it here too instead of only there. */}
          <TrendCard points={trendPoints} />

          {/* Moved here from /plan's dashboard (2026-08-12 redesign) — infrequent,
              only renders itself when she's actually eligible. Kept as its own card,
              not folded into the pill row below — it's a real inline accept/decline
              decision, not a one-tap "go somewhere" link, so a pill can't represent it. */}
          <LevelUpNudge />

          {/* Layout-simplify pass (Option A, Asa's pick): Coach Asa access + the
              intake nudges below were three separate full-width cards saying
              "go somewhere else" — collapsed into one row of compact links since
              none of them need more than a label and an icon to do their job.
              Real content unchanged (nothing here failed the required-test —
              Coach Asa is the app's only mobile entry point outside /plan itself,
              and the intake nudges are load-bearing for real personalization,
              see the needsRequiredTier note above) — only the visual weight drops. */}
          <div className="flex flex-wrap gap-2">
            <Link href="/plan/coach" className="inline-flex items-center gap-2 rounded-full pl-3.5 pr-4 py-2.5 text-xs font-semibold transition-colors" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: CARD_ACCENT }}>
              <ChatIcon /> Coach Asa
            </Link>
            {/* Real decision, live: viewing today's real meal plan and logging
                food used to be two separate things (a full budget card plus a
                standalone "Log food" pill pointing at the same card) — folded
                into one seamless destination instead. Nothing about FoodLog's
                own logging tools changed, this pill is just the one door into
                all of it now, matching Coach Asa/Goal as the third real
                one-tap link this page needs, not a fourth. */}
            <Link href="/plan/nutrition" className="inline-flex items-center gap-2 rounded-full pl-3.5 pr-4 py-2.5 text-xs font-semibold transition-colors" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: CARD_ACCENT }}>
              <MealIcon /> Meal Prep
            </Link>
            {needsRequiredTier && (
              <Link href="/plan/intake" className="inline-flex items-center gap-2 rounded-full pl-3.5 pr-4 py-2.5 text-xs font-semibold transition-colors" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: CARD_ACCENT }}>
                <TargetIcon /> Set your real goal
              </Link>
            )}
            {needsOptionalTier && (
              <Link href="/plan/intake?tier=optional" className="inline-flex items-center gap-2 rounded-full pl-3.5 pr-4 py-2.5 text-xs font-semibold transition-colors" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: CARD_ACCENT }}>
                <TargetIcon /> Fine-tune your plan
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
