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
import type { WorkoutProgram } from '@/lib/workout'
import type { WeekPlan } from '@/lib/meal-plan'

export const dynamic = 'force-dynamic'

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
  // the optional intake pass she skipped to get here fast. Disappears for good once done.
  const profileNeedsFinishing = !(intakeRow?.form_data as { optional_completed?: boolean } | null)?.optional_completed

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
  const startDay = numDays > 0 ? completed % numDays : 0
  // Approved cardio swap already reflected in the title — see effective-plan.ts.
  const todayWorkout = getEffectiveTodayWorkout(program, completed, todayAdjustment)

  // Layer 1's primary feature, unified: reads across every behavioral signal
  // already being collected (workout, food logging, app-open silence,
  // eating-out frequency, chat-reported stress, calendar) as ONE combined
  // read instead of separate siloed checks — a real rough patch shows up as
  // a combination, not one clean threshold crossing. See lib/fos/pattern.ts.
  const patternAssessment = await assessLifePattern(enrollment.id as string, localDateISO(tz))
  const dipMoves = patternAssessment.isDip && program ? shortVersionFor(program, startDay) : []
  const patternMessage = patternAssessment.isDip ? messageForPattern(patternAssessment) : null
  const showWorkoutAction = dipMoves.length > 0 && patternAssessment.signals.includes('workout_dip')

  // Layer 1 Phase 5: the longer-horizon counterpart to the acute pattern
  // engine above — a real 3-week pattern means the plan itself doesn't
  // match her life anymore, not just a rough day. Never rewrites anything
  // without her approval. See lib/fos/plan-evolution.ts.
  const structuralAssessment = await assessStructuralPattern(enrollment.id as string, localDateISO(tz))
  const structuralMessage = messageForStructural(structuralAssessment)

  // For You page — deliberately the reverse of the main dashboard's palette:
  // dashboard is a dark-emerald field with mustard accents, this is a mustard
  // field with emerald accents. Asa's direct request, not a mockup pass.
  const ACCENT = '#044A34'
  const INK = '#021F16'
  const MUTED = 'rgba(2,31,22,0.55)'

  return (
    <div className="min-h-[100dvh] px-4 py-6" style={{ background: '#E5A93C' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link href="/plan" className="inline-flex items-center gap-1.5 bg-white text-sm font-semibold px-4 py-2.5 rounded-full active:scale-95 transition-all" style={{ border: `1px solid ${ACCENT}`, color: ACCENT }}>← Home</Link>
          <ClientMenu firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} />
        </div>
        <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-1" style={{ color: ACCENT }}>{weekdayLabel}</p>
        <h1 className="font-bold mb-6" style={{ color: INK, fontFamily: 'Georgia, "Times New Roman", ui-serif, serif', fontSize: 'clamp(1.75rem, 6vw, 2.25rem)' }}>Today, {firstName}</h1>

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
            <Link href="/plan/eating-out" className="group flex items-center justify-between gap-3 bg-white rounded-2xl px-5 py-4 transition-colors" style={{ border: `1px solid ${ACCENT}33` }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: INK }}>Away from home right now?</p>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>Tap for exactly what to order — no thinking, no searching.</p>
              </div>
              <span className="text-sm group-hover:translate-x-0.5 transition-transform shrink-0" style={{ color: ACCENT }}>→</span>
            </Link>
          )}

          {/* Food log — the heartbeat of the daily view. Budget = TODAY'S calorie target
              (workout days higher, rest days lower); the app already knows which day this is. */}
          <FoodLog planned={planned} budget={calBudget} dayType={todayMeals?.dayType ?? null} />

          {/* Today's planned meals — kept to one line + an edit link, not a
              second itemized list. FoodLog above already shows every planned
              meal (tap to log), so repeating name/cal/protein for each one
              again here was the same numbers twice in a row. */}
          <section>
            {eatingOutToday ? (
              <Link href="/plan/eating-out" className="group flex items-center justify-between gap-3 bg-white rounded-2xl p-5 transition-colors" style={{ border: `1px solid ${ACCENT}33` }}>
                <div>
                  <span className="inline-block text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold mb-2" style={{ background: `${ACCENT}1A`, color: ACCENT }}>Eat-out day</span>
                  <p className="font-semibold text-sm" style={{ color: INK }}>See exactly what to order</p>
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>No thinking, no searching — picked for you, budget-matched.</p>
                </div>
                <span className="text-sm group-hover:translate-x-0.5 transition-transform shrink-0" style={{ color: ACCENT }}>→</span>
              </Link>
            ) : todayMeals ? (
              <div className="bg-white rounded-2xl p-5 flex items-center justify-between gap-3" style={{ border: `1px solid ${ACCENT}33` }}>
                <div>
                  <span className="inline-block text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold mb-1.5" style={{ background: `${ACCENT}1A`, color: ACCENT }}>
                    {todayMeals.dayType === 'workout' ? 'Workout day' : 'Rest day'}
                  </span>
                  <p className="text-sm" style={{ color: MUTED }}>Target {todayMeals.target} cal · {todayMeals.totalProtein}g protein planned</p>
                </div>
                <Link href="/plan/meals" className="text-xs font-semibold shrink-0" style={{ color: ACCENT }}>Edit my meals →</Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 text-center" style={{ border: `1px solid ${ACCENT}33` }}>
                <p className="font-semibold mb-1" style={{ color: INK }}>{mealIdx > 5 ? 'Sunday — recovery & reset' : 'No meal plan yet'}</p>
                <p className="text-sm mb-3" style={{ color: MUTED }}>{mealIdx > 5 ? 'No cook plan today. Eat mindful, hit your protein, and log whatever you have above.' : 'Build this week’s meals and they’ll show up here each day.'}</p>
                {mealIdx <= 5 && <Link href="/plan/meals" className="inline-block px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-xl text-white" style={{ background: ACCENT }}>Build my meals</Link>}
              </div>
            )}
          </section>

          {/* Today's workout */}
          <section>
            {todayWorkout ? (
              <div className="bg-white rounded-2xl p-5 flex items-center justify-between gap-4" style={{ border: `1px solid ${ACCENT}33` }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: INK }}>{todayWorkout.title}</p>
                  {todayWorkout.muscles?.length ? <p className="text-xs mt-0.5" style={{ color: MUTED }}>{todayWorkout.muscles.join(' · ')}</p> : null}
                  {todayAdjustment?.workoutChange && (
                    <p className="text-[11px] mt-1 font-semibold" style={{ color: ACCENT }}>Adjusted: {todayAdjustment.workoutChange.toMinutes ? `${todayAdjustment.workoutChange.toMinutes}-min ` : ''}{todayAdjustment.workoutChange.swapTo || 'adapted for today'}</p>
                  )}
                </div>
                <Link href="/plan/workout" className="luf-pulse shrink-0 inline-flex items-center gap-1.5 text-white px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl hover:scale-[1.03] transition-transform" style={{ background: ACCENT }}>▶ Start</Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 text-center" style={{ border: `1px solid ${ACCENT}33` }}>
                <p className="font-semibold mb-1" style={{ color: INK }}>We hit a snag building your workout</p>
                <p className="text-sm mb-3" style={{ color: MUTED }}>Shouldn&apos;t take more than a second to fix.</p>
                <RebuildPlanButton />
              </div>
            )}
          </section>

          {/* Coach access lives here now instead of its own tab — she should
              never feel like reaching Asa takes more than one tap from Today. */}
          <Link href="/plan/coach" className="flex items-center justify-between gap-3 bg-white rounded-2xl px-5 py-4 transition-colors" style={{ border: `1px solid ${ACCENT}33` }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: INK }}>Talk to Coach Asa</p>
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>Tell me about your day, ask a question, book a call.</p>
            </div>
            <span className="text-sm shrink-0" style={{ color: ACCENT }}>→</span>
          </Link>

          {/* Moved here from /plan's dashboard (2026-08-12 redesign) — infrequent,
              only renders itself when she's actually eligible. */}
          <LevelUpNudge />

          {/* Moved here from /plan's dashboard (2026-08-12 redesign) — one-time
              invite, disappears for good once she finishes the optional pass. */}
          {profileNeedsFinishing && (
            <Link href="/plan/intake?tier=optional" className="group flex items-center justify-between gap-3 bg-white rounded-2xl px-5 py-3.5 transition-colors" style={{ border: `1px solid ${ACCENT}33` }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: INK }}>Fine-tune your plan — 60 seconds</p>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>A few more details (schedule, food likes, injuries) makes it fit even better.</p>
              </div>
              <span className="text-sm group-hover:translate-x-0.5 transition-transform shrink-0" style={{ color: ACCENT }}>→</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
