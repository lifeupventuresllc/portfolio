'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { MealOption, EatStyle, OrderDestination } from '@/lib/meal-pick'
import { orderParts, skipLine, chainAddOns, GENERIC_ADDONS, type AddOn } from '@/lib/order-exact'
import { hapticTap } from '@/lib/haptics'

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
// The new simple look (2026-10-25) for the order + logged screens.
const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const BODY = "var(--font-inter), Inter, system-ui, sans-serif"
const SOFT = 'rgba(237,231,218,.72)'
const MINT = '#9FDCC4'
const head = (size: number) => ({ margin: 0, fontFamily: HEAD, fontStyle: 'italic' as const, fontWeight: 800, fontSize: size, lineHeight: 0.86, textTransform: 'uppercase' as const })
const mono = (size: number) => ({ fontFamily: MONO, fontWeight: 700, fontSize: size, letterSpacing: '.12em' })
const ghostBtn = { height: 46, borderRadius: 999, border: '2px solid rgba(237,231,218,.22)', background: 'transparent', color: C.ivory, ...mono(12) }

// One food-log row, returning its id so it can be taken back out.
async function logFood(body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch('/api/plan/food-log', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const day = await res.json().catch(() => null) as { entries?: { id: string; name: string; meal: string }[] } | null
  return (day?.entries || []).filter((e) => e.name === body.name && e.meal === body.meal).pop()?.id || null
}
const unlog = (id: string) => fetch(`/api/plan/food-log?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null)

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
  calBudget?: number          // her whole day, for the bar on the logged screen
}

export default function NutritionPicks({ cards, slot, heading, remainingCal, nextUp, refreshInMin, calBudget }: Props) {
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
  // 2026-10-26 (Asa's mockup): an eat-out tap shows "Order exactly this"
  // first, so what she orders is what we count.
  const [ordering, setOrdering] = useState<PickCard | null>(null)
  const meal = slot.toLowerCase()

  // Never stagnant: when this meal's time passes, or she comes back to the
  // app (from DoorDash, from another tab), fetch what's up now. Not while
  // the done screen is showing — that's her confirmation (same for the order
  // screen: she's mid-order).
  const doneRef = useRef(false)
  doneRef.current = !!done || !!ordering
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
      entryId = await logFood({
        name: card.name, brand: card.place, meal, servings: 1,
        calories: card.cal, protein_g: card.protein, carbs_g: card.carbs, fats_g: card.fat,
        source: 'meal_pick',
      })
      post({ action: 'picked', key: card.key })
    } catch { /* still show done — the order app is already open */ }
    setDone({ card, left: Math.max(0, remainingCal - card.cal), entryId })
    setOrdering(null)
    setBusy(false)
  }

  async function undo() {
    if (!done) return
    if (done.entryId) await unlog(done.entryId)
    setDone(null)
    router.refresh()
  }

  // A delivery pick goes through "Order exactly this"; home + grab-and-go
  // picks keep the one-tap flow.
  const tapCard = (card: PickCard) => {
    if (card.kind === 'out' && card.dest.url) { hapticTap(); setOrdering(card) } else choose(card)
  }

  // ---------- order exactly this ----------
  if (ordering) return <OrderExact card={ordering} busy={busy} onBack={() => setOrdering(null)} onOpen={() => choose(ordering)} />

  // ---------- after she taps ----------
  if (done && done.card.kind === 'out' && done.card.dest.url) {
    return <Logged done={done} slot={slot} meal={meal} remainingCal={remainingCal} calBudget={calBudget} nextUp={nextUp} />
  }
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
              <button onClick={() => tapCard(c)} disabled={busy} aria-label={`${c.short}, ${c.place}, ${c.cal} calories`}
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

// "Order exactly this." (2026-10-26, Asa's approved mockup OrderExact): the
// meal split into the parts she adds in the delivery app, each one tapped
// off with a gold check. Tapping is optional — the button never waits on it.
function OrderExact({ card, busy, onBack, onOpen }: { card: PickCard; busy: boolean; onBack: () => void; onOpen: () => void }) {
  const parts = orderParts(card.name)
  const [on, setOn] = useState<number[]>([])
  const appName = card.dest.app === 'ubereats' ? 'UBER EATS' : 'DOORDASH'
  const allSet = parts.length > 0 && on.length === parts.length
  return (
    <div className="nf-screen flex-1 flex flex-col gap-3.5 pb-6" style={{ color: C.ivory, fontFamily: BODY }}>
      <style>{`.nf-pop{animation:nfPop .35s ease}@keyframes nfPop{0%{transform:scale(1)}40%{transform:scale(1.15)}100%{transform:scale(1)}}@media (prefers-reduced-motion: reduce){.nf-pop{animation:none}}`}</style>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => { hapticTap(); onBack() }} aria-label="Back" className="nf-press w-11 h-11 rounded-full grid place-items-center" style={{ background: 'rgba(237,231,218,.08)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ivory} strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span className="rounded-full px-3 py-2" style={{ ...mono(11), background: C.ivory, color: C.bg }}>{card.place.toUpperCase()} · {card.cal} CAL</span>
      </div>
      <div className="flex flex-col gap-1.5 px-1">
        <span style={{ ...mono(12), color: C.gold }}>TAP EACH ONE AS YOU ADD IT</span>
        <h1 className="nf-head" style={head(56)}>Order<br />exactly this.</h1>
      </div>
      <div className="flex flex-col gap-2">
        {parts.map((name, i) => {
          const c = on.includes(i)
          return (
            <button key={name} type="button" onClick={() => { hapticTap(); setOn(c ? on.filter((x) => x !== i) : on.concat(i)) }}
              aria-pressed={c} className="nf-press flex items-center gap-3 text-left"
              style={{ minHeight: 52, padding: '10px 14px', borderRadius: 16, border: `2px solid ${c ? C.gold : 'rgba(237,231,218,.2)'}`, background: c ? 'rgba(229,169,60,.12)' : 'rgba(237,231,218,.05)', color: C.ivory, fontSize: 16, fontWeight: 600 }}>
              <span key={`${i}-${c}`} className={c ? 'nf-pop' : ''} aria-hidden
                style={{ width: 26, height: 26, borderRadius: 999, border: `2px solid ${c ? C.gold : 'rgba(237,231,218,.2)'}`, background: c ? C.gold : 'transparent', color: C.bg, display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
                {c ? '✓' : ''}
              </span>
              {name}
            </button>
          )
        })}
      </div>
      <div style={{ borderRadius: 16, padding: '12px 14px', background: 'rgba(229,169,60,.1)', border: '1px solid rgba(229,169,60,.4)', fontSize: 14, lineHeight: 1.4 }}>
        <b style={{ color: C.gold }}>Skip these:</b> {skipLine(card.place)}. They add 100–500 cal.
      </div>
      <button type="button" onClick={() => { hapticTap(); onOpen() }} disabled={busy}
        className="nf-press mt-auto w-full rounded-full disabled:opacity-70" style={{ height: 62, background: C.gold, color: C.bg, ...mono(16) }}>
        {allSet ? `ALL SET · OPEN ${appName}` : `OPEN ${appName}`}
      </button>
      <span className="text-center" style={{ fontSize: 13, color: 'rgba(237,231,218,.6)' }}>
        Opens {card.place} on {card.dest.app === 'ubereats' ? 'Uber Eats' : 'DoorDash'}. Delivery time shows there.
      </span>
    </div>
  )
}

// After the order button (2026-10-26, Asa's approved mockup OrderDone): it's
// counted already. "Got something different?" fixes the count in one tap —
// an add-on goes on top, a different meal goes to her food log instead.
function Logged({ done, slot, meal, remainingCal, calBudget, nextUp }: {
  done: { card: PickCard; left: number; entryId: string | null }
  slot: string; meal: string; remainingCal: number; calBudget?: number; nextUp: string | null
}) {
  const router = useRouter()
  const { card } = done
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<Record<string, { cal: number; id: string | null }>>({})
  const [leaving, setLeaving] = useState(false)
  const addedRef = useRef(added)
  addedRef.current = added
  const extra = Object.values(added).reduce((sum, a) => sum + a.cal, 0)
  const left = Math.max(0, done.left - extra)
  const whole = calBudget && calBudget > 0 ? calBudget : remainingCal
  const pct = whole > 0 ? Math.min(100, Math.max(0, Math.round(((whole - left) / whole) * 100))) : 100
  const appName = card.dest.app === 'ubereats' ? 'Uber Eats' : 'DoorDash'
  const official = chainAddOns(card.place)

  async function toggle(a: AddOn) {
    hapticTap()
    const cur = added[a.key]
    if (cur) {
      setAdded((s) => { const n = { ...s }; delete n[a.key]; return n })
      if (cur.id) await unlog(cur.id)
      return
    }
    setAdded((s) => ({ ...s, [a.key]: { cal: a.cal, id: null } }))
    const id = await logFood({
      name: a.official ? `${a.label} (added)` : `${a.label} (added, about)`, brand: card.place, meal, servings: 1,
      calories: a.cal, protein_g: a.protein || 0, carbs_g: 0, fats_g: 0, source: 'meal_pick_addon',
    }).catch(() => null)
    // Un-tapped before the save came back → take that row straight back out.
    if (!addedRef.current[a.key]) { if (id) unlog(id); return }
    setAdded((s) => (s[a.key] ? { ...s, [a.key]: { cal: a.cal, id } } : s))
  }

  // She got something else: take our count back out, log the real thing.
  async function differentMeal() {
    hapticTap()
    setLeaving(true)
    const ids = [done.entryId, ...Object.values(added).map((a) => a.id)].filter((x): x is string => !!x)
    await Promise.all(ids.map(unlog))
    router.push('/plan/nutrition/log')
  }

  const chip = (a: AddOn) => {
    const on = !!added[a.key]
    return (
      <button key={a.key} type="button" onClick={() => toggle(a)} aria-pressed={on}
        className="nf-press rounded-full px-3.5 flex items-center gap-1.5"
        style={{ height: 40, border: `2px solid ${on ? C.gold : 'rgba(237,231,218,.22)'}`, background: on ? 'rgba(229,169,60,.14)' : 'transparent', color: on ? C.gold : C.ivory, fontSize: 14, fontWeight: 600 }}>
        {on && <span aria-hidden>✓</span>}{a.label} <span style={{ ...mono(11), color: on ? C.gold : SOFT }}>+{a.cal}</span>
      </button>
    )
  }

  return (
    <div className="nf-screen flex-1 flex flex-col gap-4 pb-6" style={{ color: C.ivory, fontFamily: BODY }}>
      <div className="flex-1 flex flex-col justify-center gap-3.5 px-1">
        <span style={{ ...mono(12), color: MINT }}>LOGGED FOR YOU</span>
        <h1 className="nf-head" style={head(64)}>{slot} is<br />on its way.</h1>
        <p style={{ margin: 0, fontSize: 16, color: 'rgba(237,231,218,.8)' }}>We counted it already. Nothing else to do.</p>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="tabular-nums" style={{ ...head(72), lineHeight: 1, color: C.gold }}>{left.toLocaleString()}</span>
          <span style={{ ...mono(12), color: SOFT }}>CAL LEFT TODAY</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: 'rgba(237,231,218,.12)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: C.gold, borderRadius: 999, transition: 'width .4s ease' }} />
        </div>
        {nextUp && <span style={{ fontSize: 14, color: SOFT }}>{nextUp}</span>}
        {card.dest.url && (
          <a href={card.dest.url} target="_blank" rel="noopener noreferrer" className="self-start text-[13px] underline underline-offset-2" style={{ color: 'rgba(237,231,218,.55)' }}>
            Didn&apos;t open? Open {appName}
          </a>
        )}
      </div>

      <div className="flex flex-col gap-2.5" style={{ borderRadius: 20, padding: '14px 16px', background: 'rgba(237,231,218,.06)' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Got something different?</span>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { hapticTap(); setAdding((v) => !v) }} aria-expanded={adding} className="nf-press"
            style={{ ...ghostBtn, ...(adding ? { borderColor: C.gold, color: C.gold } : {}) }}>ADDED SOMETHING</button>
          <button type="button" onClick={differentMeal} disabled={leaving} className="nf-press disabled:opacity-60" style={ghostBtn}>DIFFERENT MEAL</button>
        </div>
        {adding && (
          <div className="nf-rise flex flex-col gap-2.5 pt-1">
            {official.length > 0 && (
              <>
                <span style={{ ...mono(10), color: SOFT }}>{card.place.toUpperCase()}&apos;S OWN NUMBERS</span>
                <div className="flex flex-wrap gap-2">{official.map(chip)}</div>
              </>
            )}
            <span style={{ ...mono(10), color: SOFT }}>ABOUT — OUR ESTIMATES</span>
            <div className="flex flex-wrap gap-2">{GENERIC_ADDONS.map(chip)}</div>
          </div>
        )}
        <span style={{ fontSize: 12, color: 'rgba(237,231,218,.6)' }}>One tap and we fix your calories.</span>
      </div>

      <Link href="/plan/today" onClick={() => hapticTap()} className="nf-press rounded-full flex items-center justify-center"
        style={{ height: 56, background: C.ivory, color: C.bg, ...mono(14) }}>BACK TO MY DAY</Link>
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
