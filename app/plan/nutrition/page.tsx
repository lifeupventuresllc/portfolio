import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import FoodLog, { type PlannedItem } from '@/components/FoodLog'
import MealPhotoButton from '@/components/MealPhotoButton'
import NutritionPicks, { EatStyleAsk, type PickCard } from '@/components/NutritionPicks'
import { getTimezone, localMondayIndex, localDateISO, localHourNumber } from '@/lib/localdate'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { getEffectiveCalorieBudget, isEatingOutToday, resolveTodayCalorieTarget, resolvedDayType, scheduleDayType, workoutTodayStatus, type DayTargets } from '@/lib/fos/effective-plan'
import type { WeekPlan } from '@/lib/meal-plan'
import { pickMeals, slotForHour, defaultMealBudget, orderDestination, type EatStyle, type MealMemory, type MealSlot } from '@/lib/meal-pick'
import { SHOW_CALORIE_COUNTER } from '@/lib/feature-flags'

export const dynamic = 'force-dynamic'

// The Nutrition tab (2026-10-19, Asa's builder prompt + mockup v3):
// everything food lives here, and its whole job is taking the decision off
// her plate. Top: two meals for THIS meal that fit her calories left, her
// money for one meal, and how she eats (cook vs eat out — two of the same
// kind, never one of each). Below, out of the way: snap a photo or see
// today's full food log (the FoodLog this page always was).
const NEXT_SLOT: Record<MealSlot, MealSlot | null> = { Breakfast: 'Lunch', Lunch: 'Dinner', Dinner: 'Snack', Snack: null }

