'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { hapticTap } from '@/lib/haptics'
import { copyText } from '@/lib/order-exact'
import { yesAction, openOrder, appFirstOn, ORDER_APP_LABEL, type OrderLink } from '@/lib/order-link'
import { money } from '@/lib/food-budget'
import type { OfferCard } from '@/lib/meal-offer'

// The meal-time offer screen (Prompt 3, 2026-10-30): one meal, two huge
// buttons. Yes = same as tapping "Order on <her app>" on the Nutrition tab
// (logs the meal + price, opens her delivery app on that restaurant, copies
// the meal). No = one different meal right here (no new notification); a
// second No = "Okay, we'll check back at dinner." and nothing more until her
// next meal. Nothing is ever ordered or charged without her Yes.
export type OfferView =
  | { state: 'ask'; id: string; card: OfferCard; meal: string; attempt: number; resumeNo?: boolean }
  | { state: 'yes'; id: string; card: OfferCard; meal: string }
  | { state: 'stop'; line: string }

const C = { bg: '#021F16', gold: '#E5A93C', cream: '#EDE7DA', soft: 'rgba(237,231,218,.72)', faint: 'rgba(237,231,218,.45)', line: 'rgba(237,231,218,.22)' }
const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const head = (size: number) => ({ margin: 0, fontFamily: HEAD, fontStyle: 'italic' as const, fontWeight: 800, fontSize: size, lineHeight: 0.88, textTransform: 'uppercase' as const })
const mono = (size: number) => ({ fontFamily: MONO, fontWeight: 700, fontSize: size, letterSpacing: '.12em', textTransform: 'uppercase' as const })

type Answer =
  | { answer: 'yes'; placed: boolean; open: string | null; copy: string | null }
  | { answer: 'no'; next: { id: string; card: OfferCard } }
  | { answer: 'no'; stop: string }

