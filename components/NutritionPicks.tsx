'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MealOption, EatStyle, OrderDestination } from '@/lib/meal-pick'
import { copyText } from '@/lib/order-exact'
import { hapticTap } from '@/lib/haptics'
import { moneyLeft, moneyTone, MONEY_COLOR } from '@/lib/food-budget'

// Shared pieces for the Nutrition tab (the day planner is components/
// NutritionDay.tsx since 2026-11-05). Card look from v4 (2026-10-20, Asa's mockup
// https://claude.ai/artifact/K8zUHkNNUFkipumXE3k6s5): two big photos, one
// tap. No numbers to read but the price and calories on the photo.
// The shoe salesman law (Asa, 2026-10-26): always exactly two. "Not this
// one" on a card takes THAT one away and brings the next in its spot; the
// card she didn't remove stays. SHUFFLE keeps her kept card and swaps the
// other. Never zero, never a wall of options.
export type PickCard = MealOption & { dest: OrderDestination; photo: string; short: string }

const C = {
  // gold = hot gold (rewards-plan.md §4): the pick buttons are this screen's one loud color.
  bg: '#021F16', card: '#08281d', line: '#0d3a2a', green: '#4CAF7D', gold: '#FFB21E',
  ivory: '#EDE7DA', muted: 'rgba(237,231,218,0.72)', faint: 'rgba(237,231,218,0.45)',
}
// The new simple look (2026-10-25) for the order + logged screens.
const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const BODY = "var(--font-inter), Inter, system-ui, sans-serif"
const SOFT = 'rgba(237,231,218,.72)'
const head = (size: number) => ({ margin: 0, fontFamily: HEAD, fontStyle: 'italic' as const, fontWeight: 800, fontSize: size, lineHeight: 0.86, textTransform: 'uppercase' as const })
const mono = (size: number) => ({ fontFamily: MONO, fontWeight: 700, fontSize: size, letterSpacing: '.12em' })
const ghostBtn = { height: 46, borderRadius: 999, border: '2px solid rgba(237,231,218,.22)', background: 'transparent', color: C.ivory, ...mono(12) }

// Today's food money (2026-10-30, Asa's "Budget display" spec): one number,
// one bar. The bar is what's left, so it goes down as she eats. Emerald over
// half, gold under half, coral under 20%.
export function MoneyBar({ daily, spent }: { daily: number; spent: number }) {
  const left = moneyLeft(daily, spent)
  const color = MONEY_COLOR[moneyTone(left, daily)]
  const pct = daily > 0 ? Math.min(100, Math.max(0, (left / daily) * 100)) : 0
  return (
    <div className="mb-4 flex flex-col gap-2" role="status" aria-label={`Today: $${Math.round(left)} left of $${Math.round(daily)}`}>
      <div className="flex items-baseline gap-2" aria-hidden>
        <span style={{ ...mono(11), color: SOFT }}>TODAY:</span>
        <span className="tabular-nums" style={{ ...head(30), lineHeight: 1, color, transition: 'color .3s ease' }}>${Math.round(left)}</span>
        <span style={{ ...mono(11), color: SOFT }}>LEFT OF ${Math.round(daily)}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(237,231,218,.12)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .4s ease, background-color .3s ease' }} />
      </div>
    </div>
  )
}

// For someone who finished intake before the 'eating' question existed: the
// same question, once, right here — one tap and her picks appear.
export function EatStyleAsk() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function set(style: EatStyle) {
    setBusy(true)
    await fetch('/api/plan/meal-pick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'style', eatStyle: style }) }).catch(() => null)
    router.refresh()
  }
  return (
    <div className="flex flex-col gap-3">
      <h1 className="nf-head" style={{ ...head(44), color: C.ivory }}>How do you<br />usually eat?</h1>
      <p className="text-sm mb-2" style={{ color: C.muted, fontFamily: BODY }}>One tap. We&apos;ll pick every meal to fit it.</p>
      {(['cook', 'out'] as EatStyle[]).map((s) => (
        <button key={s} onClick={() => set(s)} disabled={busy}
          className="w-full text-left rounded-2xl px-5 py-4 font-semibold active:scale-[0.99] transition-transform disabled:opacity-50"
          style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ivory }}>
          {s === 'cook' ? 'I mostly cook' : 'I mostly eat out'}
        </button>
      ))}
    </div>
  )
}