export default async function NutritionPage() {
  if (!SHOW_CALORIE_COUNTER) redirect('/plan')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/nutrition')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('*').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return <NoPlanYet />

  const tz = getTimezone()
  const todayIso = localDateISO(tz)
  const mealIdx = localMondayIndex(tz)
  const [{ data: nutritionPlan }, { data: intake }, { data: foodRows }, todayAdjustment, { data: todayProgress }, { data: recentWorkoutActions }] = await Promise.all([
    svc.from('challenge_nutrition_plans').select('meals, calories, day_targets').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_intake').select('weight_lbs, weekly_food_budget, food_preferences, dislikes_allergies, form_data').eq('enrollment_id', enrollment.id).maybeSingle(),
    svc.from('challenge_food_log').select('calories, meal').eq('enrollment_id', enrollment.id).eq('logged_on', todayIso),
    getApprovedTodayAdjustment(enrollment.id as string, todayIso),
    // Same real workout-brain signal /plan/today reads, so this page's
    // number never disagrees with the dashboard's.
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__').eq('logged_on', todayIso).maybeSingle(),
    svc.from('next_action_log').select('shown_at, skipped_at, superseded_at').eq('enrollment_id', enrollment.id).eq('kind', 'workout').gte('shown_at', new Date(Date.now() - 2 * 86400000).toISOString()).order('shown_at', { ascending: false }),
  ])

  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  const planned: PlannedItem[] = (todayMeals?.meals || []).map((m) => ({ slot: m.slot, name: m.name, cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat }))
  const workoutDoneToday = !!(todayProgress?.measurements as { workout?: boolean } | null)?.workout
  const todaysWorkoutAction = (recentWorkoutActions || []).find((r) => localDateISO(tz, new Date(r.shown_at as string)) === todayIso)
  const workoutSkippedToday = !workoutDoneToday && !!(todaysWorkoutAction?.skipped_at || todaysWorkoutAction?.superseded_at)
  const workoutStatus = workoutTodayStatus(workoutDoneToday, workoutSkippedToday)
  const dayTargets = (nutritionPlan?.day_targets as DayTargets) || null
  const scheduledDayType = todayMeals?.dayType ?? scheduleDayType(dayTargets, mealIdx)
  const baseCalTarget = resolveTodayCalorieTarget(todayMeals?.target, scheduledDayType, dayTargets, Number(nutritionPlan?.calories) || null, workoutStatus)
  const calBudget = baseCalTarget != null ? getEffectiveCalorieBudget(baseCalTarget, todayAdjustment) : null
  const todaysDayType = resolvedDayType(scheduledDayType, workoutStatus)
  const eatingOutToday = isEatingOutToday(todayMeals?.eatOut, todayAdjustment)

  // Her calorie target comes from the plan she already has — never asked
  // again here. No plan yet → send her through the existing plan creation.
  if (!calBudget || !intake) return <NoPlanYet />

  const loggedToday = (foodRows || []).reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  const remainingCal = Math.max(0, Math.round(calBudget - loggedToday))
  const loggedMeals = new Set((foodRows || []).map((r) => (r.meal as string) || ''))

  // Which meal is this? The clock's meal — unless she's already logged it,
  // then the next one, so she's never handed lunch twice.
  let slot: MealSlot = slotForHour(localHourNumber(tz))
  while (loggedMeals.has(slot.toLowerCase()) && NEXT_SLOT[slot]) slot = NEXT_SLOT[slot]!

  const formData = (intake.form_data || {}) as Record<string, unknown>
  const eatStyle = (formData.eat_style === 'cook' || formData.eat_style === 'out') ? formData.eat_style as EatStyle : null
  const mealBudget = eatStyle ? (Number(formData.meal_budget) || defaultMealBudget(eatStyle, Number(intake.weekly_food_budget) || null)) : 0

  const result = eatStyle ? pickMeals({
    eatStyle, mealBudget, remainingCal, slot,
    weightLbs: Number(intake.weight_lbs) || 170,
    dislikesAllergies: intake.dislikes_allergies as string | null,
    foodPreferences: intake.food_preferences as string | null,
    weekPlan, todayIdx: mealIdx,
    memory: (formData.meal_memory || {}) as MealMemory,
    todayIso,
  }) : null
  const cards: PickCard[] = (result?.options || []).slice(0, 10).map((o) => ({ ...o, dest: orderDestination(o) }))

  const greeting = loggedMeals.has(slot.toLowerCase()) ? 'Still hungry? Here’s a light one.' : `${slot} is sorted.`

  return (
    <div className="min-h-[100dvh] px-4 pt-6 pb-28" style={{ background: '#021F16' }}>
      <div className="max-w-md mx-auto">
        {eatStyle && result ? (
          <NutritionPicks
            cards={cards} slot={slot} remainingCal={remainingCal} dayTarget={Math.round(calBudget)} greeting={greeting}
            eatStyle={eatStyle} mealBudget={mealBudget} note={result.note}
          />
        ) : (
          <EatStyleAsk remainingCal={remainingCal} dayTarget={Math.round(calBudget)} />
        )}

        {/* Everything else food, out of the way of the two cards. */}
        <div className="mt-12 pt-6 flex flex-col gap-3" style={{ borderTop: '1px solid #0d3a2a' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(237,231,218,0.35)' }}>Ate something else?</p>
          <MealPhotoButton />
          <details className="group">
            <summary className="cursor-pointer list-none text-sm py-2 text-center underline underline-offset-[3px]" style={{ color: 'rgba(237,231,218,0.55)' }}>
              See today&apos;s food
            </summary>
            <div className="mt-3">
              <FoodLog
                planned={planned} budget={calBudget} dayType={todaysDayType}
                mealStatus={
                  eatingOutToday ? { kind: 'eatingOut' }
                    : todayMeals ? { kind: 'planned', totalProtein: todayMeals.totalProtein }
                    : { kind: 'empty', isSunday: mealIdx > 5 }
                }
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

function NoPlanYet() {
  return (
    <div className="min-h-[100dvh] px-6 pt-16 pb-28" style={{ background: '#021F16' }}>
      <div className="max-w-sm mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#EDE7DA' }}>Let&apos;s get your numbers first</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(237,231,218,0.55)' }}>Once your plan is set, this tab picks every meal for you.</p>
        <Link href="/plan/intake" className="inline-block rounded-2xl px-8 py-3.5 font-bold text-sm" style={{ background: '#E5A93C', color: '#0A0A0F' }}>Start my plan</Link>
      </div>
    </div>
  )
}
