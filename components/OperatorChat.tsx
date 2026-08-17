'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { broadcastRefresh } from '@/lib/useLiveRefresh'

// Phase 1 operator surface. She tells Coach Asa about her day; he replies with a
// goal-protecting adjustment she can approve / modify / reject. "The goal never
// changes. The path changes."
type Msg = { role: 'user' | 'operator'; content: string }
type WorkoutChange = { fromMinutes?: number; toMinutes?: number; swapTo?: string; reason?: string; injuryBodyPart?: string }
type NutritionChange = { calorieDelta?: number; dinnerSuggestion?: string; reason?: string; eatingOut?: boolean }
type Adjustment = { id: string | null; workoutChange?: WorkoutChange; nutritionChange?: NutritionChange }

const CHIPS = [
  { label: '⏱️ Only 20 min', text: 'I only have 20 minutes today.' },
  { label: '😮‍💨 I’m exhausted', text: "I'm exhausted today." },
  { label: '🍔 Eating out', text: "I'm eating out today." },
  { label: '😴 Didn’t sleep', text: "I didn't sleep well." },
  { label: '📅 Schedule changed', text: 'My schedule changed today.' },
  { label: '🔁 Missed some days', text: "I missed a few days and I'm getting back on track." },
]

export default function OperatorChat({ firstName }: { firstName: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<Adjustment | null>(null)
  const [justApproved, setJustApproved] = useState<Adjustment | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow the composer as she types or dictates, so a longer message stays fully
  // visible instead of scrolling sideways inside a fixed-height single-line input —
  // capped at ~6 lines, then it scrolls internally like any normal chat composer.
  // Bound directly to the native 'input' event (not just React's onChange->state->
  // effect chain) — mobile Safari's dictation can update a field's value in ways
  // that don't cleanly line up with a React re-render on every recognized word, so
  // resizing here, synchronously, on the real DOM event, is the more reliable path.
  const resize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
    el.scrollTop = el.scrollHeight // keep the latest typed/dictated text in view, not scrolled above it
  }
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.addEventListener('input', resize)
    return () => el.removeEventListener('input', resize)
  }, [])
  useEffect(resize, [input])

  useEffect(() => {
    fetch('/api/plan/operator').then((r) => r.json()).then((d) => {
      const hist = (d?.messages || []) as Msg[]
      setMessages(hist.length ? hist : [{ role: 'operator', content: `Hey ${firstName} — I'm right here with you. Tell me how today's looking (your time, energy, schedule, or what changed) and I'll adjust your plan around your life while protecting your goal.` }])
    }).catch(() => setMessages([{ role: 'operator', content: `Hey ${firstName} — tell me about your day and I'll adjust your plan around it.` }]))
  }, [firstName])

  // Only scroll when the message COUNT changes (a real new message), instantly — not
  // on every keystroke/render — so the page never jumps while you're typing.
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }) }, [messages.length, pending, justApproved])

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || sending) return
    setInput(''); setPending(null); setJustApproved(null); setSending(true)
    setMessages((m) => [...m, { role: 'user', content: msg }])
    try {
      const r = await fetch('/api/plan/operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) })
      const d = await r.json().catch(() => ({}))
      if (d?.reply) setMessages((m) => [...m, { role: 'operator', content: d.reply }])
      else setMessages((m) => [...m, { role: 'operator', content: "I didn't quite catch that — tell me about your time, energy, or what changed today and I'll adjust your plan." }])
      if (d?.adjustment) setPending(d.adjustment as Adjustment)
    } catch { setMessages((m) => [...m, { role: 'operator', content: "I couldn't reach the plan just now — try that again in a sec." }]) }
    setSending(false)
  }

  async function decide(status: 'approved' | 'modified' | 'rejected') {
    const adj = pending
    setPending(null)
    try {
      const r = await fetch('/api/plan/operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adjustmentId: adj?.id ?? '', status }) })
      const d = await r.json()
      if (d?.reply) setMessages((m) => [...m, { role: 'operator', content: d.reply }])
      if (status === 'approved') {
        broadcastRefresh() // let the dashboard reflect the adjusted plan
        setJustApproved(adj) // surfaces a "take me there" link below, see render
      }
    } catch { /* ignore */ }
  }

  const adjLines = (a: Adjustment) => {
    const out: string[] = []
    const w = a.workoutChange, n = a.nutritionChange
    if (w?.injuryBodyPart) out.push(`Workout → swapped to protect your ${w.injuryBodyPart.replace('_', ' ')}, from now on`)
    else if (w?.toMinutes) out.push(`Workout → ${w.toMinutes}-min ${w.swapTo || 'session'}`)
    else if (w?.reason) out.push(`Workout → re-slotted (${w.reason})`)
    if (n?.dinnerSuggestion) out.push(`Nutrition → ${n.dinnerSuggestion}`)
    if (n?.calorieDelta) out.push(`Calories → ${n.calorieDelta > 0 ? '+' : ''}${n.calorieDelta}`)
    return out
  }

  return (
    <div className="max-w-2xl mx-auto pb-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/plan" className="inline-flex items-center gap-1 bg-charcoal border border-gold/40 text-gold text-xs font-semibold px-3 py-1.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all">← Dashboard</Link>
        <p className="text-gold text-[10px] uppercase tracking-[0.2em] font-semibold">Coach Asa · your operator</p>
      </div>

      <div className="space-y-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-snug ${m.role === 'user' ? 'bg-gold text-obsidian font-medium rounded-br-sm' : 'bg-charcoal border border-smoke text-ivory/90 rounded-bl-sm'}`}>
              {m.role === 'operator' && <p className="text-gold/70 text-[9px] uppercase tracking-wider font-semibold mb-0.5">Coach Asa</p>}
              {m.content}
            </div>
          </div>
        ))}

        {/* Recommended adjustment — recommend, don't control */}
        {pending && (
          <div className="luf-reveal luf-in bg-charcoal bg-gradient-to-br from-gold/15 to-charcoal border border-gold/40 rounded-2xl p-4">
            <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-2">Here’s what I recommend</p>
            {adjLines(pending).length ? (
              <ul className="space-y-1 mb-3">
                {adjLines(pending).map((l, i) => <li key={i} className="text-white text-sm">• {l}</li>)}
              </ul>
            ) : <p className="text-ivory/70 text-sm mb-3">A small tweak to keep you on track today.</p>}
            <div className="flex gap-2">
              <button onClick={() => decide('approved')} className="flex-1 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">Approve</button>
              <button onClick={() => decide('modified')} className="bg-charcoal border border-gold/40 text-gold px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">Modify</button>
              <button onClick={() => decide('rejected')} className="bg-charcoal border border-smoke text-ivory/60 px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">Reject</button>
            </div>
            {pending.nutritionChange?.eatingOut && (
              <Link href="/plan/eating-out" className="mt-2.5 flex items-center justify-center gap-1.5 bg-obsidian border border-blue-500/30 text-blue-300 px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl hover:border-blue-400/60 transition-colors">
                🍔 Show me my options
              </Link>
            )}
          </div>
        )}

        {/* After she approves, take her straight to whatever actually changed —
            no reason to make her navigate there herself once she's already said
            yes. Clears on her next message so it doesn't linger into an
            unrelated later exchange. */}
        {justApproved && (
          <div className="luf-reveal luf-in flex flex-col gap-2">
            {justApproved.workoutChange && (
              <Link href="/plan/workout" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
                💪🏽 View my updated workout →
              </Link>
            )}
            {justApproved.nutritionChange && (
              <Link
                href={justApproved.nutritionChange.eatingOut ? '/plan/eating-out' : '/plan/today'}
                className="flex items-center justify-center gap-1.5 bg-obsidian border border-gold/40 text-gold px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl hover:border-gold/70 transition-colors"
              >
                {justApproved.nutritionChange.eatingOut ? '🍔 Show me my options →' : '🍽️ View my updated plan →'}
              </Link>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick signals */}
      <div className="flex flex-wrap gap-2 mt-4 mb-2">
        {CHIPS.map((c) => (
          <button key={c.label} onClick={() => send(c.text)} disabled={sending} className="bg-charcoal border border-smoke text-ivory/70 text-xs px-3 py-1.5 rounded-full hover:border-gold/60 hover:text-gold transition-colors disabled:opacity-40">{c.label}</button>
        ))}
      </div>

      {/* Composer — normal flow (no sticky) so the iOS keyboard doesn't make it jump */}
      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input} onChange={(e) => setInput(e.target.value)} disabled={sending}
          placeholder="Tell me about your day…"
          rows={1}
          autoComplete="off" autoCorrect="on" enterKeyHint="send" inputMode="text"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          className="flex-1 bg-charcoal border border-smoke rounded-2xl px-4 py-3 text-base text-white placeholder:text-ivory/30 focus:border-gold/60 focus:outline-none resize-none overflow-y-auto leading-snug"
          style={{ maxHeight: 144 }}
        />
        <button type="submit" disabled={sending || !input.trim()} className="bg-gold text-obsidian px-5 py-3 font-bold text-sm rounded-2xl disabled:opacity-40 active:scale-95 transition-transform">{sending ? '…' : 'Send'}</button>
      </form>
    </div>
  )
}