async function send(id: string, answer: 'yes' | 'no'): Promise<Answer | null> {
  const res = await fetch(`/api/plan/offer/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer, via: 'page' }) }).catch(() => null)
  return res && res.ok ? res.json().catch(() => null) : null
}

export default function MealOffer({ view: initial }: { view: OfferView }) {
  const [view, setView] = useState<OfferView>(initial)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [opened, setOpened] = useState<{ link: OrderLink; blocked: boolean } | null>(null)
  const [stopped, setStopped] = useState(false)

  async function no() {
    if (view.state !== 'ask' || busy) return
    hapticTap()
    setBusy(true)
    const r = await send(view.id, 'no')
    setBusy(false)
    if (!r || r.answer !== 'no') { setFailed(true); return }
    setFailed(false)
    if ('next' in r) setView({ state: 'ask', id: r.next.id, card: r.next.card, meal: view.meal, attempt: 2 })
    else setView({ state: 'stop', line: r.stop })
  }

  // The notification's No (Android) couldn't finish → finish it here, once.
  const resumed = useRef(false)
  useEffect(() => {
    if (initial.state === 'ask' && initial.resumeNo && !resumed.current) { resumed.current = true; no() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function yes() {
    if (view.state !== 'ask' || busy) return
    hapticTap()
    const c = view.card
    // Open her delivery app inside the tap itself — browsers block a window
    // opened after an await. lib/order-link yesAction is the one switch for
    // "Yes places the order" later; today it always opens the link.
    let link: OrderLink | null = null, blocked = false
    if (c.kind === 'out' && c.app && c.place !== 'Grab & go') {
      const act = yesAction({ place: c.place, name: c.name, key: c.key }, c.app)
      link = act.link
      if (act.kind === 'open') { copyText(link.copy); blocked = !openOrder(link, appFirstOn()) }
    }
    setBusy(true)
    const r = await send(view.id, 'yes')
    setBusy(false)
    if (!r || r.answer !== 'yes') { setFailed(true); if (link) setOpened({ link, blocked }); return }
    setFailed(false)
    if (link) setOpened({ link, blocked })
    setView({ state: 'yes', id: view.id, card: c, meal: view.meal })
  }

  async function stopAll() {
    hapticTap()
    setBusy(true)
    await fetch('/api/plan/meal-pick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'offers', on: false }) }).catch(() => null)
    setBusy(false)
    setStopped(true)
  }

  const shell = (children: React.ReactNode) => (
    <div className="px-5 pt-6 pb-6 flex flex-col" style={{ background: C.bg, color: C.cream, minHeight: 'calc(100dvh - 4.5rem - env(safe-area-inset-bottom))' }}>
      <div className="nf-screen max-w-md mx-auto w-full flex-1 flex flex-col gap-4">{children}</div>
    </div>
  )
  const backBtn = (
    <Link href="/plan/today" onClick={() => hapticTap()} className="nf-press rounded-full flex items-center justify-center" style={{ height: 56, background: C.cream, color: C.bg, ...mono(14) }}>Back to my day</Link>
  )

  if (view.state === 'stop') {
    return shell(<>
      <div className="flex-1 flex flex-col justify-center gap-3">
        <span style={{ ...mono(12), color: C.faint }}>No problem</span>
        <h1 className="nf-head" style={head(56)}>{view.line}</h1>
      </div>
      {backBtn}
    </>)
  }

  const c = view.card
  const out = c.kind === 'out' && c.place !== 'Grab & go'
  const appName = c.app ? ORDER_APP_LABEL[c.app] : 'DoorDash'

  if (view.state === 'yes') {
    return shell(<>
      <div className="flex-1 flex flex-col justify-center gap-3">
        <span style={{ ...mono(12), color: '#9FDCC4' }}>Logged for you</span>
        <h1 className="nf-head" style={head(58)}>{out ? <>{cap(view.meal)} is<br />on its way.</> : <>{cap(view.meal)}<br />is set.</>}</h1>
        <p style={{ margin: 0, fontSize: 16, color: C.soft }}>{c.short}{out ? ` from ${c.place}` : ''}{c.price ? ` · about ${money(c.price)}` : ''}</p>
        {out && opened && (
          <div className="flex flex-col gap-2 mt-2" style={{ borderRadius: 16, padding: '12px 14px', background: 'rgba(229,169,60,.1)', border: '1px solid rgba(229,169,60,.45)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{opened.blocked ? `Open ${appName}, find ${c.place}, tap its menu search, paste.` : `We opened ${appName} on ${c.place}. Your meal is copied: paste it in the menu search.`}</span>
            <div className="flex items-center gap-2" style={{ borderRadius: 12, padding: 5, paddingLeft: 12, background: C.cream }}>
              <span className="flex-1 min-w-0 truncate" style={{ color: C.bg, fontSize: 16, fontWeight: 700 }}>{opened.link.copy}</span>
              <button type="button" onClick={() => { hapticTap(); copyText(opened.link.copy); openOrder(opened.link, appFirstOn()) }} className="nf-press shrink-0 rounded-lg px-3" style={{ height: 40, background: C.gold, color: C.bg, ...mono(11) }}>Open {appName}</button>
            </div>
          </div>
        )}
        {!out && c.ingredients?.length ? (
          <div className="mt-2 flex flex-col gap-1.5">
            <span style={{ ...mono(11), color: C.faint }}>What you need</span>
            {c.ingredients.map((i) => <span key={i} style={{ fontSize: 16 }}>· {i}</span>)}
          </div>
        ) : null}
      </div>
      {backBtn}
    </>)
  }

  return shell(<>
    <div className="relative w-full overflow-hidden" style={{ borderRadius: 24, aspectRatio: '4 / 3', background: '#08281d' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={c.photo + c.key} src={c.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
    </div>
    <div className="flex flex-col gap-2">
      <span style={{ ...mono(12), color: C.gold }}>Your {view.meal} · ready to go</span>
      <h1 className="nf-head" style={head(48)}>{c.short}</h1>
      <span style={{ fontSize: 16, color: C.soft }}>{out ? c.place : c.place === 'Grab & go' ? 'Grab it at any store' : 'Made at home'} · {c.cal} cal</span>
      <div className="flex gap-4 mt-1">
        {c.price ? <span style={{ ...mono(14), color: C.cream }}>About {money(c.price)}</span> : null}
        {out && c.arrivalMin ? <span style={{ ...mono(14), color: C.cream }}>Here in about {c.arrivalMin} min</span> : null}
        {!out && c.place !== 'Grab & go' ? <span style={{ ...mono(14), color: C.cream }}>Tap yes to see what you need</span> : null}
      </div>
    </div>
    {failed && <span style={{ fontSize: 14, color: '#FF5A4E' }}>That didn&apos;t save. Tap again.</span>}
    <div className="mt-auto flex flex-col gap-3">
      <button type="button" disabled={busy} onClick={yes} className="nf-press w-full rounded-full flex items-center justify-center disabled:opacity-60"
        style={{ height: 84, background: C.gold, color: C.bg, ...head(44), lineHeight: 1 }}>Yes</button>
      <button type="button" disabled={busy} onClick={no} className="nf-press w-full rounded-full flex items-center justify-center disabled:opacity-60"
        style={{ height: 84, background: 'transparent', border: `3px solid ${C.line}`, color: C.cream, ...head(44), lineHeight: 1 }}>No</button>
      {stopped
        ? <span className="text-center" style={{ fontSize: 13, color: C.soft }}>Meal-time picks are off. Turn them back on in Today&apos;s food.</span>
        : <button type="button" disabled={busy} onClick={stopAll} className="self-center underline underline-offset-2 py-1" style={{ fontSize: 13, color: C.faint }}>Stop meal-time picks</button>}
    </div>
  </>)
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
