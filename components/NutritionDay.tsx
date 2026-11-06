'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'
import { orderLink, openOrder, appFirstOn, ORDER_APP_LABEL, type OrderApp } from '@/lib/order-link'
import { copyText } from '@/lib/order-exact'
import { PLAN_STOPS, EXTRA_SNACKS, type PlanStopId, type PlannedPick, type SavedDayPlan } from '@/lib/day-plan'
import LocationOptIn from '@/components/LocationOptIn'
import { stepsFor, NO_COOK_STEPS } from '@/lib/recipe-instructions'
import { MoneyBar, CopyFallback, type PickCard } from '@/components/NutritionPicks'

// The Nutrition tab, v5 (2026-11-05, Asa's first real user test): she plans
// her WHOLE day up front, one meal per screen — breakfast → lunch → snack →
// dinner — with Back and Next, then taps "Confirm my day" and sees her full
// day plan. From the plan she orders, cooks, marks a meal eaten, changes any
// meal she hasn't eaten, or adds a snack. Picking only plans a meal; calories
// count when she taps "Ate it" or orders it. Back only ever moves back a
// screen: it never saves, reloads or adds anything.

export type DayCard = PickCard
export interface DayStop { id: PlanStopId; label: string; calBudget: number; out: DayCard[]; cook: DayCard[] }

type Mode = 'out' | 'cook' | 'mix'
type View = { v: 'pick'; id: PlanStopId; from: 'flow' | 'review' | 'plan' } | { v: 'review' } | { v: 'plan' } | { v: 'cook'; id: PlanStopId }

const C = { bg: '#021F16', card: '#08281d', gold: '#FFB21E', ivory: '#EDE7DA', soft: 'rgba(237,231,218,.72)', faint: 'rgba(237,231,218,.45)', line: 'rgba(237,231,218,.14)', mint: '#9FDCC4', coral: '#FF8A7A' }
const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const BODY = "var(--font-inter), Inter, system-ui, sans-serif"
const head = (size: number) => ({ margin: 0, fontFamily: HEAD, fontStyle: 'italic' as const, fontWeight: 800, fontSize: size, lineHeight: 0.9, textTransform: 'uppercase' as const })
const mono = (size: number) => ({ fontFamily: MONO, fontWeight: 700, fontSize: size, letterSpacing: '.1em' })
const TITLE: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner', 'extra snack': 'Extra snack' }
const DEFS = [...PLAN_STOPS, ...EXTRA_SNACKS]
const mealOf = (id: PlanStopId) => DEFS.find((d) => d.id === id)!.meal
const canOrder = (p: { kind: string; place: string }) => p.kind === 'out' && p.place !== 'Grab & go'

const toPick = (c: DayCard): PlannedPick => ({
  key: c.key, kind: c.kind, name: c.name, short: c.short, place: c.place, photo: c.photo,
  cal: c.cal, protein: c.protein, carbs: c.carbs, fat: c.fat, price: c.price,
  ...(c.ingredients?.length ? { ingredients: c.ingredients } : {}), eatenId: null,
})

