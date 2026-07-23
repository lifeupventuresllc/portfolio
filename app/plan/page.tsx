import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ClientMenu from '@/components/ClientMenu'
import CaloriesTodayCard from '@/components/CaloriesTodayCard'
import WorkoutStatusCard from '@/components/WorkoutStatusCard'
import StreakChip from '@/components/StreakChip'
import CoachHero from '@/components/CoachHero'
import LevelUpNudge from '@/components/LevelUpNudge'
import TimezoneSync from '@/components/TimezoneSync'
import { LIVE_CALL } from '@/lib/live-call'
import { affirmationForDay } from '@/lib/affirmations'
import { localDateISO, localMondayIndex, localDayNumber } from '@/lib/localdate'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import type { WorkoutProgram } from '@/lib/workout'
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

  const shell = (children: React.ReactNode, menu: React.ReactNode = null) => (
    <div className="min-h-screen bg-paper px-4 py-12">
      <TimezoneSync />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 bg-charcoal/80 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4">
          <div>
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Life-Up Fitness</p>
            <h1 className="text-2xl font-bold text-white">Hey {firstName} 👋</h1>
            <StreakChip />
          </div>
          {menu}
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

  // Enrolled but hasn't done intake
  if (!enrollment.intake_completed) {
    return shell(
      <div className="bg-charcoal border border-gold/30 rounded-3xl p-8 text-center">
        <p className="text-white font-semibold mb-2">One step to unlock your plan</p>
        <p className="text-ivory/50 text-sm mb-6">Tell us your stats and goals — we&apos;ll generate your custom workout and calorie-matched meal plan in seconds.</p>
        <Link href="/plan/intake" className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl">Build my plan</Link>
      </div>
    )
  }

  const todayIso = localDateISO()
  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: doneRows }, todayAdjustment] = await Promise.all([
    svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('calories, meals').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('logged_on, measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
    getApprovedTodayAdjustment(enrollment.id as string, todayIso),
  ])

  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null

  // ── TODAY at a glance — powers the simple home dashboard (workout · calories · meals) ──
  // All day-boundaries use the user's LOCAL day (their timezone), not UTC.
  const mealIdx = localMondayIndex() // Mon=0 … Sat=5, Sun=6
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  let calBudget = (todayMeals?.target && todayMeals.target > 0) ? todayMeals.target : (Number(nutritionPlan?.calories) || 0)
  // Coach Asa adjusted today's calories? Reflect it in the budget.
  const calDelta = Number(todayAdjustment?.nutritionChange?.calorieDelta) || 0
  if (calDelta) calBudget = Math.max(0, calBudget + calDelta)
  const todayDayType = todayMeals?.dayType ?? null

  const program = (workoutPlan?.plan as WorkoutProgram) || null
  let todayWorkout: { title: string; muscles?: string[] } | null = null
  if (program) {
    const numDays = program.track === 'home' ? (program.home?.days.length || 1) : (program.gymDays?.length || 1)
    const completed = (doneRows || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
    const startDay = numDays > 0 ? completed % numDays : 0
    if (program.track === 'home') {
      const d = program.home?.days[startDay]
      if (d) todayWorkout = { title: d.title }
    } else {
      const d = program.gymDays?.[startDay]
      if (d) todayWorkout = { title: d.title, muscles: d.muscles }
    }
  }
  const affirmation = affirmationForDay(localDayNumber())

  // Did she already finish today's workout? (server truth for the workout ring's ✅ state)
  const workoutDoneToday = (doneRows || []).some(
    (r) => (r as { logged_on?: string }).logged_on === todayIso && (r.measurements as { workout?: boolean } | null)?.workout
  )

  return shell(
    <div className="space-y-5">
      {/* Conversational home, in strict problem-priority order:
          #1 problem (time/decision fatigue) → Coach Asa decides her day for her.
          #2 problem (craving/consistency without willpower) → the eating-out escape hatch,
          front and center right below, not buried under self-talk/cards. */}

      {/* Coach Asa — the living centerpiece; she talks right here */}
      <CoachHero firstName={firstName} />

      {/* The #2-problem solution, right behind #1 — she never has to figure out what to
          eat when she's off her plan and craving something. */}
      <Link href="/plan/eating-out" className="group flex items-center justify-between gap-3 bg-gradient-to-br from-blue-500/25 to-charcoal bg-charcoal backdrop-blur-md border border-blue-400/40 rounded-2xl px-5 py-3.5 hover:border-blue-400/70 transition-colors">
        <div>
          <p className="text-white font-semibold text-sm">🍔 Away from home right now?</p>
          <p className="text-ivory/60 text-xs mt-0.5">Tap for exactly what to order — no thinking, no searching.</p>
        </div>
        <span className="text-blue-300 text-sm group-hover:translate-x-0.5 transition-transform shrink-0">→</span>
      </Link>

      {/* Self-talk — compact banner */}
      <div className="luf-breathe rounded-2xl border border-emerald-400/20 bg-charcoal bg-gradient-to-br from-emerald-500/10 via-charcoal to-obsidian px-5 py-3.5 text-center">
        <p className="text-emerald-300/70 text-[9px] uppercase tracking-[0.25em] font-semibold mb-1">Today’s self-talk</p>
        <p className="text-white text-[15px] sm:text-base leading-snug font-medium text-balance">“{affirmation}”</p>
      </div>

      {/* Premium upsell — only for App Access members not already coached. Highlighted,
          not first — she's already been shown Coach Asa + the eating-out escape hatch,
          this is the "go deeper" door, not the front door. */}
      {enrollment.tier === 'app' && (
        <Link href="/challenge" className="group block rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/15 to-charcoal bg-charcoal px-5 py-4 hover:border-gold/60 transition-colors">
          <p className="text-gold text-[9px] uppercase tracking-[0.25em] font-semibold mb-1">The 6-Week Challenge</p>
          <p className="text-white font-semibold text-sm mb-1">Want me personally checking in on you every week?</p>
          <p className="text-ivory/60 text-xs">
            You&apos;ve got the app solving the time/decisions and the cravings/willpower for you already —
            add me on video and I&apos;ll make sure it sticks. See the full breakdown →
          </p>
        </Link>
      )}

      {/* Supporting, side by side — calories (left) · workout (right) */}
      <div className="grid grid-cols-2 gap-3.5">
        <CaloriesTodayCard budget={calBudget} dayType={todayDayType} compact />
        <WorkoutStatusCard title={todayWorkout?.title ?? null} muscles={todayWorkout?.muscles} doneTodayServer={workoutDoneToday} adjusted={todayAdjustment?.workoutChange ?? null} compact />
      </div>

      {/* Infrequent — only renders itself when she's actually eligible */}
      <LevelUpNudge />
    </div>,
    <ClientMenu key="menu" firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} />
  )
}
