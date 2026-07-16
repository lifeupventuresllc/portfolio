import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ClientMenu from '@/components/ClientMenu'
import CaloriesTodayCard from '@/components/CaloriesTodayCard'
import { LIVE_CALL } from '@/lib/live-call'
import { affirmationForToday } from '@/lib/affirmations'
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
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Life-Up Fitness</p>
            <h1 className="text-3xl font-bold text-white">Hey {firstName} 👋</h1>
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

  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: doneRows }] = await Promise.all([
    svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('calories, meals').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
  ])

  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null
  const hasMeals = !!(weekPlan?.days?.length)

  // ── TODAY at a glance — powers the simple home dashboard (workout · calories · meals) ──
  const now = new Date()
  const mealIdx = (now.getDay() + 6) % 7 // Mon=0 … Sat=5, Sun=6
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  const calBudget = (todayMeals?.target && todayMeals.target > 0) ? todayMeals.target : (Number(nutritionPlan?.calories) || 0)
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
  const affirmation = affirmationForToday()

  return shell(
    <div className="space-y-8">
      {/* ── SIMPLE HOME DASHBOARD ── daily self-talk + 3 bubbly boxes: workout · calories · meals */}
      {/* Daily affirmation / self-talk */}
      <div className="bg-emerald-500/10 border border-emerald-400/25 rounded-3xl px-5 py-4 flex items-start gap-3">
        <span className="text-xl mt-0.5">💚</span>
        <div>
          <p className="text-emerald-300/80 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Today’s reminder</p>
          <p className="text-white text-sm leading-snug font-medium">{affirmation}</p>
        </div>
      </div>

      {/* 1 — Today's workout (bubbly hero box) */}
      <Link href="/plan/workout" className="luf-glow group block bg-gradient-to-br from-gold/20 to-charcoal border border-gold/40 rounded-[2rem] p-6 hover:border-gold/70 hover:-translate-y-0.5 transition-all">
        <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Today’s workout 💪🏽</p>
        {todayWorkout ? (
          <>
            <p className="text-white font-bold text-xl leading-tight">{todayWorkout.title}</p>
            {todayWorkout.muscles?.length ? <p className="text-ivory/50 text-xs mt-1">{todayWorkout.muscles.join(' · ')}</p> : null}
            <span className="luf-pulse mt-4 inline-flex items-center gap-1.5 bg-gold text-obsidian px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-2xl group-hover:scale-[1.03] transition-transform">▶ Start session</span>
          </>
        ) : (
          <p className="text-ivory/60 text-sm mt-1">Your workout is being prepared — refresh in a moment.</p>
        )}
      </Link>

      {/* 2 — What to eat today (the 3 meals) */}
      <Link href="/plan/today" className="group block bg-gradient-to-br from-charcoal to-obsidian border border-smoke rounded-[2rem] p-6 hover:border-gold/60 hover:-translate-y-0.5 transition-all">
        <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-2">What to eat today 🍽️</p>
        {todayMeals ? (
          <div className="space-y-2.5">
            {todayMeals.meals.slice(0, 3).map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-smoke/40 last:border-0 pb-2.5 last:pb-0">
                <p className="text-white text-sm font-medium truncate">{m.name}</p>
                <p className="text-ivory/40 text-[11px] whitespace-nowrap">{m.cal} cal · {m.protein}g P</p>
              </div>
            ))}
            <p className="text-ivory/40 text-[11px] pt-1 group-hover:text-gold transition-colors">See the full day →</p>
          </div>
        ) : hasMeals ? (
          <p className="text-ivory/60 text-sm">Recovery day 🌿 — eat mindful, hit your protein.</p>
        ) : (
          <p className="text-ivory/60 text-sm">Tap to build this week’s meals →</p>
        )}
      </Link>

      {/* 3 — Calories left today (live) */}
      <CaloriesTodayCard budget={calBudget} dayType={todayDayType} />

    </div>,
    <ClientMenu key="menu" firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} innerCircle={enrollment.tier === 'inner_circle'} />
  )
}
