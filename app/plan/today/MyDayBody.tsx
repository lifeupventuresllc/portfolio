import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import ProgressViewToggle from '@/components/ProgressViewToggle'
import LifePatternCard from '@/components/LifePatternCard'
import PlanEvolutionCard from '@/components/PlanEvolutionCard'
import ClientMenu from '@/components/ClientMenu'
import RebuildPlanButton from '@/components/RebuildPlanButton'
import ProgressNew, { type DayDot } from './ProgressNew'
import { streakFrom } from '@/lib/streak'
import { getTimezone, localMondayIndex, localDateISO, localDayNumber } from '@/lib/localdate'
import { affirmationForDay } from '@/lib/affirmations'
import { assessLifePattern, messageForPattern } from '@/lib/fos/pattern'
import { assessStructuralPattern, messageForStructural } from '@/lib/fos/plan-evolution'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { getEffectiveTodayWorkout, getEffectiveCalorieBudget, isEatingOutToday, resolveTodayCalorieTarget, scheduleDayType, workoutTodayStatus, type DayTargets } from '@/lib/fos/effective-plan'
import { shortVersionFor } from '@/lib/workout-short'
import { LIVE_CALL } from '@/lib/live-call'
import { pickFocusDayIndex, type WorkoutProgram, type FocusArea } from '@/lib/workout'
import type { WeekPlan } from '@/lib/meal-plan'

// My Day's Today/Progress body, shared by /plan/today and Home's first screen
// (2026-10-26, Asa: "progress should be the first thing once they created an
// account"). One server component, two places — never a second copy.
//  - where="today": "← HOME" + menu on top, toggle remembers her last pick.
//  - where="home": "HEY MAYA" + streak on top, toggle always opens on
//    Progress (Today one tap away), fits inside Home's swipe screen.
// Only for someone with a finished intake; both pages handle the rest.
export type MyDayEnrollment = { id: string; name?: string | null; tier?: string | null }

