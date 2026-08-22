import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import FoodLog, { type PlannedItem } from '@/components/FoodLog'
import LifePatternCard from '@/components/LifePatternCard'
import PlanEvolutionCard from '@/components/PlanEvolutionCard'
import ClientMenu from '@/components/ClientMenu'
import RebuildPlanButton from '@/components/RebuildPlanButton'
import MondayMemo from '@/components/MondayMemo'
import LevelUpNudge from '@/components/LevelUpNudge'
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

// Plain outline glyphs, never emoji — standing style rule (see CoachOrbLauncher's
// ExitIcon for the same stroke/weight convention this matches).
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

export default async function TodayView() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/today')

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
  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: doneRows }, todayAdjustment, { data: intakeRow }] = await Promise.all([
    svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('meals').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('measurements, logged_on').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
    getApprovedTodayAdjustment(enrollment.id as string, todayIso),
    svc.from('challenge_intake').select('form_data').eq('enrollment_id', enrollment.id).maybeSingle(),
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
  const planned: PlannedItem[] = (todayMeals?.meals || []).map((m) => ({ slot: m.slot, name: m.name, cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat }))

  // Coach Asa adjusted today's calories? Reflect it in the budget — same as /plan's dashboard.
  const calBudget = todayMeals?.target != null ? getEffectiveCalorieBudget(todayMeals.target, todayAdjustment) : null

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
  // Real gap found live: this card (the one the bottom-tab nav actually lands
  // on) had zero focus-area awareness, same class of bug as /plan's dashboard
  // card and /plan/workout — a chat-approved or cold-start-built "focus on
  // my X" request never showed up here either. Same resolved-focus logic as
  // those two surfaces: an approved override wins, else (only before her
  // first completed workout) her freshly-stored focus preference.
  const effectiveFocusArea = todayAdjustment?.workoutChange?.focusOverride
    || (completed === 0 && intakeFormData?.focus_area && intakeFormData.focus_area !== 'overall' ? intakeFormData.focus_area : undefined)
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

  // For You page — page field is the dashboard's own forest ground
  // (#021F16), same as /plan itself, so the two pages read as one
  // continuous app. Real course-correction, live: the cards themselves went
  // through a "Gold Flip" recolor first (matching a gold-mustard mockup Asa
  // picked), but he then asked for that gold treatment to be scoped to ONLY
  // the calorie budget card (FoodLog.tsx, left as gold on purpose) — every
  // other card here reverts to the dashboard's own actual card style
  // (emerald gradient, gold border/glow, white text) instead, so this page
  // matches /plan's real boxes, not a page-wide gold reskin.
  const ACCENT = '#E5A93C'
  const INK = '#021F16'
  const CARD_BG = 'linear-gradient(135deg, #0d3a2a, #044A34 60%, #08281d)'
  const CARD_BORDER = '1px solid rgba(229,169,60,0.4)'
  const CARD_GLOW = '0 0 16px -4px rgba(229,169,60,0.4)'
  const CARD_TEXT = '#ffffff'
  const CARD_MUTED = 'rgba(237,231,218,0.65)'
  const CARD_ACCENT = '#E5A93C'
  // Simplify pass: every card on this page repeated this same three-property
  // style object by hand — the actual friction that made scoping the gold
  // recolor to just the budget card require several rounds of careful
  // find-and-replace instead of one change. One definition, used everywhere.
  const cardStyle = { background: CARD_BG, border: CARD_BORDER, boxShadow: CARD_GLOW }

  return (
    <div className="min-h-[100dvh] px-4 py-6" style={{ background: '#021F16' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link href="/plan" className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full active:scale-95 transition-all" style={{ background: '#0d3a2a', border: `1px solid rgba(229,169,60,0.4)`, color: ACCENT }}>← Home</Link>
          <ClientMenu firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} />
        </div>
        <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-1" style={{ color: ACCENT }}>{weekdayLabel}</p>
        <h1 className="font-bold mb-6" style={{ color: '#ffffff', fontFamily: 'Georgia, "Times New Roman", ui-serif, serif', fontSize: 'clamp(1.75rem, 6vw, 2.25rem)' }}>Today{hasRealName ? `, ${firstName}` : ''}</h1>

        <div className="space-y-6">
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

          {/* Food log — the heartbeat of the daily view. Budget = TODAY'S calorie target
              (workout days higher, rest days lower); the app already knows which day this is.
              Layout-simplify pass (Option A, Asa's pick): the old standalone "today's
              meals" card merged into this one as a single status row instead of a
              second full card saying nearly the same thing the budget ring already
              implies — fewer full-width blocks to scroll past, same information. */}
          <FoodLog
            planned={planned} budget={calBudget} dayType={todayMeals?.dayType ?? null}
            mealStatus={
              eatingOutToday ? { kind: 'eatingOut' }
                : todayMeals ? { kind: 'planned', totalProtein: todayMeals.totalProtein }
                : { kind: 'empty', isSunday: mealIdx > 5 }
            }
          />

          {/* Today's workout */}
          <section>
            {todayWorkout ? (
              <div className="rounded-2xl p-5 flex items-center justify-between gap-4" style={cardStyle}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: CARD_TEXT }}>{todayWorkout.title}</p>
                  {todayWorkout.muscles?.length ? <p className="text-xs mt-0.5" style={{ color: CARD_MUTED }}>{todayWorkout.muscles.join(' · ')}</p> : null}
                  {todayAdjustment?.workoutChange && (
                    <p className="text-[11px] mt-1 font-semibold" style={{ color: CARD_ACCENT }}>Adjusted: {todayAdjustment.workoutChange.toMinutes ? `${todayAdjustment.workoutChange.toMinutes}-min ` : ''}{todayAdjustment.workoutChange.swapTo || 'adapted for today'}</p>
                  )}
                </div>
                <Link href="/plan/workout" className="luf-pulse shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl hover:scale-[1.03] transition-transform" style={{ background: CARD_ACCENT, color: INK }}>▶ Start</Link>
              </div>
            ) : (
              <div className="rounded-2xl p-5 text-center" style={cardStyle}>
                <p className="font-semibold mb-1" style={{ color: CARD_TEXT }}>We hit a snag building your workout</p>
                <p className="text-sm mb-3" style={{ color: CARD_MUTED }}>Shouldn&apos;t take more than a second to fix.</p>
                <RebuildPlanButton />
              </div>
            )}
          </section>

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
            <Link href="/plan/coach" className="inline-flex items-center gap-2 rounded-full pl-3.5 pr-4 py-2.5 text-xs font-semibold transition-colors" style={{ background: 'rgba(229,169,60,0.1)', border: '1px solid rgba(229,169,60,0.3)', color: CARD_ACCENT }}>
              <ChatIcon /> Coach Asa
            </Link>
            {needsRequiredTier && (
              <Link href="/plan/intake" className="inline-flex items-center gap-2 rounded-full pl-3.5 pr-4 py-2.5 text-xs font-semibold transition-colors" style={{ background: 'rgba(229,169,60,0.1)', border: '1px solid rgba(229,169,60,0.3)', color: CARD_ACCENT }}>
                <TargetIcon /> Set your real goal
              </Link>
            )}
            {needsOptionalTier && (
              <Link href="/plan/intake?tier=optional" className="inline-flex items-center gap-2 rounded-full pl-3.5 pr-4 py-2.5 text-xs font-semibold transition-colors" style={{ background: 'rgba(229,169,60,0.1)', border: '1px solid rgba(229,169,60,0.3)', color: CARD_ACCENT }}>
                <TargetIcon /> Fine-tune your plan
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