async function post(body: object): Promise<boolean> {
  const res = await fetch('/api/plan/meal-pick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
  return !!res && res.ok
}
async function logFood(body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch('/api/plan/food-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('save failed')
  const day = await res.json().catch(() => null) as { entries?: { id: string; name: string; meal: string }[] } | null
  return (day?.entries || []).filter((e) => e.name === body.name && e.meal === body.meal).pop()?.id || null
}
const unlog = (id: string) => fetch(`/api/plan/food-log?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null)

export default function NutritionDay(p: {
  stops: DayStop[]
  plan: SavedDayPlan
  avail: number                 // calories for her planned meals today
  eatStyle: 'out' | 'cook'
  mix: boolean
  orderApp: OrderApp
  askLocation: boolean
  moneyDaily: number | null    // today's food money; null = no budget set
  moneySpent: number           // spent today on food outside her plan
  allergies?: string[]         // foods she marked as an allergy in intake
  tomorrow?: boolean           // planning tomorrow ("Plan tomorrow" on Day done)
  tomorrowSet?: boolean        // tomorrow's plan is already confirmed
}) {
  const router = useRouter()
  const send = (b: Record<string, unknown>) => post(p.tomorrow ? { ...b, day: 'tomorrow' } : b)
  const [picks, setPicks] = useState(p.plan.picks)
  const [confirmed, setConfirmed] = useState(p.plan.confirmed)
  const [extras, setExtras] = useState(p.plan.extras)
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState<{ text: string; app: OrderApp } | null>(null)
  const [busy, setBusy] = useState<PlanStopId | null>(null)
  const active = p.stops.slice(0, PLAN_STOPS.length + extras)
  const [view, setView] = useState<View>(() => {
    if (p.plan.confirmed) return { v: 'plan' }
    const open = active.find((s) => !(s.id in p.plan.picks))
    return open ? { v: 'pick', id: open.id, from: 'flow' } : { v: 'review' }
  })
  const [lastMode, setLastMode] = useState<Mode | null>(null)   // her last Order out / Cook it choice carries to the next meal
  // The phone's own Back button steps back a screen here too (the tester's
  // bug: it left the page). Each screen change is one history step.
  const trail = useRef<View[]>([])
  const viewRef = useRef(view)
  viewRef.current = view
  const skipPop = useRef(false)
  useEffect(() => {
    const onPop = () => {
      if (skipPop.current) { skipPop.current = false; return }
      const prev = trail.current.pop(); if (prev) { setError(''); setView(prev) }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const go = (v: View) => {
    hapticTap(); setError('')
    trail.current.push(viewRef.current)
    try { window.history.pushState({ nutritionDay: true }, '') } catch { /* fine */ }
    setView(v)
    window.scrollTo(0, 0)
  }
  const fail = () => setError("Couldn't save that. Check your internet and tap again.")

  const planned = (id?: PlanStopId) => active.reduce((t, s) => t + (s.id !== id ? picks[s.id]?.cal || 0 : 0), 0)

  // ---- saving ----
  async function setPick(id: PlanStopId, pick: PlannedPick | null | undefined) {
    const before = picks
    const next = { ...picks }
    if (pick === undefined) delete next[id]
    else next[id] = pick
    setPicks(next)
    setConfirmed(false)
    if (!(await send({ action: 'plan_set', stop: id, pick }))) { setPicks(before); fail(); return false }
    return true
  }
  async function confirm() {
    hapticTap()
    if (!(await send({ action: 'plan_confirm' }))) return fail()
    setConfirmed(true)
    // Her day is set: drop the pick screens from Back (2026-11-06 test: back
    // and forward walked through old picks). Back now leaves the Food tab.
    hapticTap(); setError('')
    const steps = trail.current.length
    trail.current = []
    setView({ v: 'plan' })
    window.scrollTo(0, 0)
    if (steps > 0) { skipPop.current = true; try { window.history.go(-steps) } catch { skipPop.current = false } }
  }
  async function markEaten(id: PlanStopId) {
    const pick = picks[id]
    if (!pick || busy) return
    setBusy(id)
    try {
      const entryId = await logFood({
        name: pick.name, brand: pick.place, meal: mealOf(id), servings: 1,
        calories: pick.cal, protein_g: pick.protein, carbs_g: pick.carbs, fats_g: pick.fat,
        source: 'meal_pick', price: pick.price ?? 0,
      })
      if (!entryId || !(await send({ action: 'plan_eaten', stop: id, entryId }))) throw new Error('save')
      setPicks((ps) => ({ ...ps, [id]: { ...pick, eatenId: entryId } }))
      router.refresh()
    } catch { fail() }
    setBusy(null)
  }
  async function unEat(id: PlanStopId) {
    const pick = picks[id]
    if (!pick?.eatenId || busy) return
    hapticTap()
    setBusy(id)
    await unlog(pick.eatenId)
    if (await send({ action: 'plan_eaten', stop: id, entryId: null })) setPicks((ps) => ({ ...ps, [id]: { ...pick, eatenId: null } }))
    else fail()
    setBusy(null)
    router.refresh()
  }
  // Order: opens the delivery app inside the tap (browsers block it after an
  // await), then counts the meal. The very first time, the "3 taps" sheet.
  // One button opens the place in her delivery app straight away and counts
  // the meal (2026-11-05, Asa's approved mockup: no copy/paste screen first).
  // Opened inside the tap: browsers block it after an await.
  function order(id: PlanStopId, app: OrderApp) {
    if (!picks[id]) return
    hapticTap()
    openAndCount(id, app)
  }
  function openAndCount(id: PlanStopId, app: OrderApp) {
    const pick = picks[id]
    if (!pick) return
    const link = orderLink({ place: pick.place, name: pick.name, key: pick.key }, app)
    copyText(link.copy)
    setBlocked(openOrder(link, appFirstOn()) ? null : { text: link.copy, app })
    // Opening the app isn't eating it: she taps I ATE IT herself.
  }
  async function addSnack() {
    if (extras >= EXTRA_SNACKS.length) return
    const n = extras + 1
    if (!(await send({ action: 'plan_extra', extras: n }))) return fail()
    setExtras(n)
    setConfirmed(false)
    go({ v: 'pick', id: EXTRA_SNACKS[n - 1].id, from: 'plan' })
  }
  async function removeSnack(id: PlanStopId) {
    hapticTap()
    // Extra snacks come off from the last one.
    const n = Math.max(0, extras - 1)
    const last = EXTRA_SNACKS[n].id
    if (id !== last) await send({ action: 'plan_set', stop: id, pick: picks[last] ?? undefined })
    if (!(await send({ action: 'plan_extra', extras: n }))) return fail()
    setPicks((ps) => {
      const next = { ...ps }
      if (id !== last) { if (ps[last] === undefined) delete next[id]; else next[id] = ps[last] }
      delete next[last]
      return next
    })
    setExtras(n)
  }

  const errorBar = error ? (
    <div role="alert" className="rounded-2xl px-4 py-3 mb-3" style={{ background: 'rgba(255,90,78,.14)', border: '1px solid rgba(255,90,78,.5)', color: C.ivory, fontSize: 15 }}>{error}</div>
  ) : null
  // ---------- one meal ----------
  if (view.v === 'pick') {
    const idx = active.findIndex((s) => s.id === view.id)
    const stop = active[idx]
    if (!stop) { setView({ v: confirmed ? 'plan' : 'review' }); return null }
    const isExtra = idx >= PLAN_STOPS.length
    const room = Math.max(0, p.avail - planned(stop.id))
    // After a pick: in the first walk-through, on to the next meal she hasn't
    // picked; when she came to change one meal, back to her day.
    const after = (nextPicks: typeof picks) => {
      if (view.from === 'flow') {
        const later = active.slice(idx + 1).find((s) => !(s.id in nextPicks))
        if (later) return go({ v: 'pick', id: later.id, from: 'flow' })
      }
      go({ v: 'review' })
    }
    return (
      <Shell>
        {errorBar}
        <PickStep key={stop.id} tomorrow={!!p.tomorrow} stop={stop} step={idx + 1} total={view.from === 'flow' ? PLAN_STOPS.length + extras : 0}
          picked={picks[stop.id]} defaultMode={lastMode ?? (p.mix ? 'mix' : p.eatStyle)} onMode={setLastMode} mixer={!!p.mix}
          moneyRoom={p.moneyDaily == null ? null : Math.max(0, p.moneyDaily - p.moneySpent - active.reduce((t, s) => t + (s.id !== stop.id && !picks[s.id]?.eatenId ? picks[s.id]?.price || 0 : 0), 0))}
          taken={new Set(active.filter((s) => s.id !== stop.id).map((s) => picks[s.id]?.key).filter((k): k is string => !!k))} room={isExtra ? room : null} askLocation={p.askLocation}
          onPick={async (c) => {
            hapticTap()
            const pick = toPick(c)
            if (await setPick(stop.id, pick)) setTimeout(() => after({ ...picks, [stop.id]: pick }), 450)
          }}
          onSkip={async () => { if (await setPick(stop.id, null)) after({ ...picks, [stop.id]: null }) }}
          onBack={() => {
            // Back only moves back a screen. Never saves, never adds.
            if (view.from !== 'flow') return go({ v: confirmed ? 'plan' : 'review' })
            if (idx > 0) return go({ v: 'pick', id: active[idx - 1].id, from: 'flow' })
            router.push('/plan')
          }}
          backLabel={view.from === 'flow' ? (idx > 0 ? `BACK` : 'HOME') : 'MY DAY'}
          onNext={() => after(picks)}
          nextLabel={view.from === 'flow' && active.slice(idx + 1).some((s) => !(s.id in picks)) ? 'NEXT MEAL' : 'SEE MY DAY'} />
      </Shell>
    )
  }

  // ---------- how to cook it ----------
  if (view.v === 'cook') {
    const pick = picks[view.id]
    if (!pick) { setView({ v: 'plan' }); return null }
    const steps = stepsFor(pick.name)
    return (
      <Shell>
        {errorBar}
        <TopBack label="MY DAY" onClick={() => go({ v: confirmed ? 'plan' : 'review' })} />
        <div className="relative rounded-3xl overflow-hidden mt-3" style={{ height: 210, background: C.card }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {pick.photo && <img src={pick.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        </div>
        <span className="mt-4" style={{ ...mono(12), color: C.gold }}>{TITLE[DEFS.find((d) => d.id === view.id)!.label].toUpperCase()} · MAKE IT AT HOME</span>
        <h1 className="mt-1" style={head(40)}>{pick.short}</h1>
        <Section title="WHAT YOU NEED">
          {pick.ingredients?.length ? (
            <ul className="flex flex-col gap-1.5" style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 17 }}>
              {pick.ingredients.map((i) => <li key={i}>• {i}</li>)}
            </ul>
          ) : <p style={{ margin: 0, fontSize: 16, color: C.soft }}>Everything is in the name. Make it your way.</p>}
        </Section>
        {steps.length > 0 && (
          <Section title={NO_COOK_STEPS[pick.name] ? 'HOW TO MAKE IT · NO COOKING' : 'HOW TO MAKE IT'}>
            <ol className="flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 17, lineHeight: 1.4 }}>
              {steps.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 grid place-items-center rounded-full" style={{ width: 28, height: 28, background: C.gold, color: C.bg, ...mono(13) }}>{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            {steps.some((t) => /portion|container|divide by/i.test(t)) && (
              <p style={{ margin: 0, fontSize: 14, color: C.soft }}>These steps make a big batch for the week. The list above is for one meal.</p>
            )}
          </Section>
        )}
        <div className="h-4" />
        <EatButton eaten={!!pick.eatenId} busy={busy === view.id} onEat={() => markEaten(view.id)} onUndo={() => unEat(view.id)} />
      </Shell>
    )
  }

  // ---------- her day (review before confirming, and the confirmed plan) ----------
  const rows = active.map((s) => ({ s, pick: picks[s.id], title: TITLE[DEFS.find((d) => d.id === s.id)!.label] }))
  const mealCount = active.filter((s) => picks[s.id]).length
  const eatenCount = active.filter((s) => picks[s.id]?.eatenId).length
  // The first meal she hasn't eaten yet is "next up".
  const nextUp = confirmed && !p.tomorrow ? active.find((s) => picks[s.id] && !picks[s.id]!.eatenId)?.id : undefined
  const cost = active.reduce((t, s) => t + (picks[s.id]?.price || 0), 0)
  // Every planned meal eaten: the Day done screen (2026-11-06, Asa approved
  // ~/Desktop/Day-Done-Mockup.html) instead of the full cards.
  if (confirmed && !p.tomorrow && mealCount > 0 && eatenCount === mealCount) {
    const lastEaten = [...rows].reverse().find((r) => r.pick?.eatenId)
    return (
      <DayDone rows={rows.filter((r) => r.pick)} moneyDaily={p.moneyDaily} spent={p.moneySpent} tomorrowSet={!!p.tomorrowSet}
        onTomorrow={() => { hapticTap(); router.push('/plan/nutrition?day=tomorrow') }}
        onSnack={extras < EXTRA_SNACKS.length ? addSnack : null}
        onUndo={lastEaten ? () => unEat(lastEaten.s.id) : null} error={errorBar} />
    )
  }
  return (
    <Shell>
      {errorBar}
      {p.tomorrow && <TopBack label="TODAY" onClick={() => { hapticTap(); router.push('/plan/nutrition') }} />}
      <span className={p.tomorrow ? 'mt-3' : ''} style={{ ...mono(12), color: C.gold }}>{p.tomorrow ? (confirmed ? 'TOMORROW IS SET' : 'TOMORROW') : confirmed ? 'YOUR DAY IS SET' : 'ALMOST DONE'}</span>
      <h1 className="mt-1 mb-1" style={head(52)}>{p.tomorrow ? 'Tomorrow.' : confirmed ? 'Your day.' : 'Here’s your day.'}</h1>
      <p className="mb-4" style={{ margin: 0, fontSize: 16, color: C.soft }}>
        {p.tomorrow
          ? (confirmed ? 'It’s ready when you wake up.' : 'Tap Change to swap a meal.')
          : confirmed
          ? (eatenCount > 0 ? `${eatenCount} of ${mealCount} meals eaten. Nice.` : 'When you eat a meal, tap “I ate it”.')
          : 'Tap Change to swap a meal.'}
      </p>
      {p.moneyDaily != null && cost > p.moneyDaily + 0.5 && (
        <p className="mb-4 rounded-2xl px-4 py-3" style={{ margin: 0, fontSize: 15, lineHeight: 1.4, background: 'rgba(255,178,30,.1)', border: '1px solid rgba(255,178,30,.45)' }}>
          This day costs about ${Math.round(cost)}. Your food money is ${Math.round(p.moneyDaily)} a day. Tap Change and pick a Make it meal to spend less.
        </p>
      )}
      {confirmed && !p.tomorrow && p.moneyDaily != null && <MoneyBar daily={p.moneyDaily} spent={p.moneySpent} />}
      {blocked && <div className="mb-3"><CopyFallback text={blocked.text} appName={ORDER_APP_LABEL[blocked.app]} /></div>}
      <div className="flex flex-col gap-3">
        {rows.map(({ s, pick, title }, i) => (
          <div key={s.id} className="rounded-3xl overflow-hidden" style={{ background: C.card, border: `2px solid ${pick?.eatenId ? 'rgba(30,227,138,.45)' : C.line}` }}>
            <div className="flex items-center gap-3 p-3">
              <div className="relative shrink-0 rounded-2xl overflow-hidden" style={{ width: 76, height: 76, background: 'rgba(237,231,218,.06)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {pick?.photo && <img src={pick.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                {pick?.eatenId && <span className="absolute inset-0 grid place-items-center" style={{ background: 'rgba(2,31,22,.55)', fontSize: 30 }}>✓</span>}
              </div>
              <div className="flex-1 min-w-0">
                <span style={{ ...mono(11), color: C.gold }}>{title.toUpperCase()}{nextUp === s.id ? ' · NEXT UP' : ''}</span>
                {pick ? (
                  <>
                    <span className="block mt-0.5" style={{ ...head(22), lineHeight: 1 }}>{pick.short}</span>
                    <span className="block mt-1" style={{ fontSize: 14, color: C.soft }}>
                      {pick.kind === 'cook' ? 'Make it' : pick.place}{pick.price != null ? ` · $${Math.round(pick.price)}` : ''}
                    </span>
                  </>
                ) : (
                  <span className="block mt-0.5" style={{ fontSize: 16, color: C.soft }}>{pick === null ? 'Skipped' : 'Not picked yet'}</span>
                )}
              </div>
              {!pick?.eatenId && (
                <button type="button" onClick={() => go({ v: 'pick', id: s.id, from: confirmed ? 'plan' : 'review' })}
                  className="nf-press shrink-0 rounded-full px-4" style={{ height: 44, border: `2px solid ${C.gold}`, color: C.gold, background: 'transparent', ...mono(12) }}>
                  {pick ? 'CHANGE' : 'PICK'}
                </button>
              )}
            </div>
            {confirmed && pick && !p.tomorrow && (
              <div className="flex flex-col gap-2 px-3 pb-3">
                {pick.kind === 'out' && !pick.eatenId && !!p.allergies?.length && (
                  <div role="note" className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(200,69,45,.16)', border: '1.5px solid rgba(255,90,60,.6)', fontSize: 14, fontWeight: 700, color: '#FFD3C9' }}>
                    <span aria-hidden>⚠️</span> Tell them you&apos;re allergic to {andList(p.allergies)}.
                  </div>
                )}
                <EatButton eaten={!!pick.eatenId} busy={busy === s.id} onEat={() => { hapticTap(); markEaten(s.id) }} onUndo={() => unEat(s.id)} />
                {canOrder(pick) && !pick.eatenId && (
                  <button type="button" onClick={() => order(s.id, p.orderApp)} disabled={busy === s.id}
                    className="nf-press rounded-full disabled:opacity-60" style={{ height: 50, border: '2px solid rgba(237,231,218,.3)', background: 'transparent', color: C.ivory, fontSize: 15, fontWeight: 600 }}>
                    Open {pick.place} on {ORDER_APP_LABEL[p.orderApp]}
                  </button>
                )}
                {pick.kind === 'cook' && (
                  <button type="button" onClick={() => go({ v: 'cook', id: s.id })} className="nf-press rounded-full" style={{ height: 50, border: '2px solid rgba(237,231,218,.3)', background: 'transparent', color: C.ivory, fontSize: 15, fontWeight: 600 }}>
                    How to make it
                  </button>
                )}
              </div>
            )}
            {i >= PLAN_STOPS.length && !pick?.eatenId && (
              <button type="button" onClick={() => removeSnack(s.id)} className="block w-full pb-3 underline underline-offset-2" style={{ fontSize: 15, color: C.soft, minHeight: 44 }}>Remove this snack</button>
            )}
          </div>
        ))}
      </div>
      {confirmed && extras < EXTRA_SNACKS.length && (
        <button type="button" onClick={addSnack} className="nf-press mt-3 rounded-full" style={{ height: 50, border: '2px dashed rgba(237,231,218,.3)', color: C.ivory, background: 'transparent', ...mono(12) }}>+ ADD A SNACK</button>
      )}
      <div className="h-5" />
      {!confirmed ? (
        <>
          <button type="button" onClick={confirm} className="nf-press rounded-full w-full" style={{ height: 62, background: C.gold, color: C.bg, ...mono(16) }}>CONFIRM MY DAY</button>
          <button type="button" onClick={() => {
            const last = [...active].reverse()[0]
            go({ v: 'pick', id: last.id, from: 'flow' })
          }} className="self-center mt-3 underline underline-offset-2" style={{ fontSize: 15, color: C.soft }}>Back</button>
        </>
      ) : p.tomorrow ? (
        <button type="button" onClick={() => { hapticTap(); router.push('/plan/nutrition') }} className="nf-press rounded-full w-full" style={{ height: 58, border: '2px solid rgba(237,231,218,.3)', color: C.ivory, fontSize: 16, fontWeight: 700 }}>Back to today</button>
      ) : (
        <p className="text-center" style={{ margin: 0, fontSize: 14, color: C.faint }}>Want something different? Tap Change on any meal you haven&apos;t eaten.</p>
      )}
    </Shell>
  )
}

// ---- pieces ----

// Every meal eaten: a win, one calm money line, and what's next.
function DayDone({ rows, moneyDaily, spent, tomorrowSet, onTomorrow, onSnack, onUndo, error }: {
  rows: { s: DayStop; pick: PlannedPick | null | undefined; title: string }[]
  moneyDaily: number | null; spent: number; tomorrowSet: boolean
  onTomorrow: () => void; onSnack: (() => void) | null; onUndo: (() => void) | null; error: ReactNode
}) {
  const left = moneyDaily == null ? null : Math.round(moneyDaily - spent)
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  return (
    <Shell>
      {error}
      <span style={{ ...mono(12), color: C.gold }}>{weekday} · ALL {rows.length} MEALS</span>
      <div className="mt-3 flex flex-col items-center gap-2 text-center rounded-[26px] px-4 py-6 nd-done"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,178,30,.28), rgba(255,178,30,.06) 70%)', border: '2px solid rgba(255,178,30,.55)' }}>
        <span aria-hidden className="grid place-items-center rounded-full" style={{ width: 96, height: 96, border: `6px solid ${C.gold}`, fontSize: 44, boxShadow: '0 0 28px rgba(255,178,30,.45)' }}>🎉</span>
        <h1 style={{ ...head(52), margin: 0 }}>Day done.</h1>
        <span style={{ fontSize: 17 }}>You ate all {rows.length} meals. That&apos;s how it&apos;s built.</span>
        <style>{`@keyframes ndDone{0%{transform:scale(.94);opacity:0}100%{transform:scale(1);opacity:1}}.nd-done{animation:ndDone .5s ease-out}@media (prefers-reduced-motion:reduce){.nd-done{animation:none}}`}</style>
      </div>
      {left != null && (
        left >= 0 ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(30,227,138,.1)', border: '1.5px solid rgba(30,227,138,.45)', fontSize: 16, fontWeight: 700 }}>
            <span aria-hidden style={{ fontSize: 22 }}>💰</span> You stayed in your food money.{left > 0 ? ` $${left} to spare.` : ''}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(237,231,218,.06)', border: '1.5px solid rgba(237,231,218,.2)', fontSize: 16, fontWeight: 600 }}>
            <span aria-hidden style={{ fontSize: 22 }}>💵</span> ${-left} over your food money today. No big deal.
          </div>
        )
      )}
      <div className="mt-3 rounded-[20px] px-4 py-1.5" style={{ background: C.card, border: '1.5px solid rgba(237,231,218,.12)' }}>
        {rows.map(({ s, pick, title }, i) => (
          <div key={s.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? '1px solid rgba(237,231,218,.08)' : undefined }}>
            <span aria-hidden className="shrink-0 grid place-items-center rounded-full" style={{ width: 26, height: 26, background: 'rgba(30,227,138,.18)', color: '#1EE38A', fontSize: 14 }}>✓</span>
            <span className="min-w-0">
              <span className="block" style={{ ...mono(11), color: C.gold }}>{title.toUpperCase()}</span>
              <span className="block truncate" style={{ fontSize: 15, fontWeight: 700 }}>{pick!.short}{pick!.kind === 'out' && pick!.place ? ` · ${pick!.place}` : ''}</span>
            </span>
          </div>
        ))}
      </div>
      <button type="button" onClick={onTomorrow} className="nf-press mt-4 rounded-full w-full" style={{ height: 58, background: C.gold, color: C.bg, ...mono(15) }}>
        {tomorrowSet ? 'SEE TOMORROW’S PLAN' : 'PLAN TOMORROW'}
      </button>
      {onSnack && (
        <button type="button" onClick={onSnack} className="nf-press mt-3 rounded-full w-full" style={{ height: 58, border: '2px solid rgba(237,231,218,.3)', color: C.ivory, fontSize: 16, fontWeight: 700 }}>
          Still hungry? Add a snack
        </button>
      )}
      <p className="text-center mt-4" style={{ margin: 0, fontSize: 14, color: C.soft }}>New day starts at midnight.</p>
      {onUndo && <button type="button" onClick={onUndo} className="self-center mt-2 underline underline-offset-2" style={{ fontSize: 14, color: C.faint }}>Didn&apos;t eat the last one? Undo</button>}
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="nf-screen flex-1 flex flex-col pb-28" style={{ color: C.ivory, fontFamily: BODY }}>{children}</div>
}
function TopBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="nf-press self-start flex items-center gap-2 rounded-full pl-3 pr-4" style={{ height: 44, background: 'rgba(237,231,218,.08)', color: C.ivory, ...mono(12) }}>
      <span aria-hidden style={{ fontSize: 18 }}>‹</span> {label}
    </button>
  )
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 mt-4" style={{ borderRadius: 20, padding: '14px 16px', background: 'rgba(237,231,218,.06)' }}>
      <span style={{ ...mono(12), color: C.gold }}>{title}</span>
      {children}
    </div>
  )
}
function EatButton({ eaten, busy, onEat, onUndo, small = false }: { eaten: boolean; busy: boolean; onEat: () => void; onUndo: () => void; small?: boolean }) {
  if (eaten) return (
    <div className="flex items-center justify-between gap-3 rounded-full pl-4 pr-1" style={{ height: small ? 48 : 58, background: 'rgba(30,227,138,.12)', border: '1px solid rgba(30,227,138,.45)' }}>
      <span style={{ ...mono(12), color: C.mint }}>✓ EATEN · COUNTED</span>
      <button type="button" onClick={onUndo} disabled={busy} className="rounded-full px-4" style={{ height: small ? 40 : 48, fontSize: 14, color: C.soft, textDecoration: 'underline' }}>Undo</button>
    </div>
  )
  return (
    <button type="button" onClick={onEat} disabled={busy} className="nf-press rounded-full w-full disabled:opacity-60"
      style={{ height: small ? 48 : 58, background: C.gold, color: C.bg, ...mono(small ? 13 : 15) }}>
      {busy ? 'SAVING…' : 'I ATE IT'}
    </button>
  )
}

// Two cards for one meal, the same look as before: tap one to pick it,
// "Not this one" swaps a card, Shuffle swaps the other. Order out / Cook it
// switches the kind of meal for just this one.
function PickStep({ tomorrow, stop, step, total, picked, defaultMode, onMode, mixer, taken, moneyRoom, room, askLocation, onPick, onSkip, onBack, backLabel, onNext, nextLabel }: {
  tomorrow: boolean; stop: DayStop; step: number; total: number; picked: PlannedPick | null | undefined; defaultMode: Mode; mixer: boolean; room: number | null; askLocation: boolean
  onMode: (m: Mode) => void; taken: Set<string>; moneyRoom: number | null
  onPick: (c: DayCard) => void; onSkip: () => void; onBack: () => void; backLabel: string; onNext: () => void; nextLabel: string
}) {
  const kinds: Mode[] = [...(stop.out.length ? ['out' as const] : []), ...(stop.cook.length ? ['cook' as const] : [])]
  const startMode: Mode = picked ? picked.kind : defaultMode === 'mix' && kinds.length < 2 ? (kinds[0] || 'cook') : kinds.includes(defaultMode as 'out') || defaultMode === 'mix' ? defaultMode : (kinds[0] || 'cook')
  const [mode, setMode] = useState<Mode>(startMode)
  let pricey = false   // nothing fits her money left, so we show the cheapest
  const list = (() => {
    let l: DayCard[]
    if (mode === 'mix') {
      l = []
      for (let i = 0; i < Math.max(stop.out.length, stop.cook.length); i++) { if (stop.out[i]) l.push(stop.out[i]); if (stop.cook[i]) l.push(stop.cook[i]) }
    } else l = mode === 'out' ? stop.out : stop.cook
    // Never the same meal twice in one day.
    l = l.filter((c) => !taken.has(c.key))
    // Only meals that fit the money she has left today (2026-11-05, Asa's
    // approved mockup), so the day she builds can't go over. Nothing fits →
    // the two cheapest.
    if (moneyRoom != null) {
      const fit = l.filter((c) => c.price == null || c.price <= moneyRoom + 0.5)
      // Also when only unpriced Make it meals are left (2026-11-06 test).
      pricey = (fit.length < 2 && l.length > fit.length) || moneyRoom < 3
      l = fit.length >= 2 ? fit : [...l].sort((a, b) => (a.price ?? 0) - (b.price ?? 0)).slice(0, Math.max(2, fit.length))
    }
    // An extra snack only shows what still fits her day (or the lightest).
    if (room != null) {
      const fit = l.filter((c) => c.cal <= room)
      l = fit.length ? fit : [...l].sort((a, b) => a.cal - b.cal).slice(0, 2)
    }
    // Her current pick stays on screen when she comes back to this meal.
    const mine = picked && (l.find((c) => c.key === picked.key) || [...stop.out, ...stop.cook].find((c) => c.key === picked.key))
    return mine ? [mine, ...l.filter((c) => c.key !== mine.key)] : l
  })()
  // Two cards never share a photo (the tester saw the same egg sandwich twice).
  const firstPair = (): [number, number] => {
    const j = list.findIndex((c, i) => i > 0 && c.photo !== list[0]?.photo)
    return [0, j > 0 ? j : 1]
  }
  const [pair, setPair] = useState<[number, number]>(firstPair)
  const [cursor, setCursor] = useState(2)
  const shown = list.length < 2 ? (list.length ? [0] : []) : pair
  const canSwap = list.length > 2
  function swap(pos: number) {
    const keep = shown[1 - pos]
    const ok = (idx: number, samePhotoOk: boolean) => idx !== keep && idx !== shown[pos] && (samePhotoOk || list[idx].photo !== list[keep]?.photo)
    const order = Array.from({ length: list.length }, (_, k) => (cursor + k) % list.length)
    for (const idx of [...order.filter((i) => ok(i, false)), ...order.filter((i) => ok(i, true))]) {
      hapticTap()
      setPair((pr) => (pos === 0 ? [idx, pr[1]] : [pr[0], idx]))
      setCursor(idx + 1)
      return
    }
  }
  const switchMode = (m: Mode) => { hapticTap(); setMode(m); onMode(m); setPair([0, 1]); setCursor(2) }
  const title = TITLE[stop.label]
  const over = room != null && list.every((c) => c.cal > room)

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-3">
        <button type="button" onClick={onBack} className="nf-press flex items-center gap-2 rounded-full pl-3 pr-4" style={{ height: 44, background: 'rgba(237,231,218,.08)', color: C.ivory, ...mono(12) }}>
          <span aria-hidden style={{ fontSize: 18 }}>‹</span> {backLabel}
        </button>
        {total > 0 && (
          <span className="flex items-center gap-1.5" aria-label={`Meal ${step} of ${total}`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className="rounded-full" style={{ width: i + 1 === step ? 22 : 9, height: 9, background: i + 1 <= step ? C.gold : 'rgba(237,231,218,.2)', transition: 'width .2s' }} />
            ))}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        {total > 0 ? <span style={{ ...mono(12), color: C.soft }}>MEAL {step} OF {total}</span> : <span />}
        {moneyRoom != null && <span style={{ ...mono(12), color: C.mint }}>${Math.round(moneyRoom)} LEFT {tomorrow ? 'TOMORROW' : 'TODAY'}</span>}
      </div>
      <h1 className="mt-1 mb-1" style={head(46)}>Pick {tomorrow ? 'tomorrow’s' : 'your'} {title.toLowerCase()}.</h1>
      <p className="mb-3" style={{ margin: 0, fontSize: 16, color: C.soft }}>{over ? 'These go a little over your day.' : 'Tap the one you want.'}</p>
      {pricey && moneyRoom != null && (
        <div role="status" className="mb-3 flex items-center gap-3 rounded-2xl px-4 py-3 nd-money-flag"
          style={{ background: 'rgba(255,178,30,.16)', border: `2px solid ${C.gold}`, boxShadow: '0 0 18px rgba(255,178,30,.35)' }}>
          <span aria-hidden style={{ fontSize: 24, lineHeight: 1 }}>💰</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.ivory, lineHeight: 1.3 }}>
            Not much fits your <span style={{ color: C.gold }}>${Math.round(moneyRoom)} left</span>. These are the cheapest.
          </span>
          <style>{`@keyframes ndFlag{0%{transform:scale(.96);opacity:0}60%{transform:scale(1.02);opacity:1}100%{transform:scale(1)}}.nd-money-flag{animation:ndFlag .45s ease-out}@media (prefers-reduced-motion:reduce){.nd-money-flag{animation:none}}`}</style>
        </div>
      )}

      {kinds.length > 1 && (
        <div className="flex gap-2 mb-3" role="tablist" aria-label="Kind of meal">
          {([...(mixer || defaultMode === 'mix' ? [['mix', 'All']] : []), ['out', 'Order out'], ['cook', 'Make it']] as [Mode, string][]).map(([m, l]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className="nf-press flex-1 rounded-full"
              style={{ height: 46, fontSize: 15, fontWeight: 700, background: mode === m ? C.ivory : 'transparent', color: mode === m ? C.bg : C.ivory, border: `2px solid ${mode === m ? C.ivory : 'rgba(237,231,218,.25)'}` }}>{l}</button>
          ))}
        </div>
      )}
      {askLocation && mode !== 'cook' && <LocationOptIn prompt="Show meals open near you right now?" refreshOnPing large />}

      <div className="flex flex-col gap-3">
        {shown.map((idx, pos) => {
          const c = list[idx]
          if (!c) return null
          const on = picked?.key === c.key
          return (
            <div key={`${pos}-${c.key}`} className="relative rounded-3xl overflow-hidden np-in" style={{ height: 210, background: C.card, border: `3px solid ${on ? C.gold : 'rgba(237,231,218,.12)'}` }}>
              <button type="button" onClick={() => onPick(c)} aria-label={`Pick ${c.short}, ${c.kind === 'cook' ? 'make it at home' : c.place}${c.price != null ? `, $${Math.round(c.price)}` : ''}`} className="nf-press absolute inset-0 w-full h-full text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,0) 30%, rgba(2,31,22,0.94) 100%)' }} />
                <span className="absolute left-4 right-4 bottom-3 flex items-end justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block" style={{ ...head(26), lineHeight: 0.95 }}>{c.short}</span>
                    <span className="block mt-1" style={{ ...mono(11), color: C.soft }}>
                      {c.kind === 'cook' ? 'MAKE IT AT HOME' : c.place.toUpperCase()}
                    </span>
                  </span>
                  <span className="shrink-0 text-right leading-none">
                    {c.price != null && <span className="block tabular-nums" style={{ ...head(36), lineHeight: 1, color: C.gold }}>${Math.round(c.price)}</span>}
                  </span>
                </span>
                {on && <span className="absolute top-3 left-3 rounded-full px-3 py-1.5" style={{ background: C.gold, color: C.bg, ...mono(11) }}>✓ PICKED</span>}
              </button>
              {canSwap && !on && (
                <button type="button" onClick={() => swap(pos)} aria-label={`Not this one — swap out ${c.short}`} className="nf-press absolute top-3 right-3 rounded-full px-3 flex items-center gap-1.5"
                  style={{ height: 36, background: 'rgba(2,31,22,0.8)', border: '1px solid rgba(237,231,218,0.3)', color: C.ivory, ...mono(10) }}>
                  ✕ NOT THIS ONE
                </button>
              )}
            </div>
          )
        })}
        {shown.length === 0 && <p style={{ fontSize: 16, color: C.soft }}>Nothing fits this meal right now.{kinds.length > 1 ? ' Try the other button above.' : ''}</p>}
      </div>
      {canSwap && (
        <button type="button" onClick={() => swap(picked && list[shown[1]]?.key === picked.key ? 0 : 1)} className="nf-press w-full rounded-full mt-3 flex items-center justify-center gap-2"
          style={{ height: 50, border: `2px solid ${C.gold}`, background: 'transparent', color: C.gold, ...mono(13) }}>
          ↻ SHOW ME ANOTHER
        </button>
      )}
      <div className="flex-1 min-h-4" />
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button type="button" onClick={onBack} className="nf-press rounded-full" style={{ height: 56, border: '2px solid rgba(237,231,218,.3)', background: 'transparent', color: C.ivory, ...mono(13) }}>‹ {backLabel}</button>
        <button type="button" onClick={onNext} disabled={picked === undefined} className="nf-press rounded-full disabled:opacity-40" style={{ height: 56, background: C.gold, color: C.bg, ...mono(13) }}>{nextLabel} ›</button>
      </div>
      {picked !== null && (
        <button type="button" onClick={onSkip} className="self-center mt-3 underline underline-offset-2" style={{ fontSize: 14, color: C.faint }}>I’ll skip {title.toLowerCase()}</button>
      )}
    </div>
  )
}

// ['peanuts', 'shellfish', 'eggs'] → "peanuts, shellfish and eggs"
function andList(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
