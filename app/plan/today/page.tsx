import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import FoodLog, { type PlannedItem } from '@/components/FoodLog'
import type { WorkoutProgram } from '@/lib/workout'
import type { WeekPlan } from '@/lib/meal-plan'

export const dynamic = 'force-dynamic'

const SLOT_LABEL: Record<string, string> = { BF: 'Breakfast', LN: 'Lunch', SN: 'Snack', DN: 'Dinner', DS: 'Dessert' }

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

  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: doneRows }] = await Promise.all([
    svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('meals').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
  ])

  const now = new Date()
  const weekdayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const mealIdx = (now.getDay() + 6) % 7 // Mon=0 … Sat=5, Sun=6

  // Today's meals from the weekly plan (Mon–Sat). Sunday = recovery, no cook plan.
  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  const planned: PlannedItem[] = (todayMeals?.meals || []).map((m) => ({ slot: m.slot, name: m.name, cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat }))

  // Today's workout — same rotation as the session player (by # workouts finished).
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

  return (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/plan" className="text-ivory/40 text-xs hover:text-gold mb-2 inline-block">← My full plan</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">{weekdayLabel}</p>
        <h1 className="text-3xl font-bold text-white mb-6">Today, {firstName}</h1>

        <div className="space-y-6">
          {/* Food log — the heartbeat of the daily view. Budget = TODAY'S calorie target
              (workout days higher, rest days lower); the app already knows which day this is. */}
          <FoodLog planned={planned} budget={todayMeals?.target ?? null} dayType={todayMeals?.dayType ?? null} />

          {/* Today's planned meals */}
          <section>
            <h2 className="text-white font-bold text-lg mb-3">What&apos;s on your plan today</h2>
            {todayMeals ? (
              <div className="bg-charcoal border border-smoke rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ${todayMeals.eatOut ? 'bg-blue-500/15 text-blue-300' : todayMeals.dayType === 'workout' ? 'bg-gold/15 text-gold' : 'bg-white/8 text-ivory/60'}`}>
                    {todayMeals.eatOut ? 'Eat-out day' : todayMeals.dayType === 'workout' ? 'Workout day' : 'Rest day'}
                  </span>
                  <span className="text-ivory/40 text-xs">Target {todayMeals.target} cal · {todayMeals.totalProtein}g protein planned</span>
                </div>
                <div className="space-y-2">
                  {todayMeals.meals.map((m, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-smoke/50 last:border-0 pb-2 last:pb-0">
                      <div>
                        <p className="text-ivory/40 text-[10px] uppercase tracking-wider">{SLOT_LABEL[m.slot]}</p>
                        <p className="text-white text-sm font-medium">{m.name}</p>
                      </div>
                      <p className="text-ivory/50 text-xs whitespace-nowrap">{m.cal} cal · {m.protein}g P</p>
                    </div>
                  ))}
                </div>
                <Link href="/plan/meals" className="text-ivory/40 text-xs hover:text-gold mt-3 inline-block">Edit my meals →</Link>
              </div>
            ) : (
              <div className="bg-charcoal border border-smoke rounded-2xl p-6 text-center">
                <p className="text-white font-semibold mb-1">{mealIdx > 5 ? 'Sunday — recovery & reset 🌿' : 'No meal plan yet'}</p>
                <p className="text-ivory/50 text-sm mb-3">{mealIdx > 5 ? 'No cook plan today. Eat mindful, hit your protein, and log whatever you have above.' : 'Build this week’s meals and they’ll show up here each day.'}</p>
                {mealIdx <= 5 && <Link href="/plan/meals" className="inline-block bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-xl">Build my meals</Link>}
              </div>
            )}
          </section>

          {/* Today's workout */}
          <section>
            <h2 className="text-white font-bold text-lg mb-3">Today&apos;s training</h2>
            {todayWorkout ? (
              <div className="bg-charcoal border border-gold/30 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-semibold text-sm">{todayWorkout.title}</p>
                  {todayWorkout.muscles?.length ? <p className="text-ivory/50 text-xs mt-0.5">{todayWorkout.muscles.join(' · ')}</p> : null}
                </div>
                <Link href="/plan/workout" className="luf-pulse shrink-0 inline-flex items-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl hover:scale-[1.03] transition-transform">▶ Start</Link>
              </div>
            ) : (
              <p className="text-ivory/50 text-sm">Your workout is being prepared. Refresh in a moment.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
