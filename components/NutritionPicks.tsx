'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { MealOption, EatStyle, OrderDestination } from '@/lib/meal-pick'

// The Nutrition tab's decision screen, v4 (2026-10-20, Asa's mockup
// https://claude.ai/artifact/K8zUHkNNUFkipumXE3k6s5): two big photos, one
// tap. No numbers to read but the price and calories on the photo.
// The swap law (Asa): never "Neither", never a third option — ↻ on a card
// takes that one away and puts another in its place. Always exactly two.
export type PickCard = MealOption & { dest: OrderDestination; photo: string; short: string }

const C = {
  bg: '#021F16', card: '#08281d', line: '#0d3a2a', green: '#4CAF7D', gold: '#E5A93C', pink: '#EA5C87',
  ivory: '#EDE7DA', muted: 'rgba(237,231,218,0.55)', faint: 'rgba(237,231,218,0.35)',
}
const DISPLAY = 'var(--font-fraunces), Georgia, serif'

// Two genuinely different meals: another restaurant when eating out,
// another dish when cooking.
const differs = (a: MealOption, b: MealOption) => (a.kind === 'out' ? a.place !== b.place : a.name !== b.name)

type Props = {
  cards: PickCard[]           // ranked best first
  slot: string                // 'Lunch'
  heading: string             // 'Pick your lunch.'
  remainingCal: number
  nextUp: string | null       // 'Next up: your dinner, around 5pm.'
  refreshInMin: number        // when this meal's time is up
}

