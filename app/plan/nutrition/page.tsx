import Link from 'next/link'
import { allergiesFrom } from '@/lib/meal-pick'
import { readPlan, nextDayISO } from '@/lib/day-plan'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EatStyleAsk } from '@/components/NutritionPicks'
import NutritionDay, { type DayCard, type DayStop } from '@/components/NutritionDay'
import { loadNutritionDay } from '@/lib/nutrition-day'
import { buildDayPicks, buildPicks } from '@/lib/nutrition-picks'
import { TrySwitch, NearMe, OneMealNow, type TryOption } from '@/components/NutritionCompare'
import { orderDestination, mealPhoto, shortName, type MealOption } from '@/lib/meal-pick'
import { SHOW_CALORIE_COUNTER } from '@/lib/feature-flags'

export const dynamic = 'force-dynamic'

// The Nutrition tab, v5 (2026-11-05, Asa's first real user test): she plans
// her whole day — breakfast, lunch, snack, dinner — one meal per screen with
// Back / Next, taps "Confirm my day", and sees her day plan
// (components/NutritionDay). Replaces v4's one-meal-at-a-time clock flow.

export default async function NutritionPage({ searchParams }: { searchParams?: { day?: string; try?: string } }) {
  const ahead = searchParams?.day === 'tomorrow'
  // 2026-11-09 (Asa #6): compare Plan my day (unchanged, default) vs Near me,
  // plus One meal now — components/NutritionCompare.tsx.
  const tryOpt: TryOption = !ahead && (searchParams?.try === 'near' || searchParams?.try === 'now') ? searchParams.try : 'day'
  if (!SHOW_CALORIE_COUNTER) redirect('/plan')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/nutrition')

  const data = await loadNutritionDay(user)
  // Her calorie target comes from the plan she already has — never asked
  // again here. No plan yet → send her through the existing plan creation.
  if (!data || !data.calBudget || !data.intake) return <NoPlanYet />
  const { eatStyle, mix, stops, avail, plan, orderApp, locFresh, hasPlaces, moneyDaily } = await buildDayPicks(data, data.calBudget, undefined, ahead ? 'tomorrow' : 'today')
  const fd = (data.intake.form_data || {}) as Record<string, unknown>
  const tomorrowSet = !ahead && readPlan(fd.day_plan_next, nextDayISO(data.todayIso)).confirmed
  const toCard = (o: MealOption): DayCard => ({ ...o, dest: orderDestination(o, orderApp), photo: mealPhoto(o), short: shortName(o) })
  const dayStops: DayStop[] = stops.map((s) => ({ id: s.id, label: s.label, calBudget: s.calBudget, out: s.out.map(toCard), cook: s.cook.map(toCard) }))
  const askLocation = hasPlaces && !locFresh
  // Near me: every eat-out pick across her day (each already fits that meal's calories + money).
  const nearCards = tryOpt === 'near' ? Array.from(new Map(dayStops.flatMap((s) => s.out).filter((c) => c.kind === 'out' && c.place !== 'Grab & go').map((c) => [c.key, c] as const)).values()).slice(0, 12) : []
  // One meal now: the meal for right now by her clock — one to order, one to make.
  const now = tryOpt === 'now' ? await buildPicks(data, data.calBudget) : null
  const nowCards = now ? (() => {
    const out = now.options.find((o) => o.kind === 'out'), cook = now.options.find((o) => o.kind === 'cook')
    return (out && cook ? [out, cook] : now.options.slice(0, 2)).map(toCard)
  })() : []
  const nowLabel = now ? now.slot.charAt(0).toUpperCase() + now.slot.slice(1) : ''

  return (
    <div className="px-4 pt-6 flex flex-col" style={{ background: '#021F16', minHeight: 'calc(100dvh - 4.5rem - env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col min-h-0">
        {eatStyle && !ahead && <TrySwitch current={tryOpt} />}
        {eatStyle && tryOpt === 'near' ? (
          <NearMe cards={nearCards} orderApp={orderApp} askLocation={askLocation} />
        ) : eatStyle && tryOpt === 'now' ? (
          <OneMealNow label={nowLabel} cards={nowCards} orderApp={now?.orderApp || orderApp} askLocation={askLocation} />
        ) : eatStyle ? (
          <NutritionDay stops={dayStops} plan={plan} avail={avail} eatStyle={eatStyle} mix={mix} orderApp={orderApp} askLocation={askLocation} moneyDaily={moneyDaily} moneySpent={ahead ? 0 : data.moneySpent} tomorrow={ahead} tomorrowSet={tomorrowSet} key={ahead ? 'tomorrow' : 'today'} allergies={allergiesFrom(data.intake.dislikes_allergies as string | null)} />
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