export default async function MyDayBody({ enrollment, user, where, searchParams }: {
  enrollment: MyDayEnrollment
  user: User
  where: 'today' | 'home'
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const svc = createServiceClient()
  const home = where === 'home'
  const firstName = (enrollment.name || user.email?.split('@')[0] || 'there').split(' ')[0]
  const tz = getTimezone()
  const todayIso = localDateISO(tz)
  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: doneRows }, todayAdjustment, { data: intakeRow }, { data: foodRows }, { data: recentWorkoutActions }] = await Promise.all([
    svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('meals, calories, protein_g, day_targets').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('measurements, logged_on').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
    getApprovedTodayAdjustment(enrollment.id as string, todayIso),
    svc.from('challenge_intake').select('form_data, weight_lbs').eq('enrollment_id', enrollment.id).maybeSingle(),
    // Real numbers for the slim nutrition row below (Whoop-mockup match) — the
    // same challenge_food_log table FoodLog itself reads client-side, queried
    // here server-side so the glance row never has to wait on a second
    // client fetch just to show "X cal left."
    svc.from('challenge_food_log').select('calories, protein_g').eq('enrollment_id', enrollment.id).eq('logged_on', todayIso),
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
  const dayTargets = (nutritionPlan?.day_targets as DayTargets) || null
  const scheduledDayType = todayMeals?.dayType ?? scheduleDayType(dayTargets, mealIdx)
  // The real signal from the workout brain — did she actually do (or
  // explicitly skip) a workout today — same doneRows/recentWorkoutActions
  // this page already fetches for the workout card below, read here first so
  // the calorie number can't disagree with what the workout card itself
  // shows just a few lines down.
  const workoutDoneToday = (doneRows || []).some((r) => r.logged_on === todayIso && (r.measurements as { workout?: boolean } | null)?.workout)
  const todaysWorkoutAction = (recentWorkoutActions || []).find((r) => localDateISO(tz, new Date(r.shown_at as string)) === todayIso)
  const workoutSimplifiedToday = !workoutDoneToday && !!(todaysWorkoutAction?.skipped_at || todaysWorkoutAction?.superseded_at)
  const baseCalTarget = resolveTodayCalorieTarget(todayMeals?.target, scheduledDayType, dayTargets, flatCalTarget, workoutTodayStatus(workoutDoneToday, workoutSimplifiedToday))
  // Protein anchors to bodyweight, not day type (buildBlueprint passes the
  // same protein_g into rest AND workout macrosFor calls) — no split needed.
  // Coach Asa adjusted today's calories? Reflect it in the budget — same as /plan's dashboard.
  const calBudget = baseCalTarget != null ? getEffectiveCalorieBudget(baseCalTarget, todayAdjustment) : null
  // Real numbers for the slim nutrition row (Whoop-mockup match) and the
  // hero ring's second half — what she's actually logged today, not what
  // the plan merely intends. foodLoggedToday also feeds the ring below.
  const loggedCalories = (foodRows || []).reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  const calRemaining = calBudget != null ? Math.max(0, calBudget - loggedCalories) : null
  // Real bug fixed 2026-08-28 (Asa's live report): this used to mean "logged
  // ANY food today" — so one small snack lit up the ring's second half and
  // the circle's "done for today" message even with most of her real budget
  // still unspent. With a known budget, "done" now means she actually used
  // it, matching the same real-completion definition the circle's terminal
  // state uses (lib/next-action/candidates.ts's nutritionDoneToday). With no
  // budget to compare against, a real entry still counts.

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
  // workoutDoneToday/todaysWorkoutAction/workoutSimplifiedToday now computed
  // above, before the calorie section, so that number can't disagree with
  // this card — see the comment there.
  // The hero ring's real "1/2" — two genuine today-specific wins (workout,
  // real logged food), not an arbitrary made-up score.
  // The investment loop the app was missing: a real, banked number that makes
  // NOT coming back today feel like a loss. Reuses the exact same streak
  // definition already driving the dashboard chip, Monday memo, dip detection,
  // and leaderboard (see lib/streak.ts) — doneRows above is already every
  // '__daily__' row with no date filter, the same universe streakFrom expects
  // everywhere else. Never a second, drifting streak number.
  const checkinDates = new Set((doneRows || []).map((r) => r.logged_on as string))
  // Real gap found live (Asa's ask, 2026-08-28): a day she genuinely engaged
  // with — did the simplified version, or logged some food — but hasn't hit
  // either full "done," used to look IDENTICAL to a day she did nothing at
  // all: a flat, unlit ring and a nag to start the very workout she already
  // consciously chose to simplify. Effort she actually put in deserves to
  // read differently from a blank day, without inflating dailyScore itself
  // (that number still has to mean what it says — see bug #15).
  const showedUpToday = checkinDates.has(todayIso) || workoutSimplifiedToday
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

  // HUD redesign (2026-09-04, Asa's pick after a published mockup comparison
  // — the "video game" direction over the plain isolated one): green now
  // reused verbatim from components/FoodLog.tsx's own ACCENT/CARD_BG/ring-
  // gradient constants, not an invented palette, so this page finally
  // matches the nutrition screen instead of running its own gold identity.
  // ← Home stays gold on purpose (see the pre-intake branch above and
  // app/plan/nutrition/page.tsx) — that's nav chrome, already consistent
  // across every page today, untouched by this recolor.
  // ---- Progress tab (2026-10-25): her real week ----
  const isoAdd = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
  const monday = isoAdd(todayIso, -mealIdx)
  const sunday = isoAdd(monday, 6)
  const [{ data: weekFood }, { data: lastWeigh }] = await Promise.all([
    svc.from('challenge_food_log').select('calories, logged_on').eq('enrollment_id', enrollment.id).gte('logged_on', monday).lte('logged_on', sunday),
    svc.from('challenge_progress').select('weight_lbs').eq('enrollment_id', enrollment.id).not('weight_lbs', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const calByDay = new Map<string, number>()
  for (const f of weekFood || []) calByDay.set(f.logged_on as string, (calByDay.get(f.logged_on as string) || 0) + (Number(f.calories) || 0))
  const workoutDays = new Set((doneRows || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).map((r) => r.logged_on as string))
  // "On target" = she logged food that day and landed within about 10% of
  // her number — never counts a day she logged nothing.
  const onTarget = (iso: string) => { const c = calByDay.get(iso) || 0; return !!flatCalTarget && c >= flatCalTarget * 0.8 && c <= flatCalTarget * 1.1 }
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const days: DayDot[] = DAY_NAMES.map((name, k) => {
    const iso = isoAdd(monday, k), isToday = iso === todayIso, isFuture = iso > todayIso
    const w = workoutDays.has(iso), f = onTarget(iso), cal = calByDay.get(iso) || 0
    const parts: string[] = []
    if (w) parts.push('workout done')
    if (cal) parts.push(`${cal.toLocaleString('en-US')} cal logged${f ? ', on target' : ''}`)
    const text = isFuture ? `${name}: already planned for you.`
      : parts.length ? `${name}: ${parts.join('. ')}.`
      : isToday ? `${name}: today. Your plan is ready when you are.` : `${name}: a quiet day. That's okay, you came back.`
    return { label: name[0], iso, workout: w, foodOnTarget: f, isToday, isFuture, text }
  })
  const workoutsDone = days.filter((d) => d.workout).length
  const workoutsGoal = Math.max(workoutsDone, program?.daysPerWeek || numDays || 3)
  const foodDays = days.filter((d) => d.foodOnTarget).length
  const startWeight = Number(intakeRow?.weight_lbs) || null
  const lastWeight = Number(lastWeigh?.weight_lbs) || null
  const weightChange = startWeight && lastWeight ? Math.round((lastWeight - startWeight) * 10) / 10 : null
  const streak = streakFrom(checkinDates, todayIso)
  const fd = (intakeRow?.form_data || {}) as { payoffs?: string[]; why_own?: string }
  const WHY_TITLE: Record<string, string> = { energy: 'For your energy.', kids: 'For your kids.', mood: 'For your peace of mind.', family: 'For your family.', look: 'For you, feeling good in your skin.', health: 'For your health.', confidence: 'For your confidence.' }
  const firstPayoff = (fd.payoffs || []).find((p) => WHY_TITLE[p])
  const showUps = workoutsDone ? `${workoutsDone} workout${workoutsDone === 1 ? '' : 's'} this week is ${workoutsDone} time${workoutsDone === 1 ? '' : 's'} you showed up.` : 'Every workout this week is you showing up for it.'
  const why = fd.why_own ? { title: `“${fd.why_own}”`, line: showUps } : firstPayoff ? { title: WHY_TITLE[firstPayoff], line: showUps } : null

  // ---- Today tab look ----
  const INK = '#EDE7DA', GOLD = '#E5A93C', BG = '#021F16', MUTE = 'rgba(237,231,218,.72)'
  const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
  const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
  const label = (t: string, c = GOLD) => <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: c }}>{t}</span>
  const tomorrowWorkout = program ? getEffectiveTodayWorkout(program, completed + 1, null, undefined) : null
  const workoutName = (todayWorkout?.title || '').replace(/^Day \d+:\s*/, '')
  const onTrack = workoutDoneToday || showedUpToday || (calBudget != null && loggedCalories > 0 && loggedCalories <= calBudget * 1.1)

  const selfTalk = affirmationForDay(localDayNumber(tz))
  return (
    <div className="px-4 flex flex-col"
      style={{
        // Home: sits inside HomeSwipe's own scroll area, so no page min-height
        // and a top pad that clears the iPhone notch.
        ...(home ? { paddingTop: 'calc(16px + env(safe-area-inset-top))' } : { paddingTop: 24, minHeight: 'calc(100dvh - 4.5rem - env(safe-area-inset-bottom))' }),
        background: BG, color: INK, fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
      }}>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-3 mb-4" style={{ flex: '0 0 auto' }}>
          {home ? (
            // Her name + streak, small (2026-10-26, kept from the old win screen).
            <span className="flex items-center gap-2 min-w-0">
              <span className="truncate" style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: '.14em', color: INK }}>HEY {firstName.toUpperCase()}</span>
              {streak >= 1 && (
                <span className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: 'rgba(229,169,60,.14)', border: '1px solid rgba(229,169,60,.45)', color: GOLD, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.08em' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={GOLD} aria-hidden><path d="M12 2c1 4 5 5 5 10a5 5 0 01-10 0c0-3 2-4 2-7 2 1 3 2 3 4 0-3 0-5 0-7z" /></svg>
                  {streak}-DAY STREAK
                </span>
              )}
            </span>
          ) : (
            <Link href="/plan" className="nf-press inline-flex items-center gap-1.5 h-11 px-4 rounded-full" style={{ background: 'rgba(237,231,218,.1)', color: INK, fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em' }}>← HOME</Link>
          )}
          <ClientMenu firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} isAnonymous={!!user.is_anonymous} />
        </div>

        {/* Today's self-talk (2026-10-26, Asa: "what happened to the self
            talk… should show up when she sees her progress, and on the win
            for today page too"). Above the toggle, so both tabs have it. */}
        {selfTalk && (
          <div className="nf-rise mb-4 rounded-[20px] px-4 py-3" style={{ background: 'rgba(229,169,60,.1)', borderLeft: `4px solid ${GOLD}` }}>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.16em', color: GOLD }}>TODAY&apos;S SELF-TALK</span>
            <p className="mt-1 text-balance" style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 22, lineHeight: 1.05, color: INK }}>&ldquo;{selfTalk}&rdquo;</p>
          </div>
        )}

        {patternMessage && <LifePatternCard title={patternMessage.title} body={patternMessage.body} showWorkoutAction={showWorkoutAction} moves={dipMoves} />}
        {structuralMessage && <PlanEvolutionCard title={structuralMessage.title} body={structuralMessage.body} />}

        <ProgressViewToggle
          {...(home ? { initialTab: 'garden' as const, remember: false } : {})}
          garden={<ProgressNew days={days} workoutsDone={workoutsDone} workoutsGoal={workoutsGoal} weightChange={weightChange} startWeight={startWeight} foodDays={foodDays} streak={streak} why={why} />}
          plan={
            // Today (2026-10-25, Asa: "two things today" felt like effort and
            // work) — not a to-do list: everything is already handled for her.
            <div className="pb-6 flex flex-col gap-3.5">
              <div className="px-1 flex flex-col gap-2">
                {onTrack && (
                  <span className="self-start flex items-center gap-1.5 rounded-full px-2.5 py-1.5" style={{ background: 'rgba(110,190,160,.16)', border: '1px solid rgba(110,190,160,.5)', color: '#9FDCC4', fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.1em' }}>
                    <span className="w-[7px] h-[7px] rounded-full" style={{ background: '#9FDCC4' }} />{workoutDoneToday ? 'YOU SHOWED UP TODAY' : "YOU'RE ON TRACK"}
                  </span>
                )}
                <h1 className="nf-head" style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 62, lineHeight: 0.86, textTransform: 'uppercase' }}>Today&apos;s<br />handled.</h1>
                <p className="text-[15px]" style={{ color: 'rgba(237,231,218,.78)' }}>We planned it. You just show up.</p>
              </div>

              {todayWorkout ? (
                <div className="nf-rise rounded-[22px] overflow-hidden" style={{ background: 'rgba(237,231,218,.06)', border: `2px solid ${workoutDoneToday ? GOLD : 'transparent'}`, animationDelay: '.1s' }}>
                  <div className="h-[130px] relative" style={{ backgroundImage: 'url(/_next/image?url=%2Fimages%2Fapp%2Fpexels-8402239.jpg&w=828&q=70)', backgroundSize: 'cover', backgroundPosition: 'center 35%' }}>
                    <span className="absolute left-3 top-3 rounded-full px-2.5 py-1.5" style={{ background: INK, color: BG, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.1em' }}>
                      {workoutDoneToday ? 'DONE. PROUD OF YOU.' : workoutSimplifiedToday ? 'KEPT IT SIMPLE. THAT COUNTS.' : "YOUR WORKOUT'S READY"}
                    </span>
                  </div>
                  <div className="px-3.5 pt-3 pb-3.5 flex items-center justify-between gap-3">
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 26, lineHeight: 1, textTransform: 'uppercase' }}>{workoutName || 'Today\'s workout'}</span>
                      {!workoutDoneToday && todayAdjustment?.workoutChange && (
                        <span className="text-[13px]" style={{ color: GOLD }}>Adjusted: {todayAdjustment.workoutChange.toMinutes ? `${todayAdjustment.workoutChange.toMinutes}-min ` : ''}{todayAdjustment.workoutChange.swapTo || 'adapted for today'}</span>
                      )}
                    </span>
                    {workoutDoneToday ? (
                      <span className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: GOLD }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
                      </span>
                    ) : (
                      <Link href="/plan/workout" className="nf-press h-12 px-5 rounded-full flex items-center shrink-0" style={{ background: GOLD, color: BG, fontFamily: MONO, fontWeight: 700, fontSize: 14, letterSpacing: '.1em' }}>{workoutSimplifiedToday ? 'DO IT ANYWAY' : "LET'S GO"}</Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-[22px] p-5" style={{ background: 'rgba(237,231,218,.06)' }}>
                  <p className="font-semibold mb-1">We hit a snag building your workout</p>
                  <p className="text-sm mb-3" style={{ color: MUTE }}>Shouldn&apos;t take more than a second to fix.</p>
                  <RebuildPlanButton />
                </div>
              )}

              <Link href={eatingOutToday ? '/plan/eating-out' : '/plan/nutrition'} className="nf-press nf-rise rounded-[22px] overflow-hidden flex" style={{ background: 'rgba(237,231,218,.06)', animationDelay: '.2s', color: INK }}>
                <div className="w-[104px] shrink-0" style={{ backgroundImage: 'url(/images/meals/food/bowl.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-1.5 flex-1 min-w-0">
                  {label("YOUR FOOD'S HANDLED")}
                  <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 26, lineHeight: 1, textTransform: 'uppercase' }}>{eatingOutToday ? 'Eating out? Covered.' : 'Your picks are ready'}</span>
                  {calBudget != null && calRemaining != null && (<>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(237,231,218,.12)' }}>
                      <div className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, (loggedCalories / calBudget) * 100))}%`, background: GOLD }} />
                    </div>
                    <span className="text-[13px]" style={{ color: MUTE }}>{calRemaining.toLocaleString('en-US')} cal left, and we&apos;re counting so you don&apos;t.</span>
                  </>)}
                  {calBudget == null && <span className="text-[13px]" style={{ color: MUTE }}>{mealIdx > 5 ? 'Sunday. Eat easy, we picked a few.' : 'Tap to see what we picked.'}</span>}
                </div>
              </Link>
              <Link href="/plan/nutrition/log" className="self-center text-[13px] py-1" style={{ color: 'rgba(237,231,218,.6)' }}>Ate something else? Log it →</Link>

              {tomorrowWorkout && (
                <div className="flex items-center gap-3 rounded-[18px] px-3.5 py-3" style={{ background: 'rgba(237,231,218,.04)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(237,231,218,.6)" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>
                  <span className="text-sm" style={{ color: MUTE }}>Tomorrow&apos;s already planned. Rest easy tonight.</span>
                </div>
              )}
            </div>
          }
        />
      </div>
    </div>
  )
}
