'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { hapticTap } from '@/lib/haptics'
import { orderLink, openOrder, appFirstOn, mealText, ORDER_APP_LABEL, type OrderApp } from '@/lib/order-link'
import { copyText } from '@/lib/order-exact'
import { PLAN_STOPS, EXTRA_SNACKS, type PlanStopId, type PlannedPick, type SavedDayPlan } from '@/lib/day-plan'
import LocationOptIn from '@/components/LocationOptIn'
import { OrderHowTo, OrderExact, MoneyBar, CopyFallback, howtoSeen, markHowtoSeen, type PickCard } from '@/components/NutritionPicks'

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
type View = { v: 'pick'; id: PlanStopId; from: 'flow' | 'review' | 'plan' } | { v: 'review' } | { v: 'plan' } | { v: 'cook'; id: PlanStopId } | { v: 'order'; id: PlanStopId; app: OrderApp }

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
}) {
  const router = useRouter()
  const [picks, setPicks] = useState(p.plan.picks)
  const [confirmed, setConfirmed] = useState(p.plan.confirmed)
  const [extras, setExtras] = useState(p.plan.extras)
  const [error, setError] = useState('')
  const [howto, setHowto] = useState<{ id: PlanStopId; app: OrderApp } | null>(null)
  const [blocked, setBlocked] = useState<{ text: string; app: OrderApp } | null>(null)
  const [busy, setBusy] = useState<PlanStopId | null>(null)
  const active = p.stops.slice(0, PLAN_STOPS.length + extras)
  const [view, setView] = useState<View>(() => {
    if (p.plan.confirmed) return { v: 'plan' }
    const open = active.find((s) => !(s.id in p.plan.picks))
    return open ? { v: 'pick', id: open.id, from: 'flow' } : { v: 'review' }
  })
  const go = (v: View) => { hapticTap(); setError(''); setView(v); if (typeof window !== 'undefined') window.scrollTo(0, 0) }
  const fail = () => setError("Couldn't save that. Check your internet and tap again.")

  const planned = (id?: PlanStopId) => active.reduce((t, s) => t + (s.id !== id ? picks[s.id]?.cal || 0 : 0), 0)
  const eatenCal = active.reduce((t, s) => t + (picks[s.id]?.eatenId ? picks[s.id]!.cal : 0), 0)

  // ---- saving ----
  async function setPick(id: PlanStopId, pick: PlannedPick | null | undefined) {
    const before = picks
    const next = { ...picks }
    if (pick === undefined) delete next[id]
    else next[id] = pick
    setPicks(next)
    setConfirmed(false)
    if (!(await post({ action: 'plan_set', stop: id, pick }))) { setPicks(before); fail(); return false }
    return true
  }
  async function confirm() {
    hapticTap()
    if (!(await post({ action: 'plan_confirm' }))) return fail()
    setConfirmed(true)
    go({ v: 'plan' })
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
      if (!entryId || !(await post({ action: 'plan_eaten', stop: id, entryId }))) throw new Error('save')
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
    if (await post({ action: 'plan_eaten', stop: id, entryId: null })) setPicks((ps) => ({ ...ps, [id]: { ...pick, eatenId: null } }))
    else fail()
    setBusy(null)
    router.refresh()
  }
  // Order: opens the delivery app inside the tap (browsers block it after an
  // await), then counts the meal. The very first time, the "3 taps" sheet.
  // First "Order exactly this." (the parts to add, what to skip, copy), then
  // the app; the very first time, the "3 taps" sheet before the app.
  function order(id: PlanStopId, app: OrderApp) {
    const pick = picks[id]
    if (!pick) return
    hapticTap()
    if (!howtoSeen()) { copyText(mealText({ place: pick.place, name: pick.name })); setHowto({ id, app }); return }
    openAndCount(id, app)
    go({ v: 'plan' })
  }
  function openAndCount(id: PlanStopId, app: OrderApp) {
    const pick = picks[id]
    if (!pick) return
    const link = orderLink({ place: pick.place, name: pick.name, key: pick.key }, app)
    copyText(link.copy)
    setBlocked(openOrder(link, appFirstOn()) ? null : { text: link.copy, app })
    if (!pick.eatenId) markEaten(id)
  }
  async function addSnack() {
    if (extras >= EXTRA_SNACKS.length) return
    const n = extras + 1
    if (!(await post({ action: 'plan_extra', extras: n }))) return fail()
    setExtras(n)
    setConfirmed(false)
    go({ v: 'pick', id: EXTRA_SNACKS[n - 1].id, from: 'plan' })
  }
  async function removeSnack(id: PlanStopId) {
    hapticTap()
    // Extra snacks come off from the last one.
    const n = Math.max(0, extras - 1)
    const last = EXTRA_SNACKS[n].id
    if (id !== last) await post({ action: 'plan_set', stop: id, pick: picks[last] ?? undefined })
    if (!(await post({ action: 'plan_extra', extras: n }))) return fail()
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
  const sheet = howto && typeof document !== 'undefined' && picks[howto.id] ? createPortal(
    <OrderHowTo place={picks[howto.id]!.place} meal={mealText({ place: picks[howto.id]!.place, name: picks[howto.id]!.name })} appName={ORDER_APP_LABEL[howto.app]}
      onClose={() => setHowto(null)} onGo={() => { markHowtoSeen(); const h = howto; setHowto(null); openAndCount(h.id, h.app); go({ v: 'plan' }) }} />,
    document.body,
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
        <PickStep key={stop.id} stop={stop} step={idx + 1} total={view.from === 'flow' ? PLAN_STOPS.length + extras : 0}
          picked={picks[stop.id]} defaultMode={p.mix ? 'mix' : p.eatStyle} room={isExtra ? room : null} askLocation={p.askLocation}
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

  // ---------- order exactly this ----------
  if (view.v === 'order') {
    const pick = picks[view.id]
    if (!pick) { setView({ v: 'plan' }); return null }
    const found = p.stops.flatMap((s) => s.out).find((c) => c.key === pick.key)
    const base = found || ({ ...pick, slot: 'Lunch', calSource: 'estimated', why: '', dest: { url: null, label: '', kind: 'delivery', app: view.app } } as PickCard)
    const card: PickCard = { ...base, dest: { ...base.dest, app: view.app } }
    return (
      <Shell>
        {sheet}
        {errorBar}
        <OrderExact card={card} busy={busy === view.id} onBack={() => go({ v: 'plan' })} onOpen={() => order(view.id, view.app)} />
      </Shell>
    )
  }

  // ---------- how to cook it ----------
  if (view.v === 'cook') {
    const pick = picks[view.id]
    if (!pick) { setView({ v: 'plan' }); return null }
    return (
      <Shell>
        {errorBar}
        <TopBack label="MY DAY" onClick={() => go({ v: confirmed ? 'plan' : 'review' })} />
        <div className="relative rounded-3xl overflow-hidden mt-3" style={{ height: 210, background: C.card }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {pick.photo && <img src={pick.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        </div>
        <span className="mt-4" style={{ ...mono(12), color: C.gold }}>{TITLE[DEFS.find((d) => d.id === view.id)!.label].toUpperCase()} · {pick.cal} CAL</span>
        <h1 className="mt-1" style={head(40)}>{pick.short}</h1>
        <Section title="WHAT YOU NEED">
          {pick.ingredients?.length ? (
            <ul className="flex flex-col gap-1.5" style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 17 }}>
              {pick.ingredients.map((i) => <li key={i}>• {i}</li>)}
            </ul>
          ) : <p style={{ margin: 0, fontSize: 16, color: C.soft }}>Everything is in the name. Make it your way.</p>}
        </Section>
        <div className="h-4" />
        <EatButton eaten={!!pick.eatenId} busy={busy === view.id} onEat={() => markEaten(view.id)} onUndo={() => unEat(view.id)} />
      </Shell>
    )
  }

  // ---------- her day (review before confirming, and the confirmed plan) ----------
  const rows = active.map((s) => ({ s, pick: picks[s.id], title: TITLE[DEFS.find((d) => d.id === s.id)!.label] }))
  const total = planned()
  return (
    <Shell>
      {sheet}
      {errorBar}
      <span style={{ ...mono(12), color: C.gold }}>{confirmed ? 'YOUR DAY IS SET' : 'ALMOST DONE'}</span>
      <h1 className="mt-1 mb-1" style={head(52)}>{confirmed ? 'Your day.' : 'Here’s your day.'}</h1>
      <p className="mb-4" style={{ margin: 0, fontSize: 16, color: C.soft }}>
        {confirmed
          ? (eatenCal > 0 ? `Eaten ${eatenCal.toLocaleString()} of ${total.toLocaleString()} calories so far.` : 'When you eat a meal, tap “I ate it”.')
          : `${total.toLocaleString()} calories in all. Tap Change to swap a meal.`}
      </p>
      {confirmed && p.moneyDaily != null && <MoneyBar daily={p.moneyDaily} spent={p.moneySpent} />}
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
                <span style={{ ...mono(11), color: C.gold }}>{title.toUpperCase()}</span>
                {pick ? (
                  <>
                    <span className="block mt-0.5" style={{ ...head(22), lineHeight: 1 }}>{pick.short}</span>
                    <span className="block mt-1" style={{ fontSize: 14, color: C.soft }}>
                      {pick.kind === 'cook' ? 'Cook it' : pick.place} · {pick.cal} cal{pick.price != null ? ` · about $${Math.round(pick.price)}` : ''}
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
            {confirmed && pick && (
              <div className="flex flex-col gap-2 px-3 pb-3">
                {canOrder(pick) && !pick.eatenId && (
                  <div className="grid grid-cols-2 gap-2">
                    {(['doordash', 'ubereats'] as const).map((a) => (
                      <button key={a} type="button" onClick={() => go({ v: 'order', id: s.id, app: a })} disabled={busy === s.id}
                        className="nf-press rounded-full disabled:opacity-60" style={{ height: 48, background: a === p.orderApp ? C.gold : 'transparent', color: a === p.orderApp ? C.bg : C.ivory, border: `2px solid ${a === p.orderApp ? C.gold : 'rgba(237,231,218,.3)'}`, ...mono(11) }}>
                        ORDER ON {ORDER_APP_LABEL[a].toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
                {pick.kind === 'cook' && (
                  <button type="button" onClick={() => go({ v: 'cook', id: s.id })} className="nf-press rounded-full" style={{ height: 48, background: pick.eatenId ? 'transparent' : C.gold, color: pick.eatenId ? C.gold : C.bg, border: `2px solid ${C.gold}`, ...mono(12) }}>
                    HOW TO MAKE IT
                  </button>
                )}
                <EatButton eaten={!!pick.eatenId} busy={busy === s.id} onEat={() => { hapticTap(); markEaten(s.id) }} onUndo={() => unEat(s.id)} small />
              </div>
            )}
            {i >= PLAN_STOPS.length && !pick?.eatenId && (
              <button type="button" onClick={() => removeSnack(s.id)} className="block w-full pb-3 underline underline-offset-2" style={{ fontSize: 14, color: C.faint }}>Remove this snack</button>
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
      ) : (
        <p className="text-center" style={{ margin: 0, fontSize: 14, color: C.faint }}>Want something different? Tap Change on any meal you haven&apos;t eaten.</p>
      )}
    </Shell>
  )
}

// ---- pieces ----

function Shell({ children }: { children: ReactNode }) {
  return <div className="nf-screen flex-1 flex flex-col pb-6" style={{ color: C.ivory, fontFamily: BODY }}>{children}</div>
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
      style={{ height: small ? 48 : 58, background: 'transparent', color: C.mint, border: '2px solid rgba(159,220,196,.6)', ...mono(small ? 12 : 14) }}>
      {busy ? 'SAVING…' : 'I ATE IT'}
    </button>
  )
}

// Two cards for one meal, the same look as before: tap one to pick it,
// "Not this one" swaps a card, Shuffle swaps the other. Order out / Cook it
// switches the kind of meal for just this one.
function PickStep({ stop, step, total, picked, defaultMode, room, askLocation, onPick, onSkip, onBack, backLabel, onNext, nextLabel }: {
  stop: DayStop; step: number; total: number; picked: PlannedPick | null | undefined; defaultMode: Mode; room: number | null; askLocation: boolean
  onPick: (c: DayCard) => void; onSkip: () => void; onBack: () => void; backLabel: string; onNext: () => void; nextLabel: string
}) {
  const kinds: Mode[] = [...(stop.out.length ? ['out' as const] : []), ...(stop.cook.length ? ['cook' as const] : [])]
  const startMode: Mode = picked ? picked.kind : defaultMode === 'mix' && kinds.length < 2 ? (kinds[0] || 'cook') : kinds.includes(defaultMode as 'out') || defaultMode === 'mix' ? defaultMode : (kinds[0] || 'cook')
  const [mode, setMode] = useState<Mode>(startMode)
  const list = (() => {
    let l: DayCard[]
    if (mode === 'mix') {
      l = []
      for (let i = 0; i < Math.max(stop.out.length, stop.cook.length); i++) { if (stop.out[i]) l.push(stop.out[i]); if (stop.cook[i]) l.push(stop.cook[i]) }
    } else l = mode === 'out' ? stop.out : stop.cook
    // An extra snack only shows what still fits her day (or the lightest).
    if (room != null) {
      const fit = l.filter((c) => c.cal <= room)
      l = fit.length ? fit : [...l].sort((a, b) => a.cal - b.cal).slice(0, 2)
    }
    // Her current pick stays on screen when she comes back to this meal.
    const mine = picked && (l.find((c) => c.key === picked.key) || [...stop.out, ...stop.cook].find((c) => c.key === picked.key))
    return mine ? [mine, ...l.filter((c) => c.key !== mine.key)] : l
  })()
  const [pair, setPair] = useState<[number, number]>([0, 1])
  const [cursor, setCursor] = useState(2)
  const shown = list.length < 2 ? (list.length ? [0] : []) : pair
  const canSwap = list.length > 2
  function swap(pos: number) {
    const keep = shown[1 - pos]
    for (let k = 0; k < list.length; k++) {
      const idx = (cursor + k) % list.length
      if (idx === keep || idx === shown[pos]) continue
      hapticTap()
      setPair((pr) => (pos === 0 ? [idx, pr[1]] : [pr[0], idx]))
      setCursor(idx + 1)
      return
    }
  }
  const switchMode = (m: Mode) => { hapticTap(); setMode(m); setPair([0, 1]); setCursor(2) }
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
      {total > 0 && <span style={{ ...mono(12), color: C.soft }}>MEAL {step} OF {total}</span>}
      <h1 className="mt-1 mb-1" style={head(46)}>Pick your {title.toLowerCase()}.</h1>
      <p className="mb-3" style={{ margin: 0, fontSize: 16, color: C.soft }}>{over ? `Your day is full. These go a little over.` : 'Tap the one you want.'}</p>

      {kinds.length > 1 && (
        <div className="flex gap-2 mb-3" role="tablist" aria-label="Kind of meal">
          {([...(defaultMode === 'mix' ? [['mix', 'Both']] : []), ['out', '🛵 Order out'], ['cook', '🍳 Cook it']] as [Mode, string][]).map(([m, l]) => (
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
              <button type="button" onClick={() => onPick(c)} aria-label={`Pick ${c.short}, ${c.kind === 'cook' ? 'cook it' : c.place}, ${c.cal} calories`} className="nf-press absolute inset-0 w-full h-full text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,0) 30%, rgba(2,31,22,0.94) 100%)' }} />
                <span className="absolute left-4 right-4 bottom-3 flex items-end justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block" style={{ ...head(26), lineHeight: 0.95 }}>{c.short}</span>
                    <span className="block mt-1" style={{ ...mono(11), color: C.soft }}>
                      {c.kind === 'cook' ? 'COOK IT' : c.place.toUpperCase()}{c.price != null && <> · <span style={{ color: C.gold }}>${c.price}</span></>}
                    </span>
                  </span>
                  <span className="shrink-0 text-right leading-none">
                    <span className="block tabular-nums" style={{ ...head(36), lineHeight: 1, color: C.gold }}>{c.cal}</span>
                    <span className="block mt-0.5" style={{ ...mono(10), color: C.soft }}>CAL</span>
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
