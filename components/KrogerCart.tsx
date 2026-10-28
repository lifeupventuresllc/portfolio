'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'

// "Send to my Kroger cart" (2026-10-27). One tap puts this week's groceries
// in her own Kroger-family cart; she checks out on Kroger's site. First time
// only, Kroger asks her to sign in, then she lands back here and it finishes
// on its own. Hidden when she has no grocery list or ordering isn't set up.

type State = { ready: boolean; lines?: number; zip?: string | null; store?: { name: string } | null; sent?: { checkoutUrl: string; added: number; missing: string[] } | null }
type Result =
  | { status: 'sent'; checkoutUrl: string; added: number; missing: string[]; store: string; again?: boolean }
  | { status: 'login'; loginUrl: string; store: string }
  | { status: 'no_store' }
  | { status: 'error'; message: string }

const BG = '#021F16', GOLD = '#E5A93C', INK = '#EDE7DA', MUTE = 'rgba(237,231,218,.75)'
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"

export default function KrogerCart() {
  const pathname = usePathname() || '/plan/nutrition/log'
  const [st, setSt] = useState<State | null>(null)
  const [zip, setZip] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Result | null>(null)
  const resumed = useRef(false)

  async function send(force = false, z = zip) {
    if (busy) return
    hapticTap(30)
    setBusy(true); setRes(null)
    try {
      const r = await fetch('/api/plan/kroger-cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zip: z || undefined, force, from: pathname }) })
      const j = (await r.json()) as Result
      if (j.status === 'login') { window.location.href = j.loginUrl; return }
      setRes(j)
    } catch {
      setRes({ status: 'error', message: 'No connection. Try again.' })
    }
    setBusy(false)
  }

  useEffect(() => {
    fetch('/api/plan/kroger-cart').then((r) => (r.ok ? r.json() : { ready: false })).then((j: State) => {
      setSt(j)
      if (j.zip) setZip(j.zip)
      if (j.sent) setRes({ status: 'sent', checkoutUrl: j.sent.checkoutUrl, added: j.sent.added, missing: j.sent.missing, store: j.store?.name || 'Kroger', again: true })
      // Back from Kroger's sign-in → finish the send on its own.
      const back = new URLSearchParams(window.location.search).get('kroger') === 'back'
      if (back && j.ready && !resumed.current) {
        resumed.current = true
        window.history.replaceState(null, '', window.location.pathname)
        send(true, j.zip || '')
      }
    }).catch(() => setSt({ ready: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!st?.ready) return null
  const zipOk = /^\d{5}$/.test(zip)
  const sent = res?.status === 'sent' ? res : null

  return (
    <div className="nf-rise rounded-[22px] flex flex-col gap-3" style={{ background: 'rgba(237,231,218,.06)', border: `1.5px solid ${sent ? GOLD : 'rgba(229,169,60,.35)'}`, padding: '16px 16px 18px', color: INK, fontFamily: "var(--font-inter), Inter, sans-serif" }}>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: GOLD }}>YOUR GROCERIES · {st.lines} ITEMS</span>

      {sent ? (
        <>
          <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 30, lineHeight: 0.95, textTransform: 'uppercase' }}>{sent.added} items in your {sent.store} cart</span>
          <span className="text-[14px]" style={{ color: MUTE }}>
            Check sizes, then pick up or get it delivered.
            {sent.missing.length > 0 && <> Not found there: {sent.missing.slice(0, 4).join(', ')}{sent.missing.length > 4 ? ` and ${sent.missing.length - 4} more` : ''}.</>}
          </span>
          <a href={sent.checkoutUrl} target="_blank" rel="noopener noreferrer" onClick={() => hapticTap(20)} className="nf-press h-12 rounded-full flex items-center justify-center" style={{ background: GOLD, color: BG, fontFamily: MONO, fontWeight: 700, fontSize: 14, letterSpacing: '.1em' }}>OPEN MY CART</a>
          {sent.again && <button type="button" onClick={() => send(true)} disabled={busy} className="self-center text-[12px] underline underline-offset-2" style={{ color: MUTE }}>{busy ? 'Sending…' : 'Plan changed? Send it again'}</button>}
        </>
      ) : (
        <>
          <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 30, lineHeight: 0.95, textTransform: 'uppercase' }}>Send it to your Kroger cart</span>
          <span className="text-[14px]" style={{ color: MUTE }}>This week&apos;s meals, already in your cart. Kroger, Ralphs, Mariano&apos;s, Fred Meyer, King Soopers and more.</span>
          {!st.zip && (
            <label className="flex items-center gap-2">
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: MUTE }}>YOUR ZIP</span>
              <input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" autoComplete="postal-code" placeholder="60614"
                className="w-28 h-11 rounded-xl px-3 text-[16px] outline-none" style={{ background: 'rgba(237,231,218,.08)', border: '1px solid rgba(237,231,218,.2)', color: INK, fontFamily: MONO }} />
            </label>
          )}
          {res?.status === 'no_store' && <span className="text-[13px]" style={{ color: '#F2B8A0' }}>No Kroger-family store near {zip}. Try another ZIP.</span>}
          {res?.status === 'error' && <span className="text-[13px]" style={{ color: '#F2B8A0' }}>{res.message}</span>}
          <button type="button" onClick={() => send(false)} disabled={busy || !zipOk} className="nf-press h-12 rounded-full flex items-center justify-center disabled:opacity-50" style={{ background: GOLD, color: BG, fontFamily: MONO, fontWeight: 700, fontSize: 14, letterSpacing: '.1em' }}>
            {busy ? `MATCHING ${st.lines} ITEMS…` : 'SEND TO MY CART'}
          </button>
          {st.zip && <button type="button" onClick={() => setSt({ ...st, zip: null })} className="self-center text-[12px] underline underline-offset-2" style={{ color: MUTE }}>Store near {st.zip}{st.store ? ` (${st.store.name})` : ''} · change</button>}
          <span className="text-center text-[11px]" style={{ color: 'rgba(237,231,218,.5)' }}>First time, Kroger asks you to sign in. You pay on Kroger.</span>
        </>
      )}
    </div>
  )
}
