import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ProgressViewToggle from '@/components/ProgressViewToggle'
import BuilderView from '@/components/BuilderView'
import LifePatternCard from '@/components/LifePatternCard'
import PlanEvolutionCard from '@/components/PlanEvolutionCard'
import ClientMenu from '@/components/ClientMenu'
import RebuildPlanButton from '@/components/RebuildPlanButton'
import StreakChip from '@/components/StreakChip'
import { getTimezone, localMondayIndex, localDateISO } from '@/lib/localdate'
import { assessLifePattern, messageForPattern } from '@/lib/fos/pattern'
import { assessStructuralPattern, messageForStructural } from '@/lib/fos/plan-evolution'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { getEffectiveTodayWorkout, getEffectiveCalorieBudget, isEatingOutToday } from '@/lib/fos/effective-plan'
import { shortVersionFor } from '@/lib/workout-short'
import { LIVE_CALL } from '@/lib/live-call'
import { pickFocusDayIndex, type WorkoutProgram, type FocusArea } from '@/lib/workout'
import type { WeekPlan } from '@/lib/meal-plan'

export const dynamic = 'force-dynamic'

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

  const firstName = (enrollment.name || user.email?.split('@')[0] || 'there').split(' ')[0]

  // Real bug found live, 2026-09-03 (Asa's report): this used to silently
  // redirect('/plan') for anyone without a completed intake — a brand-new
  // anonymous visitor has no intake by definition, so tapping "For You" as
  // one of her first taps in the app just bounced her straight back to
  // Home with zero explanation, reading as "this tab does nothing" or "this
  // is broken." This page's real content (progress trends, today's workout
  // rotation, the weekly meal plan) genuinely needs real intake data to
  // mean anything — unlike the main dashboard fix, there's no safe way to
  // render the full page with nothing to show. So instead of a silent
  // bounce, she gets an honest, on-brand prompt right here explaining why
  // and a clear way forward, matching this page's own header chrome so it
  // still feels like a real screen, not a dead end.
  if (!enrollment.intake_completed) {
    return (
      <div className="px-4 pt-6 min-h-[100dvh]" style={{ background: '#0b1712' }}>
        <div className="max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between gap-3 mb-6">
            <Link href="/plan" className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full active:scale-95 transition-all" style={{ background: '#12241a', border: '1px solid #24402f', color: '#c9a84c' }}>← Home</Link>
            <ClientMenu firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} />
          </div>
          <div className="rounded-3xl p-6 text-center" style={{ background: 'radial-gradient(80% 55% at 50% 28%, rgba(76,175,125,0.30), transparent 62%), radial-gradient(140% 100% at 50% 115%, rgba(0,0,0,0.82), transparent 55%), linear-gradient(180deg, #073322 0%, #021F16 45%, #010b07 100%)', border: '1px solid rgba(76,175,125,0.22)', boxShadow: '0 20px 40px -20px rgba(76,175,125,0.35)' }}>
            <p className="text-white font-semibold text-lg mb-2">Your progress will show up here</p>
            <p className="text-ivory/60 text-sm mb-6">Once your plan&apos;s built — goal, weight, workout style — this becomes your real progress and today&apos;s plan. Takes about 90 seconds.</p>
            <Link href="/plan/intake" className="inline-block px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl" style={{ background: 'linear-gradient(135deg, #7fe6b3, #4CAF7D 60%, #2f8a5c)', color: '#021F16' }}>Build my plan</Link>
          </div>
        </div>
      </div>
    )
  }

  const tz = getTimezone()
  const todayIso = localDateISO(tz)
  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: doneRows }, todayAdjustment, { data: intakeRow }, { data: foodRows }, { data: recentWorkoutActions }] = await Promise.all([
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
  const ACCENT = '#4CAF7D'
  const INK = '#021F16'
  const CARD_BG = 'radial-gradient(80% 60% at 50% 38%, rgba(76,175,125,0.14), transparent 60%), radial-gradient(140% 100% at 50% 115%, rgba(0,0,0,0.7), transparent 55%), linear-gradient(180deg, #06231a 0%, #021F16 45%, #010b07 100%)'
  const CARD_BORDER = '1px solid rgba(76,175,125,0.24)'
  const CARD_GLOW = 'none'
  const CARD_TEXT = '#ffffff'
  const CARD_MUTED = 'rgba(232,223,200,0.62)'
  const CARD_ACCENT = '#4CAF7D'
  // Simplify pass: every card on this page repeated this same three-property
  // style object by hand — the actual friction that made scoping the gold
  // recolor to just the budget card require several rounds of careful
  // find-and-replace instead of one change. One definition, used everywhere.
  const cardStyle = { background: CARD_BG, border: CARD_BORDER, boxShadow: CARD_GLOW }
  // Real, not guessed: the same rotation function the hero ring/session
  // player use, one step ahead in completion count, no adjustment or focus
  // override applied (those are today-only approvals, meaningless for a day
  // that hasn't happened yet) — a locked preview, not an invented label.
  const tomorrowWorkout = program ? getEffectiveTodayWorkout(program, completed + 1, null, undefined) : null

  return (
    // flex column filling the real leftover space after the header/toggle —
    // flex:1 on the toggle's content region hands the Garden branch whatever
    // is actually left, computed every layout pass instead of a guessed
    // `calc(100dvh - Npx)` that goes stale the moment header content changes
    // size on a given device. minHeight subtracts ONE known constant: the
    // 64px `pb-16` app/plan/layout.tsx wraps every /plan/* page in to keep
    // the fixed nav from covering content — without it Garden still comes up
    // ~64px short of the nav even though it correctly fills this div (the
    // gap was one level up, in an ancestor this file doesn't otherwise touch).
    // No bottom padding here (py-6 → pt-6): a shared bottom pad on this same
    // div would eat into Garden's fill the exact same way — the Today branch
    // below adds its own pb-6 directly so its long list still gets breathing
    // room before the nav, without Garden having to fight it.
    <div className="px-4 pt-6 flex flex-col" style={{ minHeight: 'calc(100dvh - 64px)', background: '#0b1712' }}>
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-3 mb-4" style={{ flex: '0 0 auto' }}>
          <Link href="/plan" className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full active:scale-95 transition-all" style={{ background: '#12241a', border: '1px solid #24402f', color: '#c9a84c' }}>← Home</Link>
          <ClientMenu firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} />
        </div>

        {patternMessage && <LifePatternCard title={patternMessage.title} body={patternMessage.body} showWorkoutAction={showWorkoutAction} moves={dipMoves} />}
        {structuralMessage && <PlanEvolutionCard title={structuralMessage.title} body={structuralMessage.body} />}

        <ProgressViewToggle
          garden={<BuilderView />}
          plan={
            <div className="pb-6 space-y-4">
              <div className="flex items-center justify-end">
                {/* The always-visible half of the streak loop — banked progress
                    she'd see, and feel the loss of, every single time she opens
                    this page. Reuses the same chip already live on the
                    dashboard (same /api/plan/daily streak, same component)
                    rather than a second hand-rolled counter. */}
                <StreakChip />
              </div>

              {/* HUD redesign (2026-09-04, Asa's pick after a published mockup
                  comparison): the ring is still the one thing on the page
                  deliberately not boxed in a card, just restyled — Orbitron
                  numerals, a gradient stroke matching FoodLog's own ring, and
                  the "next" text moved into a real quest-plate instead of a
                  plain sentence underneath. workoutDoneToday is a real,
                  today-specific signal, not the cumulative rotation counter. */}
              <section className="flex flex-col items-center text-center py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: ACCENT, fontFamily: 'var(--font-orbitron)' }}>Daily Quest</p>
                {todayWorkout ? (
                  <>
                    <div className="relative w-44 h-44 mb-5">
                      <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 14px rgba(76,175,125,0.5))' }}>
                        <defs>
                          <linearGradient id="todayRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#c8f9dd" />
                            <stop offset="50%" stopColor="#4CAF7D" />
                            <stop offset="100%" stopColor="#164d33" />
                          </linearGradient>
                        </defs>
                        {/* Real gap found live (Asa's ask, 2026-08-28): this track
                            used to read identically on a day she genuinely
                            engaged (simplified her workout, logged some food) and
                            a day she did nothing at all — both flat, unlit gray.
                            A dim accent tint (not the full solid arc dailyScore
                            earns) gives real effort a visibly different look
                            from a blank day, without claiming either slot is
                            actually done. */}
                        <circle cx="50" cy="50" r="45" fill="none" stroke={showedUpToday && dailyScore < 2 ? 'rgba(76,175,125,0.3)' : 'rgba(255,255,255,0.08)'} strokeWidth="5" strokeDasharray="2.2 3.3" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#todayRingGrad)" strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${2 * Math.PI * 45 * (1 - dailyScore / 2)}`} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="font-black" style={{ color: '#eafff2', fontFamily: 'var(--font-orbitron)', fontSize: '2.1rem', textShadow: '0 0 16px rgba(127,230,179,0.7)' }}>{dailyScore}/2</p>
                        <p className="text-[9.5px] uppercase tracking-[0.2em] font-bold mt-1" style={{ color: ACCENT, fontFamily: 'var(--font-orbitron)' }}>
                          {dailyScore < 2 && showedUpToday ? 'showed up today' : 'done today'}
                        </p>
                      </div>
                    </div>
                    <div className="w-full max-w-xs flex items-stretch mb-4" style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(76,175,125,0.24)', clipPath: 'polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)' }}>
                      <div className="w-1 shrink-0" style={{ background: 'linear-gradient(180deg, #7fe6b3, #2f8a5c)' }} />
                      <div className="px-4 py-2.5 text-left" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                        <p className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: '#6fae8e' }}>
                          {workoutDoneToday ? 'Complete' : workoutSimplifiedToday ? 'Simplified' : 'Up next'}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: '#eafff2' }}>
                          {workoutDoneToday
                            ? 'You already showed up today.'
                            // Real gap found live (Asa's ask, 2026-08-28): she
                            // consciously kept today simple via the circle, but
                            // this card — reading its own separate rotation,
                            // not the circle's live decision — kept nagging
                            // her toward the very workout she'd already chosen
                            // not to do, with a pulsing "Start" CTA.
                            // Acknowledge the real choice instead of
                            // contradicting it.
                            : workoutSimplifiedToday ? 'You kept it simple today — that still counts.' : todayWorkout.title}
                        </p>
                      </div>
                    </div>
                    {!workoutDoneToday && !workoutSimplifiedToday && todayAdjustment?.workoutChange && (
                      <p className="text-[11px] mb-3 font-semibold" style={{ color: ACCENT }}>Adjusted: {todayAdjustment.workoutChange.toMinutes ? `${todayAdjustment.workoutChange.toMinutes}-min ` : ''}{todayAdjustment.workoutChange.swapTo || 'adapted for today'}</p>
                    )}
                    {!workoutDoneToday && !workoutSimplifiedToday && (
                      <Link href="/plan/workout" className="luf-pulse w-full max-w-xs inline-flex items-center justify-center gap-1.5 px-4 py-3.5 font-black text-xs uppercase tracking-wider hover:scale-[1.02] transition-transform" style={{ background: 'linear-gradient(135deg, #7fe6b3, #4CAF7D 60%, #2f8a5c)', color: INK, clipPath: 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)', boxShadow: '0 0 24px rgba(76,175,125,0.5)', fontFamily: 'var(--font-orbitron)' }}>▶ Start</Link>
                    )}
                    {workoutSimplifiedToday && !workoutDoneToday && (
                      // Quieter, optional — not the same insistent pulsing CTA a
                      // day she hasn't engaged at all gets. Still real and
                      // reachable, never removed outright (see bug #13: never
                      // leave the real workout unreachable).
                      <Link href="/plan/workout" className="text-xs font-semibold underline underline-offset-2" style={{ color: CARD_MUTED }}>Still want to do it today?</Link>
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

              {/* Calories, promoted to its own primary panel per Asa's keep-list
                  (2026-09-04) — was a one-line glance competing for space with
                  everything else; now the second-biggest thing on the page
                  after the ring, with a real spent/left bar and a one-tap log
                  action instead of only a link to go find one. */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: '#6fae8e', fontFamily: 'var(--font-orbitron)' }}>Calories</p>
                {eatingOutToday ? (
                  <Link href="/plan/eating-out" className="block rounded-2xl px-5 py-4" style={cardStyle}>
                    <span className="text-sm font-semibold" style={{ color: CARD_TEXT }}>Eating out today — see exactly what to order</span>
                  </Link>
                ) : baseCalTarget != null && calBudget != null && calRemaining != null ? (
                  <div className="rounded-2xl px-4 py-4" style={{ background: 'rgba(0,0,0,0.35)', border: CARD_BORDER, clipPath: 'polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)' }}>
                    <div className="flex items-baseline justify-between mb-2.5 gap-2 flex-wrap">
                      <span className="font-black" style={{ color: '#eafff2', fontFamily: 'var(--font-orbitron)', fontSize: '1.35rem', textShadow: '0 0 10px rgba(127,230,179,0.5)' }}>${calRemaining}</span>
                      <span className="text-[11px] font-semibold text-right" style={{ color: '#6fae8e' }}>left of ${calBudget}{baseProteinTarget != null ? ` · ${Math.max(0, baseProteinTarget - loggedProtein)}g protein to go` : ''}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (calRemaining / calBudget) * 100))}%`, background: 'linear-gradient(90deg, #2f8a5c, #4CAF7D, #7fe6b3)' }} />
                    </div>
                    <Link href="/plan/nutrition" className="block text-center py-2.5 rounded-lg text-[11.5px] font-black uppercase tracking-wider" style={{ background: 'rgba(76,175,125,0.14)', border: '1px solid rgba(127,230,179,0.5)', color: '#c8f9dd' }}>+ Log food</Link>
                  </div>
                ) : (
                  <Link href="/plan/nutrition" className="block rounded-2xl px-5 py-4" style={cardStyle}>
                    <span className="text-sm" style={{ color: CARD_MUTED }}>{mealIdx > 5 ? 'Sunday — no cook plan, log whatever you have.' : 'No meal plan yet — tap to build one.'}</span>
                  </Link>
                )}
              </div>

              {/* The zero-decision escape hatch — for the moment she's out, off-plan, and
                  would otherwise have to decide (or skip eating entirely). Hidden when
                  today's already flagged as an eat-out day (the calories panel above
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

              {/* Tomorrow preview (new, 2026-09-04, Asa's ask): same rotation
                  function as the hero ring, one completion ahead, no
                  adjustment/focus override — a real locked-looking teaser,
                  not an invented label. Dashed border + reduced opacity reads
                  as "not actionable yet" without a separate lock icon system. */}
              {tomorrowWorkout && (
                <div className="flex items-center gap-3 rounded-2xl px-5 py-4 opacity-60" style={{ ...cardStyle, borderStyle: 'dashed' }}>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'rgba(232,223,200,0.75)' }}>🔒 Tomorrow · {tomorrowWorkout.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: CARD_MUTED }}>Unlocks in the morning</p>
                  </div>
                </div>
              )}
            </div>
          }
        />
      </div>
    </div>
  )
}
