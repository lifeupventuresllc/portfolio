import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ClientMenu from '@/components/ClientMenu'
import CaloriesTodayCard from '@/components/CaloriesTodayCard'
import WorkoutStatusCard from '@/components/WorkoutStatusCard'
import StreakChip from '@/components/StreakChip'
import CoachHero from '@/components/CoachHero'
import FeedbackCard from '@/components/FeedbackCard'
import GoalProgressBar from '@/components/GoalProgressBar'
import WeeklyCheckinPrompt from '@/components/WeeklyCheckinPrompt'
import VerifyEmailBanner from '@/components/VerifyEmailBanner'
import AnonymousSessionBanner from '@/components/AnonymousSessionBanner'
import TimezoneSync from '@/components/TimezoneSync'
import { LIVE_CALL } from '@/lib/live-call'
import { affirmationForDay } from '@/lib/affirmations'
import { localDateISO, localMondayIndex, localDayNumber, addDaysISO } from '@/lib/localdate'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { getEffectiveTodayWorkout, getEffectiveCalorieBudget } from '@/lib/fos/effective-plan'
import { pickDashboardPhoto } from '@/lib/dashboard-photos'
import type { WorkoutProgram, FocusArea } from '@/lib/workout'
import type { WeekPlan } from '@/lib/meal-plan'

export const dynamic = 'force-dynamic'

