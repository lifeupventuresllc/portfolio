import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FoodLog from '@/components/FoodLog'
import MealPhotoButton from '@/components/MealPhotoButton'
import KrogerCart from '@/components/KrogerCart'
import { FoodSettings } from '@/components/NutritionPicks'
import { loadNutritionDay } from '@/lib/nutrition-day'
import { defaultMealBudget, type EatStyle } from '@/lib/meal-pick'
import { SHOW_CALORIE_COUNTER } from '@/lib/feature-flags'

export const dynamic = 'force-dynamic'

// Today's food (2026-10-20): everything that came off the Nutrition tab's
// two-photo screen in v4 — snap a photo, see/edit today's log, and change how
// she eats, her money for one meal and which delivery app opens. Reached from
// My Day's "+ Log food".
export default async function FoodLogPage() {
  if (!SHOW_CALORIE_COUNTER) redirect('/plan')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/nutrition/log')

  const day = await loadNutritionDay(user)
  if (!day || !day.calBudget || !day.intake) redirect('/plan/nutrition')
  const { intake, planned, calBudget, todaysDayType, eatingOutToday, todayMeals, mealIdx } = day

  const formData = (intake.form_data || {}) as Record<string, unknown>
  // 'mix' (new intake) shows here as eating out — that's the side her money number is for.
  const eatStyle = (formData.eat_style === 'cook' || formData.eat_style === 'out') ? formData.eat_style as EatStyle : formData.eat_style === 'mix' ? 'out' : null
  const mealBudget = eatStyle ? (Number(formData.meal_budget) || defaultMealBudget(eatStyle, Number(intake.weekly_food_budget) || null)) : 0

  return (
    <div className="min-h-[100dvh] px-4 pt-6 pb-10" style={{ background: '#021F16' }}>
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <Link href="/plan/today" className="self-start text-sm" style={{ color: 'rgba(237,231,218,0.55)' }}>← My Day</Link>
        <h1 style={{ color: '#EDE7DA', fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 34, lineHeight: 1, textTransform: 'uppercase' }}>Today&apos;s food</h1>
        <MealPhotoButton />
        <FoodLog
          planned={planned} budget={calBudget} dayType={todaysDayType}
          mealStatus={
            eatingOutToday ? { kind: 'eatingOut' }
              : todayMeals ? { kind: 'planned', totalProtein: todayMeals.totalProtein }
              : { kind: 'empty', isSunday: mealIdx > 5 }
          }
        />
        <KrogerCart />
        <FoodSettings key={`${eatStyle}-${mealBudget}`} eatStyle={eatStyle} mealBudget={mealBudget} orderApp={formData.order_app === 'ubereats' ? 'ubereats' : 'doordash'} />
        <Link href="/photo-credits" className="self-center text-[11px] underline underline-offset-2 py-2" style={{ color: 'rgba(237,231,218,0.35)' }}>Meal photo credits</Link>
      </div>
    </div>
  )
}
