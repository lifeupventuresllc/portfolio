'use client'

// Nutrition tab test (2026-11-09, Asa #6): compare two ways to eat, plus a
// quick one. The day planner (Plan my day) is unchanged and still the default.
//   Option A "Plan my day": pick breakfast, lunch, dinner → order (NutritionDay).
//   Option B "Near me": food near her that fits her day — tap one to order.
//   "One meal now": just the meal for right now, two picks, tap one.
// Each switch and order tap is tracked (event 'nutrition_option') so real
// users show which one wins. Links for testers: /plan/nutrition?try=near, ?try=now.
import { useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { orderLink, openOrder, appFirstOn, ORDER_APP_LABEL, type OrderApp } from '@/lib/order-link'
import { trackEvent } from '@/lib/track'
import LocationOptIn from '@/components/LocationOptIn'
import type { DayCard } from '@/components/NutritionDay'

export type TryOption = 'day' | 'near' | 'now'
const C = { bg: '#021F16', card: '#08281d', gold: '#FFB21E', ivory: '#EDE7DA', soft: 'rgba(237,231,218,.72)', faint: 'rgba(237,231,218,.45)', line: 'rgba(237,231,218,.14)' }
const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const TABS: [TryOption, string][] = [['day', 'Plan my day'], ['near', 'Near me'], ['now', 'One meal now']]

export function TrySwitch({ current }: { current: TryOption }) {
  const router = useRouter()
  const params = useSearchParams()
  const go = (t: TryOption) => {
    if (t === current) return
    trackEvent('nutrition_option', { option: t, action: 'open' })
    const q = new URLSearchParams(params?.toString() || '')
    if (t === 'day') q.delete('try'); else q.set('try', t)
    router.push(`/plan/nutrition${q.toString() ? `?${q}` : ''}`)
  }
  return (
    <div role="tablist" aria-label="How do you want to eat?" className="flex gap-1.5 p-1 rounded-full mb-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      {TABS.map(([t, l]) => (
        <button key={t} role="tab" type="button" aria-selected={t === current} onClick={() => go(t)} className="nf-press flex-1 rounded-full"
          style={{ height: 40, fontSize: 14, fontWeight: 700, background: t === current ? C.ivory : 'transparent', color: t === current ? C.bg : C.ivory }}>{l}</button>
      ))}
    </div>
  )
}

function FoodCard({ c, orderApp, option, children }: { c: DayCard; orderApp: OrderApp; option: TryOption; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const out = c.kind === 'out' && c.place !== 'Grab & go'
  const tap = () => {
    trackEvent('nutrition_option', { option, action: out ? 'order' : 'cook', meal: c.key, cal: c.cal })
    if (out) openOrder(orderLink({ place: c.place, name: c.name, key: c.key }, orderApp), appFirstOn())
    else setOpen((x) => !x)
  }
  return (
    <div className="rounded-[20px] overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {c.photo && <img src={c.photo} alt="" className="w-full object-cover" style={{ height: 150 }} />}
      <div className="p-4 flex flex-col gap-1.5">
        <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 24, lineHeight: 1, textTransform: 'uppercase', color: C.ivory }}>{c.short || c.name}</span>
        <span className="text-[14px]" style={{ color: C.soft }}>{c.place} · {c.cal} cal{c.price != null ? ` · about $${Math.round(c.price)}` : ''}</span>
        {children}
        <button type="button" onClick={tap} className="nf-press mt-2 w-full rounded-full uppercase"
          style={{ height: 52, fontSize: 15, fontWeight: 800, letterSpacing: '.04em', background: C.gold, color: C.bg }}>
          {out ? `Order on ${ORDER_APP_LABEL[orderApp]}` : open ? 'Hide' : 'What you need'}
        </button>
        {open && c.ingredients?.length ? (
          <ul className="mt-2 text-[14px] flex flex-col gap-1" style={{ color: C.soft, margin: 0, paddingLeft: 18 }}>{c.ingredients.map((x, i) => <li key={i}>{x}</li>)}</ul>
        ) : null}
      </div>
    </div>
  )
}

/** Option B: food near her that fits her day. Tap one to order. */
export function NearMe({ cards, orderApp, askLocation }: { cards: DayCard[]; orderApp: OrderApp; askLocation: boolean }) {
  return (
    <div className="flex flex-col gap-3 pb-6">
      <h1 style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 40, lineHeight: 0.92, textTransform: 'uppercase', color: C.ivory }}>Food near you</h1>
      <p className="text-[15px]" style={{ color: C.soft, margin: 0 }}>Every one fits your calories and food money. Tap one.</p>
      {askLocation && <LocationOptIn prompt="Show places open near you right now?" refreshOnPing large />}
      {cards.length ? cards.map((c) => <FoodCard key={c.key} c={c} orderApp={orderApp} option="near" />)
        : <p className="text-[15px]" style={{ color: C.faint }}>Nothing near you fits right now. Try Plan my day.</p>}
    </div>
  )
}

/** Quick: just the meal for right now — two picks. */
export function OneMealNow({ label, cards, orderApp, askLocation }: { label: string; cards: DayCard[]; orderApp: OrderApp; askLocation: boolean }) {
  return (
    <div className="flex flex-col gap-3 pb-6">
      <h1 style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 40, lineHeight: 0.92, textTransform: 'uppercase', color: C.ivory }}>{label} now</h1>
      <p className="text-[15px]" style={{ color: C.soft, margin: 0 }}>Two picks that fit what you have left today. Tap one.</p>
      {askLocation && <LocationOptIn prompt="Show places open near you right now?" refreshOnPing large />}
      {cards.length ? cards.map((c) => <FoodCard key={c.key} c={c} orderApp={orderApp} option="now" />)
        : <p className="text-[15px]" style={{ color: C.faint }}>You&apos;ve hit your number for today. Nice work.</p>}
    </div>
  )
}