export default function NutritionPicks({ cards, slot, heading, remainingCal, nextUp, refreshInMin }: Props) {
  const router = useRouter()
  // Indexes into `cards` for the two on screen, plus where the next swap
  // starts looking. Starts on the engine's own top pair.
  const [shown, setShown] = useState<number[]>(() => {
    if (cards.length < 2) return cards.length ? [0] : []
    // "A mix" eaters (one home pick + one eat-out pick): the other kind
    // always wins the second spot, even over a look-alike photo.
    const otherKind = cards.findIndex((c, i) => i > 0 && c.kind !== cards[0].kind)
    if (otherKind > 0) return [0, otherKind]
    // Two photos that look different whenever there's a choice.
    const second = cards.findIndex((c, i) => i > 0 && c.photo !== cards[0].photo && differs(c, cards[0]))
    return [0, second > 0 ? second : 1]
  })
  const [cursor, setCursor] = useState(2)
  const [fading, setFading] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ card: PickCard; left: number; entryId: string | null } | null>(null)
  const meal = slot.toLowerCase()

  // Never stagnant: when this meal's time passes, or she comes back to the
  // app (from DoorDash, from another tab), fetch what's up now. Not while
  // the done screen is showing — that's her confirmation.
  const doneRef = useRef(false)
  doneRef.current = !!done
  useEffect(() => {
    const t = setTimeout(() => { if (!doneRef.current) router.refresh() }, refreshInMin * 60000 + 5000)
    const onVis = () => { if (document.visibilityState === 'visible' && !doneRef.current) router.refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onVis) }
  }, [refreshInMin, router])

  const post = (body: object) => fetch('/api/plan/meal-pick', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).catch(() => null)

  // Take card `pos` away, put the next one in. Prefers a different
  // restaurant (or dish) from the card that stays, then wraps around.
  function swap(pos: number) {
    const other = shown[1 - pos]
    const out = shown[pos]
    const n = cards.length
    const mixed = cards.some((c) => c.kind !== cards[0].kind)
    let pick = -1
    // Strictest first: a different place/dish AND a different-looking photo
    // from the card that stays; then loosen.
    for (const level of [2, 1, 0]) {
      for (let k = 0; k < n && pick < 0; k++) {
        const idx = (cursor + k) % n
        if (idx === out || idx === other) continue
        // A mix keeps its shape: a home pick swaps for another home pick.
        if (mixed && cards[idx].kind !== cards[out].kind) continue
        if (other != null && level >= 1 && !differs(cards[idx], cards[other])) continue
        if (other != null && level >= 2 && cards[idx].photo === cards[other].photo) continue
        pick = idx
      }
      if (pick >= 0) break
    }
    if (pick < 0) return
    post({ action: 'skipped', keys: [cards[out].key] })
    setFading(pos)
    setTimeout(() => {
      setShown((s) => s.map((v, i) => (i === pos ? pick : v)))
      setCursor(pick + 1)
      setFading(null)
    }, 180)
  }

  async function choose(card: PickCard) {
    if (busy) return
    setBusy(true)
    // Open her delivery app inside the tap itself — browsers block a new
    // window opened after an await.
    if (card.dest.url) window.open(card.dest.url, '_blank', 'noopener,noreferrer')
    let entryId: string | null = null
    try {
      const res = await fetch('/api/plan/food-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: card.name, brand: card.place, meal, servings: 1,
          calories: card.cal, protein_g: card.protein, carbs_g: card.carbs, fats_g: card.fat,
          source: 'meal_pick',
        }),
      })
      const day = await res.json().catch(() => null) as { entries?: { id: string; name: string; meal: string }[] } | null
      entryId = (day?.entries || []).filter((e) => e.name === card.name && e.meal === meal).pop()?.id || null
      post({ action: 'picked', key: card.key })
    } catch { /* still show done — the order app is already open */ }
    setDone({ card, left: Math.max(0, remainingCal - card.cal), entryId })
    setBusy(false)
  }

  async function undo() {
    if (!done) return
    if (done.entryId) await fetch(`/api/plan/food-log?id=${encodeURIComponent(done.entryId)}`, { method: 'DELETE' }).catch(() => {})
    setDone(null)
    router.refresh()
  }

  // ---------- after she taps ----------
  if (done) {
    const { card, left } = done
    const pct = remainingCal > 0 ? Math.min(100, Math.round(((remainingCal - left) / remainingCal) * 100)) : 100
    const appName = card.dest.app === 'ubereats' ? 'Uber Eats' : 'DoorDash'
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 pb-6 overflow-y-auto">
        <div className="rounded-full grid place-items-center shrink-0" style={{ width: 150, height: 150, background: `conic-gradient(${C.line} 0 ${pct}%, ${C.green} ${pct}% 100%)` }}>
          <div className="rounded-full grid place-items-center" style={{ width: 122, height: 122, background: C.bg }}>
            <div>
              <p className="text-[34px] font-bold leading-none tabular-nums" style={{ color: C.ivory, fontFamily: DISPLAY }}>{left.toLocaleString()}</p>
              <p className="text-[11px] mt-1" style={{ color: C.muted }}>cal left</p>
            </div>
          </div>
        </div>
        <h2 className="text-[28px] font-bold mt-4" style={{ color: C.ivory, fontFamily: DISPLAY }}>Done. You&apos;re on track.</h2>

        {card.dest.url ? (
          <>
            <p className="text-sm" style={{ color: C.muted }}>Opening {card.place} on {appName}…</p>
            <p className="text-[13px] max-w-xs" style={{ color: C.ivory }}>Order: {card.name}</p>
            <a href={card.dest.url} target="_blank" rel="noopener noreferrer"
              className="w-full max-w-sm text-center rounded-2xl py-4 mt-2 font-bold text-[15px] active:scale-[0.98] transition-transform"
              style={{ background: `linear-gradient(90deg, ${C.gold}, ${C.pink})`, color: '#0A0A0F' }}>
              Didn&apos;t open? Tap here
            </a>
          </>
        ) : card.ingredients && card.ingredients.length > 0 ? (
          <div className="w-full max-w-sm text-left rounded-2xl p-4 mt-1" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: C.green }}>What you need</p>
            <ul className="text-sm space-y-1" style={{ color: C.ivory }}>
              {card.ingredients.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </div>
        ) : (
          <p className="text-sm" style={{ color: C.muted }}>{card.dest.label}.</p>
        )}

        {nextUp && <p className="text-[13px] mt-2" style={{ color: C.green }}>{nextUp}</p>}
        <button onClick={() => { setDone(null); router.refresh() }} className="text-sm py-2 mt-1" style={{ color: C.muted }}>Back</button>
        <button onClick={undo} className="text-xs underline underline-offset-2" style={{ color: C.faint }}>Tapped by mistake? Undo</button>
      </div>
    )
  }

  // ---------- the two photos ----------
  if (shown.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
        <h1 className="text-[26px] font-bold" style={{ color: C.ivory, fontFamily: DISPLAY }}>Nothing fits right now.</h1>
        <Link href="/plan/nutrition/log" className="text-sm underline underline-offset-[3px]" style={{ color: C.gold }}>Change how you eat</Link>
      </div>
    )
  }

  const canSwap = cards.length > shown.length
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <h1 className="text-[30px] font-bold leading-tight mb-4" style={{ color: C.ivory, fontFamily: DISPLAY }}>{heading}</h1>
      <div className="flex-1 flex flex-col gap-3.5 min-h-0 pb-4">
        {shown.map((idx, pos) => {
          const c = cards[idx]
          return (
            <div key={pos} className="relative flex-1 min-h-[150px] rounded-3xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <button onClick={() => choose(c)} disabled={busy} aria-label={`${c.short}, ${c.place}, ${c.cal} calories`}
                className="absolute inset-0 w-full h-full text-left active:scale-[0.98] transition-transform disabled:opacity-70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photo} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200" style={{ opacity: fading === pos ? 0 : 1 }} />
                <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,0) 35%, rgba(2,31,22,0.92) 100%)' }} />
                <span className="absolute left-4 right-4 bottom-3.5 flex items-end justify-between gap-3 transition-opacity duration-200" style={{ opacity: fading === pos ? 0 : 1 }}>
                  <span className="min-w-0">
                    <span className="block font-bold text-[19px] leading-tight" style={{ color: C.ivory }}>{c.short}</span>
                    <span className="block text-[13px] mt-0.5" style={{ color: 'rgba(237,231,218,0.8)' }}>
                      {c.kind === 'cook' ? 'Cook it' : c.place}
                      {c.price != null && <> · <b className="font-semibold" style={{ color: C.gold }}>${c.price}</b></>}
                    </span>
                  </span>
                  <span className="shrink-0 text-right leading-none">
                    <span className="block text-[30px] font-bold tabular-nums" style={{ color: C.ivory, fontFamily: DISPLAY }}>{c.cal}</span>
                    <span className="block text-[11px] mt-0.5" style={{ color: C.muted }}>cal</span>
                  </span>
                </span>
              </button>
              {canSwap && (
                <button onClick={() => swap(pos)} disabled={busy} aria-label="Swap this one"
                  className="absolute top-3 right-3 w-10 h-10 rounded-full grid place-items-center active:rotate-180 transition-transform duration-300"
                  style={{ background: 'rgba(2,31,22,0.72)', border: '1px solid rgba(237,231,218,0.25)', backdropFilter: 'blur(6px)' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={C.ivory} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" />
                  </svg>
                </button>
              )}
            </div>
          )
        })}
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
      <p className="text-[28px] font-bold" style={{ color: C.ivory, fontFamily: DISPLAY }}>How do you usually eat?</p>
      <p className="text-sm -mt-1 mb-2" style={{ color: C.muted }}>One tap. We&apos;ll pick every meal to fit it.</p>
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
