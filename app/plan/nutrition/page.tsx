import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NutritionPicks, { EatStyleAsk, type PickCard } from '@/components/NutritionPicks'
import { loadNutritionDay } from '@/lib/nutrition-day'
import { buildPicks } from '@/lib/nutrition-picks'
import { clockLabel, orderDestination, mealPhoto, shortName } from '@/lib/meal-pick'
import { SHOW_CALORIE_COUNTER } from '@/lib/feature-flags'

export const dynamic = 'force-dynamic'

// The Nutrition tab, v4 (2026-10-20, Asa: "she just taps an option within 5
// seconds, no thinking, everything else can go"). Two big photos for THIS
// meal — already fit to her calories left (hard rule, never over), her money
// for one meal, her "never" foods, and how she eats (cook vs eat out, two of
// the same kind). Nothing else on the screen. Her food log, the camera, and
// the cook/eat-out + money settings live on /plan/nutrition/log (My Day's
// "+ Log food").
// v4.1 (same day): the clock + her food log decide which meal is up
// (lib/meal-pick planDay) — breakfast logged → lunch is waiting, then the
// afternoon snack, dinner, the evening snack — and the screen moves on by
// itself when that meal's time passes. Her own usual meal times (learned
// from her log, lib/meal-pick mealTimesFrom) outrank the default clock.

export default async function NutritionPage() {
  if (!SHOW_CALORIE_COUNTER) redirect('/plan')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/nutrition')

  const data = await loadNutritionDay(user)
  // Her calorie target comes from the plan she already has — never asked
  // again here. No plan yet → send her through the existing plan creation.
  if (!data || !data.calBudget || !data.intake) return <NoPlanYet />
  const { calBudget, moneySpent } = data
  // One builder for the picks (lib/nutrition-picks) — the meal-time offer
  // notification uses the exact same one.
  const { eatStyle, result, options, lightOptions, moneyOver, moneyDaily, day, slot, nowMin, loggedToday, remainingCal, orderApp, locFresh } = await buildPicks(data, calBudget)
  const toCard = (o: (typeof options)[number]): PickCard => ({
    ...o, dest: orderDestination(o, orderApp), photo: mealPhoto(o), short: shortName(o),
  })
  const cards: PickCard[] = options.slice(0, 12).map(toCard)
  // Hit her number (2026-10-29): the lightest meals, behind "Still hungry?".
  const lightCards: PickCard[] = lightOptions.map(toCard)
  const overNow = Math.max(0, Math.round(loggedToday - calBudget))

  const heading = day.current ? `Pick your ${day.current.label}.` : 'Still hungry? Pick a light one.'
  // What's waiting after this one — said once she's picked.
  const next = day.next ? `Next up: your ${day.next.label}${day.next.start > nowMin + 30 ? `, around ${clockLabel(day.next.start)}` : ''}.` : null

  // The "near you" ask lives inside NutritionPicks now (2026-10-26, Asa): only
  // on the two-pick view, never above the order or logged screens.
  return (
    <div className="px-4 pt-6 flex flex-col" style={{ background: '#021F16', minHeight: 'calc(100dvh - 4.5rem - env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col min-h-0">
        {eatStyle && result ? (
          <NutritionPicks key={`${day.current?.id ?? 'done'}:${cards.map((c) => c.key).join('|')}`} cards={cards} slot={slot} heading={heading} remainingCal={remainingCal} nextUp={next} refreshInMin={day.refreshInMin} calBudget={Math.round(calBudget)} askLocation={eatStyle === 'out' && !locFresh} lightCards={lightCards} overNow={overNow} moneyDaily={moneyDaily} moneySpent={moneySpent} moneyOver={moneyOver} />
        ) : (
          <EatStyleAsk />
        )}
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