// The settings that used to sit on the picks screen — cook vs eat out, money
// for one meal, and which delivery app opens. Lives on /plan/nutrition/log.
export function FoodSettings({ eatStyle, mealBudget, orderApp }: { eatStyle: EatStyle | null; mealBudget: number; orderApp: 'doordash' | 'ubereats' }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState(mealBudget)
  async function save(body: object) {
    setBusy(true)
    await fetch('/api/plan/meal-pick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
    router.refresh()
    setBusy(false)
  }
  const chip = (on: boolean) => ({ background: on ? 'rgba(229,169,60,0.14)' : C.card, border: `1px solid ${on ? C.gold : C.line}`, color: on ? C.gold : C.ivory })
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.faint }}>How you eat</p>
        <div className="flex gap-2">
          {(['cook', 'out'] as EatStyle[]).map((s) => (
            <button key={s} disabled={busy} onClick={() => s !== eatStyle && save({ action: 'style', eatStyle: s })}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={chip(eatStyle === s)}>
              {s === 'cook' ? 'I mostly cook' : 'I mostly eat out'}
            </button>
          ))}
        </div>
      </div>
      {eatStyle && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.faint }}>Most you&apos;d spend on one meal</p>
          <div className="flex items-center gap-3">
            <button aria-label="Less" onClick={() => setDraft((b) => Math.max(2, b - 1))} className="w-10 h-10 rounded-full text-xl font-bold" style={{ border: `1px solid ${C.line}`, color: C.ivory }}>−</button>
            <p className="flex-1 text-center text-3xl font-bold tabular-nums" style={{ color: C.gold }}>${draft}</p>
            <button aria-label="More" onClick={() => setDraft((b) => Math.min(60, b + 1))} className="w-10 h-10 rounded-full text-xl font-bold" style={{ border: `1px solid ${C.line}`, color: C.ivory }}>+</button>
            <button onClick={() => save({ action: 'budget', mealBudget: draft })} disabled={busy || draft === mealBudget} className="rounded-xl px-4 py-2.5 font-bold text-sm disabled:opacity-40" style={{ background: C.gold, color: '#0A0A0F' }}>Save</button>
          </div>
        </div>
      )}
      {eatStyle === 'out' && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.faint }}>Order with</p>
          <div className="flex gap-2">
            {(['doordash', 'ubereats'] as const).map((a) => (
              <button key={a} disabled={busy} onClick={() => a !== orderApp && save({ action: 'order_app', orderApp: a })}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={chip(orderApp === a)}>
                {a === 'doordash' ? 'DoorDash' : 'Uber Eats'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// When she usually eats (habit memory, 2026-10-30): one row per meal —
// "Lunch · usually 12:30–1:30pm" — learned from her own meals, or a normal
// time until she has 3 days of one. Tap a row to set it herself; her time
// wins until she taps "Use my habits again". Lives on /plan/nutrition/log.
export type MealTimeRow = { meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'; minute: number; window: string; source: 'learned' | 'default' | 'set' }
const HABIT_GOLD = '#E5A93C'
const SOURCE_WORDS: Record<MealTimeRow['source'], string> = { learned: 'From your meals', default: 'Normal time', set: 'You set this' }
const MEAL_WORDS: Record<MealTimeRow['meal'], string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }
const clock = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440, h = Math.floor(m / 60)
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`
}

export function MealTimesSettings({ rows }: { rows: MealTimeRow[] }) {
  const router = useRouter()
  const [open, setOpen] = useState<MealTimeRow['meal'] | null>(null)
  const [draft, setDraft] = useState(0)
  const [busy, setBusy] = useState(false)
  async function save(meal: MealTimeRow['meal'], minute: number | null) {
    setBusy(true)
    await fetch('/api/plan/meal-pick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'meal_time', meal, minute }) }).catch(() => null)
    setOpen(null)
    router.refresh()
    setBusy(false)
  }
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <p className="mb-1" style={{ ...mono(11), color: C.faint, textTransform: 'uppercase' }}>When you usually eat</p>
      {rows.map((r) => {
        const isOpen = open === r.meal
        return (
          <div key={r.meal} className="rounded-xl" style={{ border: `1px solid ${isOpen ? HABIT_GOLD : C.line}` }}>
            <button type="button" onClick={() => { hapticTap(); setOpen(isOpen ? null : r.meal); setDraft(r.minute) }}
              className="nf-press w-full flex items-center gap-3 px-3 py-3 text-left">
              <span style={{ ...head(22), color: C.ivory, lineHeight: 1 }}>{MEAL_WORDS[r.meal]}</span>
              <span className="flex-1 text-sm" style={{ color: C.muted }}>· usually {r.window}</span>
              <span style={{ ...mono(9), color: r.source === 'set' ? HABIT_GOLD : C.faint, textTransform: 'uppercase' }}>{SOURCE_WORDS[r.source]}</span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="15 minutes earlier" onClick={() => setDraft((d) => Math.max(0, d - 15))} className="w-10 h-10 rounded-full text-xl font-bold" style={{ border: `1px solid ${C.line}`, color: C.ivory }}>−</button>
                  <p className="flex-1 text-center text-3xl font-bold tabular-nums" style={{ color: HABIT_GOLD }}>{clock(draft)}</p>
                  <button type="button" aria-label="15 minutes later" onClick={() => setDraft((d) => Math.min(1425, d + 15))} className="w-10 h-10 rounded-full text-xl font-bold" style={{ border: `1px solid ${C.line}`, color: C.ivory }}>+</button>
                  <button type="button" onClick={() => save(r.meal, draft)} disabled={busy || (draft === r.minute && r.source === 'set')} className="rounded-xl px-4 py-2.5 font-bold text-sm disabled:opacity-40" style={{ background: HABIT_GOLD, color: '#0A0A0F' }}>Save</button>
                </div>
                {r.source === 'set' && (
                  <button type="button" onClick={() => save(r.meal, null)} disabled={busy} style={{ ...ghostBtn, height: 40 }}>Use my habits again</button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Meal-time picks on/off (Prompt 3, 2026-10-30): at her usual meal times one
// meal arrives as a notification with Yes / No. One tap turns it off (or
// back on). Lives on /plan/nutrition/log, above "When you usually eat".
export function MealOffersToggle({ on: initial }: { on: boolean }) {
  const [on, setOn] = useState(initial)
  const [busy, setBusy] = useState(false)
  async function flip() {
    hapticTap()
    const next = !on
    setOn(next)
    setBusy(true)
    const res = await fetch('/api/plan/meal-pick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'offers', on: next }) }).catch(() => null)
    if (!res || !res.ok) setOn(!next)
    setBusy(false)
  }
  return (
    <button type="button" role="switch" aria-checked={on} disabled={busy} onClick={flip}
      className="nf-press rounded-2xl p-4 flex items-center gap-3 text-left" style={{ background: C.card, border: `1px solid ${on ? HABIT_GOLD : C.line}` }}>
      <span className="flex-1 flex flex-col gap-1">
        <span style={{ ...mono(11), color: C.faint, textTransform: 'uppercase' }}>Meal-time picks: {on ? 'On' : 'Off'}</span>
        <span className="text-sm" style={{ color: C.muted }}>{on ? 'At your usual meal times we send one meal ready to go. Yes or no.' : 'Off. No meal notifications.'}</span>
      </span>
      <span aria-hidden className="shrink-0 rounded-full relative" style={{ width: 52, height: 30, background: on ? HABIT_GOLD : 'rgba(237,231,218,.18)', transition: 'background .15s' }}>
        <span className="absolute rounded-full" style={{ top: 3, left: on ? 25 : 3, width: 24, height: 24, background: on ? C.bg : C.ivory, transition: 'left .15s' }} />
      </span>
    </button>
  )
}

// "Open DoorDash, tap Search, paste." — when the browser blocked opening it.
export function CopyFallback({ text, appName }: { text: string; appName: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-col gap-2" style={{ borderRadius: 16, padding: '12px 14px', background: 'rgba(229,169,60,.1)', border: '1px solid rgba(229,169,60,.45)' }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>Open {appName}, find the restaurant, tap its menu search, paste.</span>
      <div className="flex items-center gap-2" style={{ borderRadius: 12, padding: 5, paddingLeft: 12, background: C.ivory }}>
        <span className="flex-1 min-w-0 truncate" style={{ color: C.bg, fontSize: 16, fontWeight: 700 }}>{text}</span>
        <button type="button" onClick={() => { hapticTap(); copyText(text); setCopied(true) }} className="nf-press shrink-0 rounded-lg px-4" style={{ height: 40, background: C.gold, color: C.bg, ...mono(12) }}>{copied ? 'COPIED ✓' : 'COPY'}</button>
      </div>
    </div>
  )
}