export default async function PlanDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan')

  const svc = createServiceClient()

  // Find this member's enrollment (by account, then by email for guest purchases)
  let { data: enrollment } = await svc
    .from('challenge_enrollments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (!enrollment && user.email) {
    const { data: byEmail } = await svc
      .from('challenge_enrollments')
      .select('*')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
      .maybeSingle()
    if (byEmail) {
      if (!byEmail.user_id) await svc.from('challenge_enrollments').update({ user_id: user.id }).eq('id', byEmail.id)
      enrollment = byEmail
    }
  }

  const firstName = (enrollment?.name || user.email?.split('@')[0] || 'there').split(' ')[0]
  // Same real bug as /plan/today and /plan/workout's "Today, there"/"That's
  // done, there" — "there" only reads naturally in an idiomatic "Hey there,"
  // never in a vocative "{name}, how's today looking?" (CoachHero's
  // daily-context greeting). Found live on a fresh guest session.
  const hasRealName = !!(enrollment?.name || user.email)

  const shell = (children: React.ReactNode, menu: React.ReactNode = null, selfTalk?: string) => (
    <div className="min-h-[100dvh] px-4 py-6" style={{ background: '#021F16' }}>
      <TimezoneSync />
      <div className="max-w-3xl mx-auto">
        {user.is_anonymous ? <AnonymousSessionBanner /> : (!user.email_confirmed_at && user.email && <VerifyEmailBanner email={user.email} />)}
        <div className="flex items-center justify-between mb-4 px-1 pt-2">
          <p className="text-[#E5A93C] text-xs font-semibold tracking-[0.25em] uppercase">Life-Up Fitness</p>
          {menu}
        </div>

        <div
          className="rounded-3xl p-5 mb-5"
          style={{
            background: 'linear-gradient(135deg, #0d3a2a, #044A34 60%, #08281d)',
            border: '1.5px solid #E5A93C',
            boxShadow: '0 0 20px -6px rgba(229,169,60,0.35)',
          }}
        >
          <h1 className="font-bold text-white leading-[1.02] tracking-tight mb-1" style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif', fontSize: 'clamp(2rem, 7vw, 2.5rem)' }}>Hey {firstName}</h1>
          <div className="mb-2"><StreakChip /></div>
          {selfTalk && (
            <>
              <p className="text-[#E5A93C] text-[9px] uppercase tracking-[0.22em] font-bold mb-1">Today&apos;s self-talk</p>
              <p className="text-white text-[15px] leading-snug italic text-balance">&ldquo;{selfTalk}&rdquo;</p>
            </>
          )}
        </div>

        {children}
      </div>
    </div>
  )

  // Not enrolled
  if (!enrollment) {
    return shell(
      <div className="bg-charcoal border border-smoke rounded-3xl p-8 text-center">
        <p className="text-white font-semibold mb-2">You&apos;re not enrolled yet</p>
        <p className="text-ivory/50 text-sm mb-6">Join the Snatched Without Starving challenge to unlock your custom plan.</p>
        <Link href="/challenge" className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl">See the challenge</Link>
      </div>
    )
  }

  // Enrolled but hasn't done intake — the real dashboard renders anyway, fully
  // unlocked (Coach Asa, feedback, the menu — everything works, nothing is
  // gated behind a wall or a question). Only the cards that genuinely need real
  // plan numbers show a build-prompt in their place instead of fabricated
  // zeros; see hasPlan below. She can start from any feature — clicking Coach
  // Asa or a feature card builds the real plan via the cold-start flow, and
  // this same page then renders normally on her next visit.
  const hasPlan = !!enrollment.intake_completed

  const todayIso = localDateISO()
  const consistencyWindowStart = addDaysISO(todayIso, -13) // 14 days incl. today, ~2 weeks
  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: doneRows }, todayAdjustment, { data: intakeRow }, { data: latestCheckin }, { data: foodLogRows }] = hasPlan
    ? await Promise.all([
        svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
        svc.from('challenge_nutrition_plans').select('calories, meals').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
        svc.from('challenge_progress').select('logged_on, measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
        getApprovedTodayAdjustment(enrollment.id as string, todayIso),
        svc.from('challenge_intake').select('weight_lbs, target_lbs, goal, days_per_week, form_data').eq('enrollment_id', enrollment.id).maybeSingle(),
        svc.from('challenge_checkins').select('weight_lbs, submitted_at').eq('enrollment_id', enrollment.id).not('weight_lbs', 'is', null).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
        svc.from('challenge_food_log').select('logged_on').eq('enrollment_id', enrollment.id).gte('logged_on', consistencyWindowStart),
      ])
    : [{ data: null }, { data: null }, { data: null }, null, { data: null }, { data: null }, { data: null }] as const

  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null

  // ── TODAY at a glance — powers the simple home dashboard (workout · calories · meals) ──
  // All day-boundaries use the user's LOCAL day (their timezone), not UTC.
  const mealIdx = localMondayIndex() // Mon=0 … Sat=5, Sun=6
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  const baseCalBudget = (todayMeals?.target && todayMeals.target > 0) ? todayMeals.target : (Number(nutritionPlan?.calories) || 0)
  const calBudget = getEffectiveCalorieBudget(baseCalBudget, todayAdjustment)
  const todayDayType = todayMeals?.dayType ?? null

  const program = (workoutPlan?.plan as WorkoutProgram) || null
  const completed = (doneRows || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
  // Same resolved-focus logic as app/plan/workout/page.tsx: an approved chat
  // override wins, otherwise (only before her first completed workout) her
  // freshly-stored focus preference — so this card matches what Coach Asa
  // just told her, not a plain unrelated rotation day.
  const storedFocusArea = (intakeRow?.form_data as { focus_area?: FocusArea } | null)?.focus_area
  const effectiveFocusArea = todayAdjustment?.workoutChange?.focusOverride
    || (completed === 0 && storedFocusArea && storedFocusArea !== 'overall' ? storedFocusArea : undefined)
  const todayWorkout = getEffectiveTodayWorkout(program, completed, todayAdjustment, effectiveFocusArea)
  const affirmation = affirmationForDay(localDayNumber())

  // Real gap found+fixed same session as the calorie-target one: Quickstart
  // (app/api/plan/quickstart-workout) writes a real challenge_intake row with
  // entirely hardcoded stats (165lb, goal 'lose', 10lb target — nothing she's
  // ever told us), same as it used to for nutrition. This progress bar read
  // those numbers directly and showed "165 lbs → 155 lbs goal" as if it were
  // her real starting point. Gated the same way as the calorie fix — only
  // trust these numbers once required_tier_completed is genuinely true (the
  // structured form's real weight/goal questions, or Coach Asa's chat build).
  const statsProvided = !!(intakeRow?.form_data as Record<string, unknown> | null)?.required_tier_completed
  // challenge_intake has no goal_weight_lbs column — it's always derived from
  // weight_lbs +/- target_lbs (a delta, defaults to 10), same as
  // app/api/challenge/intake/route.ts computes it at intake time.
  const startWeight = statsProvided ? Number(intakeRow?.weight_lbs) || 0 : 0
  const targetDelta = Number(intakeRow?.target_lbs) || 10
  const goalWeight = statsProvided ? (intakeRow?.goal === 'gain' ? startWeight + targetDelta : startWeight - targetDelta) : 0
  const currentWeight = statsProvided ? (Number(latestCheckin?.weight_lbs) || startWeight) : 0
  const goalDirection = (intakeRow?.goal === 'gain' || intakeRow?.goal === 'maintain' ? intakeRow.goal : 'lose') as 'lose' | 'gain' | 'maintain'

  // Consistency stat — deliberately separate from the weight math above, never
  // blended into it (a good-effort stretch with a stubborn scale shouldn't make the
  // goal bar lie in the "good" direction). Shown alongside it, smaller, clearly
  // labeled as consistency, not progress. 14-day window: workouts = completed vs.
  // her own planned days/week (capped 100%, no plan yet = 0 rather than divide-by-
  // zero); nutrition = days she logged anything, a real-but-honest proxy for
  // engagement — not strict calorie-budget adherence, which would need reconstructing
  // each historical day's day-type-specific target and isn't worth that complexity
  // for a small dashboard stat.
  const workoutDaysInWindow = new Set(
    (doneRows || [])
      .filter((r) => (r as { logged_on?: string }).logged_on! >= consistencyWindowStart && (r.measurements as { workout?: boolean } | null)?.workout)
      .map((r) => (r as { logged_on?: string }).logged_on)
  ).size
  const plannedPerWeek = Number(intakeRow?.days_per_week) || 0
  const workoutConsistencyPct = plannedPerWeek > 0 ? Math.min(100, Math.round((workoutDaysInWindow / (plannedPerWeek * 2)) * 100)) : 0
  const nutritionDaysLogged = new Set((foodLogRows || []).map((r) => r.logged_on as string)).size
  const nutritionConsistencyPct = Math.min(100, Math.round((nutritionDaysLogged / 14) * 100))

  // Did she already finish today's workout? (server truth for the workout ring's ✅ state)
  const workoutDoneToday = (doneRows || []).some(
    (r) => (r as { logged_on?: string }).logged_on === todayIso && (r.measurements as { workout?: boolean } | null)?.workout
  )

  // Weekly check-in nudge — the goal bar above and Coach Asa's pace-aware replies
  // both depend on real weigh-ins, and nothing was ever prompting her for one (the
  // checkin page is fully opt-in). Due every 7 days from her last real weigh-in, or
  // from enrollment start if she's never checked in — matches the checkin page's
  // own "check in with me every week" copy, not a new cadence invented here.
  const lastCheckinAt = (latestCheckin?.submitted_at as string | undefined) || (enrollment.started_at as string | undefined)
  const daysSinceCheckin = lastCheckinAt ? Math.floor((Date.parse(todayIso) - Date.parse(lastCheckinAt)) / 86400000) : 0
  const checkinDue = hasPlan && daysSinceCheckin >= 7

  return shell(
    <div className="space-y-4">
      {/* Real photography — a person, not just numbers, right under her name
          and self-talk. Coach Asa's launcher sits directly below it as the
          one dominant focus, everything else secondary. */}

      {checkinDue && <WeeklyCheckinPrompt firstName={firstName} todayIso={todayIso} />}

      <Link href="/plan/workout" className="relative block rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(229,169,60,0.22)', height: 300 }}>
        <img src={pickDashboardPhoto()} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'saturate(1.05) contrast(1.03)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,0) 40%, rgba(2,31,22,0.75) 100%)' }} />
        {hasPlan && todayWorkout?.title && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-[#E5A93C] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Today&apos;s workout</p>
            <p className="text-white font-bold text-lg leading-tight">{todayWorkout.title}</p>
          </div>
        )}
      </Link>

      {/* One step, not two — Asa's explicit call comparing directly against
          ChatGPT: the real chat lives right here, always, not behind a
          "tap to open" launcher/modal. CoachHero already works standalone
          (it's the same component the old modal rendered), so this is a
          removal of a wrapping layer, not a rebuild — every existing
          capability (daily-context quiz, quick replies, approve/reject
          adjustment cards, cold-start build → "view my new workout" links)
          comes along unchanged. Real bug found live: a fixed 65vh height
          forced this to full-screen size even with almost no content (just
          the greeting + composer), leaving a huge dead white gap — "way too
          large" on a real phone. max-h only (no min-height) lets the card
          hug its actual content and stay small on a fresh visit, capping
          and scrolling internally only once a real conversation grows past
          it — CoachHero's own max-h-full picks this up (see there). */}
      <div className="max-h-[70vh]">
        <CoachHero firstName={firstName} hasPlan={hasPlan} hasRealName={hasRealName} />
      </div>

      {hasPlan && (
        <>
          {statsProvided ? (
            <GoalProgressBar startWeight={startWeight} currentWeight={currentWeight} goalWeight={goalWeight} goal={goalDirection} workoutConsistencyPct={workoutConsistencyPct} nutritionConsistencyPct={nutritionConsistencyPct} />
          ) : (
            // Same blank-state principle as the calorie card fix — no starting
            // weight/goal on file yet (Quickstart-origin), so there's nothing
            // real to plot. Same visual shape as GoalProgressBar's own card so
            // the layout doesn't jump once she sets her real stats.
            <Link href="/plan/intake" className="block rounded-[2rem] p-5" style={{ background: '#083023', border: '1px solid rgba(229,169,60,0.3)' }}>
              <p className="text-[#E5A93C] text-[10px] uppercase tracking-wider font-semibold mb-1">Your progress</p>
              <p className="text-white font-bold text-lg">Add your starting weight & goal</p>
              <p className="text-white/50 text-sm mt-0.5">90 seconds — then this fills in with your real numbers, not a placeholder.</p>
            </Link>
          )}

          {/* Supporting, side by side — workout (left) · nutrition (right) */}
          <div className="grid grid-cols-2 gap-3.5">
            <WorkoutStatusCard title={todayWorkout?.title ?? null} muscles={todayWorkout?.muscles} doneTodayServer={workoutDoneToday} adjusted={todayAdjustment?.workoutChange ?? null} compact />
            <CaloriesTodayCard budget={calBudget} dayType={todayDayType} compact />
          </div>
        </>
      )}
      {/* The "no plan yet" companion message now lives inside CoachHero itself
          (shown only before a real conversation starts) — having it as a
          separate always-visible card here meant it kept insisting "no plan
          built yet" directly underneath an active, in-progress build
          conversation, which read as the app not noticing what it just asked
          her. Found via a first-time-user pass over a live screenshot. */}

      {/* Persistent feedback surface — always here, not just a popup */}
      <FeedbackCard />
    </div>,
    <ClientMenu key="menu" firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} />,
    affirmation
  )
}
