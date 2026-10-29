'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { MealOption, EatStyle, OrderDestination } from '@/lib/meal-pick'
import { orderParts, skipLine, chainAddOns, GENERIC_ADDONS, pasteText, copyText, type AddOn } from '@/lib/order-exact'
import { hapticTap } from '@/lib/haptics'
import LocationOptIn from '@/components/LocationOptIn'
import MealDrop from '@/components/MealDrop'

// The Nutrition tab's decision screen, v4 (2026-10-20, Asa's mockup
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
const MINT = '#9FDCC4'
const head = (size: number) => ({ margin: 0, fontFamily: HEAD, fontStyle: 'italic' as const, fontWeight: 800, fontSize: size, lineHeight: 0.86, textTransform: 'uppercase' as const })
const mono = (size: number) => ({ fontFamily: MONO, fontWeight: 700, fontSize: size, letterSpacing: '.12em' })
const ghostBtn = { height: 46, borderRadius: 999, border: '2px solid rgba(237,231,218,.22)', background: 'transparent', color: C.ivory, ...mono(12) }

// One food-log row, returning its id so it can be taken back out.
async function logFood(body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch('/api/plan/food-log', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  // A failed save must not look logged (2026-10-29 audit).
  if (!res.ok) throw new Error('save failed')
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
  askLocation?: boolean       // eating out with no fresh position → the "near you" ask, pick view only
}

export default function NutritionPicks({ cards, slot, heading, remainingCal, nextUp, refreshInMin, calBudget, askLocation }: Props) {
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
  // Keeps rotating (2026-10-29, Asa: "stuck on a protein shake and a chicken
  // bowl"): every time she opens this tab, a fresh pair from her best ~8
  // fits for this meal. Same rules as the first pair (other kind for a mix,
  // a different place and photo). After mount only, so the server render
  // and the first paint match.
  useEffect(() => {
    const n = Math.min(cards.length, 8)
    if (n < 3) return
    let visit = 0
    try {
      const k = `np-rot:${new Date().toDateString()}:${slot}`
      visit = Number(localStorage.getItem(k) || 0)
      localStorage.setItem(k, String(visit + 1))
    } catch { return }
    if (!visit) return
    const first = (visit * 2) % n
    const mixed = cards.some((c) => c.kind !== cards[first].kind)
    let second = -1
    for (let k = 1; k < n && second < 0; k++) {
      const i = (first + k) % n
      if (mixed ? cards[i].kind !== cards[first].kind : (differs(cards[i], cards[first]) && cards[i].photo !== cards[first].photo)) second = i
    }
    if (second < 0) second = (first + 1) % n
    setShown([first, second])
    setCursor((Math.max(first, second) + 1) % cards.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [fading, setFading] = useState<number | null>(null)
  // The card she kept — the one she didn't take away. Starts on card 1,
  // her best fit. SHUFFLE never touches it.
  const [kept, setKept] = useState(0)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ card: PickCard; left: number; entryId: string | null; failed?: boolean } | null>(null)
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
    hapticTap()
    post({ action: 'skipped', keys: [cards[out].key] })
    setKept(1 - pos)
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
    let failed = false
    try {
      entryId = await saveCard(card)
      post({ action: 'picked', key: card.key })
    } catch { failed = true /* still show done — the order app is already open */ }
    // Not saved → the number doesn't move, and the screen says so with a retry.
    setDone({ card, left: failed ? Math.max(0, remainingCal) : Math.max(0, remainingCal - card.cal), entryId, failed })
    setOrdering(null)
    setBusy(false)
  }

  const saveCard = (card: PickCard) => logFood({
    name: card.name, brand: card.place, meal, servings: 1,
    calories: card.cal, protein_g: card.protein, carbs_g: card.carbs, fats_g: card.fat,
    source: 'meal_pick',
  })

  // Retry a pick whose save failed (2026-10-29 audit).
  async function retrySave() {
    if (!done?.failed || busy) return
    setBusy(true)
    try {
      const entryId = await saveCard(done.card)
      post({ action: 'picked', key: done.card.key })
      setDone({ ...done, entryId, failed: false, left: Math.max(0, remainingCal - done.card.cal) })
    } catch { /* stays failed; she can tap again */ }
    setBusy(false)
  }
  const saveBanner = done?.failed ? (
    <button type="button" onClick={() => { hapticTap(); retrySave() }} disabled={busy}
      className="nf-press w-full text-left rounded-2xl px-4 py-3" style={{ background: 'rgba(255,90,78,.14)', border: '1px solid rgba(255,90,78,.5)', color: C.ivory, fontSize: 14 }}>
      <b>Couldn&apos;t count this meal.</b> {busy ? 'Trying…' : 'Tap to try again.'}
    </button>
  ) : null

  async function undo() {
    if (!done) return
    if (done.entryId) await unlog(done.entryId)
    setDone(null)
    router.refresh()
  }

  // SHUFFLE: keep the one she kept, swap the other.
  const shuffle = () => swap(1 - kept)

  // A delivery pick goes through "Order exactly this"; home + grab-and-go
  // picks keep the one-tap flow.
  const tapCard = (card: PickCard) => {
    // One tap (2026-10-29, Asa: "still so many steps"): copy her meal, open
    // the delivery site on that restaurant, and count it — all in this tap.
    // What to order shows on the next screen instead of a screen before.
    if (card.kind === 'out' && card.dest.url) { hapticTap(); copyText(pasteText(card.place, card.name)); choose(card) } else choose(card)
  }

  // ---------- order exactly this ----------
  if (ordering) return <OrderExact card={ordering} busy={busy} onBack={() => setOrdering(null)} onOpen={() => choose(ordering)} />

  // ---------- after she taps ----------
  if (done && done.card.kind === 'out' && done.card.dest.url) {
    return <Logged done={done} slot={slot} meal={meal} remainingCal={remainingCal} calBudget={calBudget} nextUp={nextUp} banner={saveBanner} />
  }
  if (done) {
    // A home or grab-and-go pick (2026-10-26: same new look as the order screens).
    const { card, left } = done
    const whole = calBudget && calBudget > 0 ? calBudget : remainingCal
    const pct = whole > 0 ? Math.min(100, Math.max(0, Math.round(((whole - left) / whole) * 100))) : 100
    return (
      <div className="nf-screen flex-1 flex flex-col gap-4 pb-6 overflow-y-auto" style={{ color: C.ivory, fontFamily: BODY }}>
        <div className="flex-1 flex flex-col justify-center gap-3.5 px-1">
          {saveBanner}
          {!done.failed && <span style={{ ...mono(12), color: MINT }}>LOGGED FOR YOU</span>}
          <h1 className="nf-head" style={head(60)}>Done.<br />You&apos;re on track.</h1>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="tabular-nums" style={{ ...head(72), lineHeight: 1, color: C.gold }}>{left.toLocaleString()}</span>
            <span style={{ ...mono(12), color: SOFT }}>CAL LEFT TODAY</span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: 'rgba(237,231,218,.12)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: C.gold, borderRadius: 999, transition: 'width .4s ease' }} />
          </div>
          {/* Meal drop (rewards-plan.md phase 4): the check, sometimes a bonus. */}
          <MealDrop slot={slot} left={left} />
          {card.ingredients && card.ingredients.length > 0 ? (
            <div className="nf-rise flex flex-col gap-2 mt-1" style={{ borderRadius: 20, padding: '14px 16px', background: 'rgba(237,231,218,.06)' }}>
              <span style={{ ...mono(11), color: C.gold }}>WHAT YOU NEED</span>
              <ul className="flex flex-col gap-1" style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 15 }}>
                {card.ingredients.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 15, color: SOFT }}>{card.dest.label}.</p>
          )}
          {nextUp && <span style={{ fontSize: 14, color: SOFT }}>{nextUp}</span>}
        </div>
        <button type="button" onClick={() => { hapticTap(); setDone(null); router.refresh() }} className="nf-press rounded-full"
          style={{ height: 56, background: C.ivory, color: C.bg, ...mono(14) }}>BACK</button>
        <button type="button" onClick={undo} className="self-center underline underline-offset-2" style={{ fontSize: 13, color: C.faint }}>Tapped by mistake? Undo</button>
      </div>
    )
  }

  // ---------- the two photos ----------
  const ask = askLocation ? <LocationOptIn prompt="Show meals open near you right now?" refreshOnPing large /> : null
  if (shown.length === 0) {
    return (
      <div className="nf-screen flex-1 flex flex-col gap-3" style={{ color: C.ivory, fontFamily: BODY }}>
        {ask}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          {remainingCal <= 0 ? (
            <>
              <h1 className="nf-head" style={head(44)}>You hit your<br />number today.</h1>
              <p style={{ margin: 0, fontSize: 15, color: SOFT }}>Still hungry? Water, tea or veggies. Fresh picks tomorrow.</p>
            </>
          ) : remainingCal < 250 ? (
            <>
              <h1 className="nf-head" style={head(44)}>{remainingCal} cal left.</h1>
              <p style={{ margin: 0, fontSize: 15, color: SOFT }}>No meal fits that. A piece of fruit or a protein shake will.</p>
            </>
          ) : (
            <h1 className="nf-head" style={head(44)}>Nothing fits<br />right now.</h1>
          )}
          <Link href="/plan/nutrition/log" className="underline underline-offset-[3px]" style={{ ...mono(12), color: C.gold }}>CHANGE HOW YOU EAT</Link>
        </div>
      </div>
    )
  }

  const canSwap = cards.length > shown.length
  return (
    <div className="nf-screen flex-1 flex flex-col min-h-0" style={{ color: C.ivory, fontFamily: BODY }}>
      <style>{`.np-out{animation:npOut .18s ease-in both}@keyframes npOut{to{transform:translateX(-36px);opacity:0}}.np-in{animation:npIn .32s cubic-bezier(.2,1,.3,1) both}@keyframes npIn{from{transform:translateX(36px);opacity:0}to{transform:none;opacity:1}}@media (prefers-reduced-motion: reduce){.np-out,.np-in{animation:none}}`}</style>
      {ask}
      <h1 className="nf-head mb-4" style={head(44)}>{heading}</h1>
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {shown.map((idx, pos) => {
          const c = cards[idx]
          return (
            <div key={`${pos}-${idx}`} className={`relative flex-1 min-h-[150px] rounded-3xl overflow-hidden ${fading === pos ? 'np-out' : 'np-in'}`}
              style={{ background: C.card, border: `2px solid ${c.friend ? C.gold : kept === pos && canSwap ? 'rgba(229,169,60,.55)' : 'rgba(237,231,218,.12)'}` }}>
              <button onClick={() => tapCard(c)} disabled={busy} aria-label={`${c.friend ? `${c.friend} had this. ` : ''}${c.short}, ${c.place}, ${c.cal} calories`}
                className="nf-press absolute inset-0 w-full h-full text-left disabled:opacity-70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photo} alt="" className="absolute inset-0 w-full h-full object-cover rw-photo" />
                <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,0) 30%, rgba(2,31,22,0.94) 100%)' }} />
                <span className="absolute left-4 right-4 bottom-3.5 flex items-end justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block" style={{ ...head(26), lineHeight: 0.95, color: C.ivory }}>{c.short}</span>
                    <span className="block mt-1" style={{ ...mono(11), color: SOFT }}>
                      {c.kind === 'cook' ? 'COOK IT' : c.place.toUpperCase()}
                      {c.price != null && <> · <span style={{ color: C.gold }}>${c.price}</span></>}
                    </span>
                  </span>
                  <span className="shrink-0 text-right leading-none">
                    <span className="block tabular-nums" style={{ ...head(38), lineHeight: 1, color: C.gold }}>{c.cal}</span>
                    <span className="block mt-0.5" style={{ ...mono(10), color: SOFT }}>CAL</span>
                  </span>
                </span>
              </button>
              {c.friend && (
                // "<Name> had this" (Friends, 2026-10-26): her partner picked
                // this lately, and it passed every one of her own checks.
                <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full pl-1 pr-3 pointer-events-none"
                  style={{ height: 34, maxWidth: '58%', background: 'rgba(2,31,22,0.82)', border: `1px solid ${C.gold}`, backdropFilter: 'blur(6px)' }}>
                  <span aria-hidden className="shrink-0 grid place-items-center rounded-full" style={{ width: 26, height: 26, background: C.gold, color: C.bg, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 15 }}>{c.friend.charAt(0).toUpperCase()}</span>
                  <span className="truncate" style={{ ...mono(10), color: C.gold }}>{c.friend.toUpperCase()} HAD THIS</span>
                </span>
              )}
              {canSwap && (
                <button type="button" onClick={() => swap(pos)} disabled={busy || fading != null} aria-label={`Not this one — swap out ${c.short}`}
                  className="nf-press absolute top-3 right-3 rounded-full px-3 flex items-center gap-1.5"
                  style={{ height: 34, background: 'rgba(2,31,22,0.78)', border: '1px solid rgba(237,231,218,0.28)', backdropFilter: 'blur(6px)', color: C.ivory, ...mono(10) }}>
                  <span aria-hidden style={{ fontSize: 12 }}>✕</span> NOT THIS ONE
                </button>
              )}
            </div>
          )
        })}
      </div>
      {canSwap && (
        <button type="button" onClick={shuffle} disabled={busy || fading != null} aria-label="Shuffle: keep one, swap the other"
          className="nf-press w-full rounded-full mt-3 mb-4 flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ height: 54, border: `2px solid ${C.gold}`, background: 'transparent', color: C.gold, ...mono(14) }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="M4 4l5 5" />
          </svg>
          SHUFFLE
        </button>
      )}
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
  // Copy and paste (2026-10-26, Asa: "copy it into DoorDash or Uber Eats and
  // it goes directly to the restaurant and the food item").
  const text = pasteText(card.place, card.name)
  const [copied, setCopied] = useState(0)
  const copy = () => {
    hapticTap()
    copyText(text)
    setCopied((n) => n + 1)
  }
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
      <div className="flex flex-col gap-1.5">
        <span style={{ ...mono(11), color: SOFT }}>WHAT TO SEARCH</span>
        <div className="flex items-center gap-2" style={{ borderRadius: 16, padding: 6, paddingLeft: 16, background: C.ivory }}>
          <span className="flex-1 min-w-0 truncate" style={{ color: C.bg, fontSize: 17, fontWeight: 700 }}>{text}</span>
          <button type="button" onClick={copy} aria-label={`Copy "${text}"`}
            className="nf-press shrink-0 rounded-xl px-4" style={{ height: 44, background: C.gold, color: C.bg, ...mono(12) }}>
            <span key={copied} className={copied ? 'nf-pop inline-block' : 'inline-block'}>{copied ? 'COPIED ✓' : 'COPY'}</span>
          </button>
        </div>
      </div>
      <button type="button" onClick={() => { copy(); onOpen() }} disabled={busy}
        className="nf-press mt-auto w-full rounded-full disabled:opacity-70" style={{ height: 62, background: C.gold, color: C.bg, ...mono(15) }}>
        COPY + OPEN {appName}
      </button>
      <span className="text-center" style={{ fontSize: 13, color: SOFT }}>
        Tap {card.place} at the top. Your meal is on its menu.
      </span>
    </div>
  )
}

