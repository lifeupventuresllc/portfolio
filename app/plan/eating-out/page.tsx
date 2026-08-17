import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { weightClassFor, budgetTierFromWeekly, pickForNow, doordashSearchUrl, priceTierFor, type FastFoodMeal } from '@/lib/escape-plan'
import { localDateISO, localHourNumber, localMondayIndex } from '@/lib/localdate'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { getEffectiveCalorieBudget } from '@/lib/fos/effective-plan'
import type { WeekPlan } from '@/lib/meal-plan'
import EatingOutPicks from '@/components/EatingOutPicks'

export const dynamic = 'force-dynamic'

const SLOT_ICON: Record<string, string> = { Breakfast: '🌅', Lunch: '☀️', Snack: '🥤', Dinner: '🌙' }

// The zero-decision escape hatch: she's out, hasn't planned, and would normally have to
// choose between "wing it" (breaks the plan, feeds the craving spiral) or "skip it"
// (the forgot-to-eat pattern). This removes the decision entirely — one screen, no typing,
// no searching: exactly what to order, already picked for her.
export default async function EatingOutNow() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/eating-out')

  const svc = createServiceClient()
  let { data: enrollment } = await svc
    .from('challenge_enrollments').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc
      .from('challenge_enrollments').select('*')
      .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  const todayIso = localDateISO()
  const [{ data: intake }, { data: nutritionPlan }, { data: foodRows }, todayAdjustment] = await Promise.all([
    svc.from('challenge_intake').select('weight_lbs, weekly_food_budget').eq('enrollment_id', enrollment.id).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('calories, meals').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_food_log').select('calories').eq('enrollment_id', enrollment.id).eq('logged_on', todayIso),
    getApprovedTodayAdjustment(enrollment.id as string, todayIso),
  ])
  const wc = weightClassFor(Number(intake?.weight_lbs) || 170)
  // Rotate by calendar day (not day-of-week) so she cycles through every option
  // before repeating, instead of seeing the same "Monday" order every single week.
  // Stable within a day (same recommendation if she checks twice today).
  const epochDays = Math.floor(new Date(`${localDateISO()}T00:00:00Z`).getTime() / 86400000)
  const day = wc.days[epochDays % wc.days.length]

  // What she actually has left today — same target/adjustment math as /plan and
  // /plan/today, so "fits my calories" means the same thing everywhere in the app,
  // not a second, different number invented just for this page.
  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null
  const mealIdx = localMondayIndex()
  const todayTarget = (weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx]?.target : null) || Number(nutritionPlan?.calories) || 0
  const effectiveTarget = getEffectiveCalorieBudget(todayTarget, todayAdjustment)
  const loggedToday = (foodRows || []).reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  const remainingCal = Math.max(0, effectiveTarget - loggedToday)

  // Phase 4 (Layer 1): "pick one, right now" — narrowed to exactly 2 options for
  // whatever meal it actually is at this moment, filtered to what she can already
  // afford (her own stated weekly food budget from intake, not a new question) AND
  // to what actually fits her real remaining calories for today.
  const hour = localHourNumber()
  const nowSlot: FastFoodMeal['slot'] = hour < 11 ? 'Breakfast' : hour < 15 ? 'Lunch' : hour < 20 ? 'Dinner' : 'Snack'
  const budgetTier = budgetTierFromWeekly(Number(intake?.weekly_food_budget) || null)
  const nowPicks = pickForNow(wc, nowSlot, budgetTier, epochDays, remainingCal > 0 ? remainingCal : undefined)

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/plan/today" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Back to today</Link>

        <div className="flex items-center gap-2 mb-1">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase">Away from home right now</p>
          <span className="text-[9px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">✓ Decided For You</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Don&apos;t think about it — order this.</h1>
        <p className="text-ivory/60 text-sm mb-1">No planning, no guessing. High protein keeps you full and stops the crash-and-crave cycle.</p>
        <p className="text-gold/80 text-xs font-semibold mb-6">
          {todayTarget > 0 ? `You've got about ${Math.round(remainingCal).toLocaleString()} cal left today — these picks fit that.` : ' '}
        </p>

        {/* Pick one, right now — narrowed to exactly 2 for whatever meal it is this
            moment, within what she already told us she spends. This is the actual
            decision she needs made; the full day below is just reference context. */}
        {nowPicks.length > 0 && (
          <div className="mb-8">
            <p className="text-white font-medium text-sm mb-2.5">You don&apos;t need a plan in your hand to stay you — pick one, you&apos;ve got this. 💛</p>
            <p className="text-gold text-[10px] font-bold uppercase tracking-wider mb-2.5">{SLOT_ICON[nowSlot] || ''} Pick one for {nowSlot.toLowerCase()}, right now</p>
            <EatingOutPicks picks={nowPicks.map((m) => ({
              restaurant: m.restaurant, order: m.order, cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat,
              priceTier: priceTierFor(m.restaurant, m.order), doordashUrl: doordashSearchUrl(m.restaurant),
              meal: nowSlot.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack',
            }))} />
          </div>
        )}

        <p className="text-ivory/40 text-xs font-semibold uppercase tracking-wider mb-3">Your full day, for reference</p>
        <div className="bg-charcoal bg-gradient-to-br from-gold/10 to-charcoal border border-gold/30 rounded-2xl p-5 mb-6 flex flex-wrap gap-x-6 gap-y-1 justify-between">
          <div><p className="text-ivory/40 text-[10px] uppercase tracking-wider">Today&apos;s target</p><p className="text-gold font-bold">{day.total.toLocaleString()} cal</p></div>
          <div><p className="text-ivory/40 text-[10px] uppercase tracking-wider">Protein</p><p className="text-white font-bold">{wc.proteinTarget}g</p></div>
        </div>

        <div className="space-y-3">
          {day.meals.map((m, i) => (
            <div key={i} className="bg-charcoal border border-smoke rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="text-gold text-xs font-bold uppercase tracking-wider">{SLOT_ICON[m.slot] || ''} {m.slot}</p>
                <p className="text-ivory/50 text-xs whitespace-nowrap">{m.cal} cal · {m.protein}g P</p>
              </div>
              <p className="text-white font-semibold text-sm">{m.restaurant}</p>
              <p className="text-ivory/60 text-sm mt-0.5">{m.order}</p>
            </div>
          ))}
        </div>

        <p className="text-ivory/45 text-xs mt-6 text-center">This is your Escape Plan — swapped in automatically for your weight range and budget. No cooking, no tracking, just order and go.</p>
      </div>
    </div>
  )
}