// After the order button (2026-10-26, Asa's approved mockup OrderDone): it's
// counted already. "Got something different?" fixes the count in one tap —
// an add-on goes on top, a different meal goes to her food log instead.
function Logged({ done, slot, meal, remainingCal, calBudget, nextUp, banner }: {
  done: { card: PickCard; left: number; entryId: string | null; failed?: boolean }
  slot: string; meal: string; remainingCal: number; calBudget?: number; nextUp: string | null; banner?: ReactNode
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
    // Still saving → ignore the tap, so a quick tap-untap-tap can't save
    // two rows while only one is tracked (2026-10-29 audit).
    if (cur && !cur.id) return
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
    // Didn't save → un-tick it, so the number only counts what's really logged.
    if (!id) { setAdded((s) => { const n = { ...s }; delete n[a.key]; return n }); return }
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
        {banner}
        {!done.failed && <span style={{ ...mono(12), color: MINT }}>LOGGED FOR YOU</span>}
        <h1 className="nf-head" style={head(64)}>{slot} is<br />on its way.</h1>
        {!done.failed && <p style={{ margin: 0, fontSize: 16, color: 'rgba(237,231,218,.8)' }}>We counted it already. Nothing else to do.</p>}
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="tabular-nums" style={{ ...head(72), lineHeight: 1, color: C.gold }}>{left.toLocaleString()}</span>
          <span style={{ ...mono(12), color: SOFT }}>CAL LEFT TODAY</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: 'rgba(237,231,218,.12)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: C.gold, borderRadius: 999, transition: 'width .4s ease' }} />
        </div>
        <MealDrop slot={slot} left={left} />
        <div className="flex flex-col gap-1.5" style={{ borderRadius: 16, padding: '12px 14px', background: 'rgba(237,231,218,.06)' }}>
          <span style={{ ...mono(11), color: C.gold }}>ORDER EXACTLY THIS AT {card.place.toUpperCase()}</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{orderParts(card.name).join(' · ')}</span>
          <span style={{ fontSize: 13, color: SOFT }}>Skip {skipLine(card.place)}. Already copied, paste it in search.</span>
        </div>
        {nextUp && <span style={{ fontSize: 14, color: SOFT }}>{nextUp}</span>}
        {card.dest.url && (
          <a href={card.dest.url} target="_blank" rel="noopener noreferrer" onClick={() => { copyText(pasteText(card.place, card.name)) }} className="self-start text-[13px] underline underline-offset-2" style={{ color: SOFT }}>
            Didn&apos;t open? Copy + open {appName}
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
