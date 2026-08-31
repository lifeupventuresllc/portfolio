'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { broadcastRefresh } from '@/lib/useLiveRefresh'
import DeepgramVoiceInput from '@/components/DeepgramVoiceInput'

// Phase 1 operator surface. She tells Coach Asa about her day; he replies with a
// goal-protecting adjustment she can approve / modify / reject. "The goal never
// changes. The path changes."
type Msg = { role: 'user' | 'operator'; content: string }
type WorkoutChange = { fromMinutes?: number; toMinutes?: number; swapTo?: string; reason?: string; injuryBodyPart?: string; trackOverride?: 'gym' | 'home'; focusOverride?: ('core' | 'legs' | 'arms' | 'chest' | 'back' | 'shoulders')[] }

function joinAreas(areas: string[]): string {
  if (areas.length <= 1) return areas[0] || ''
  if (areas.length === 2) return `${areas[0]} and ${areas[1]}`
  return `${areas.slice(0, -1).join(', ')}, and ${areas[areas.length - 1]}`
}
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

// Plain outline icons for the unified composer pill — no emoji, same
// inline-SVG convention (2–2.2 stroke, round caps/joins) already used
// elsewhere in this codebase (e.g. DeepgramVoiceInput's MicIcon, CoachHero's
// SendIcon).
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function SendArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

export default function OperatorChat({ firstName }: { firstName: string }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<Adjustment | null>(null)
  const [justApproved, setJustApproved] = useState<Adjustment | null>(null)
  const [justBuilt, setJustBuilt] = useState<{ workout: boolean; nutrition: boolean } | null>(null)
  const [quickReplies, setQuickReplies] = useState<string[] | null>(null)
  // Drives the ChatGPT-style empty-landing header: true only once we know
  // for certain there's no real prior history to show (as opposed to still
  // loading it), so the headline never flashes on top of a real transcript.
  const [isFresh, setIsFresh] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  // Toggles the small quick-signal drawer that opens above the composer —
  // repurposes the "+" slot instead of leaving the CHIPS row always visible.
  const [chipsOpen, setChipsOpen] = useState(false)
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
      // No real prior history — show the big landing headline instead of
      // injecting a greeting bubble; a real conversation goes straight to
      // the normal chat view.
      setMessages(hist)
      setIsFresh(hist.length === 0)
      setHistoryLoaded(true)
    }).catch(() => { setMessages([]); setIsFresh(true); setHistoryLoaded(true) })
  }, [firstName])

  // Only scroll when the message COUNT changes (a real new message), instantly — not
  // on every keystroke/render — so the page never jumps while you're typing.
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }) }, [messages.length, pending, justApproved, justBuilt, quickReplies])

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || sending) return
    setInput(''); setPending(null); setJustApproved(null); setJustBuilt(null); setQuickReplies(null); setSending(true)
    setMessages((m) => [...m, { role: 'user', content: msg }])
    try {
      const r = await fetch('/api/plan/operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) })
      const d = await r.json().catch(() => ({}))
      if (d?.reply) setMessages((m) => [...m, { role: 'operator', content: d.reply }])
      else setMessages((m) => [...m, { role: 'operator', content: "I didn't quite catch that — tell me about your time, energy, or what changed today and I'll adjust your plan." }])
      if (d?.adjustment) setPending(d.adjustment as Adjustment)
      // Real tappable options for a single, bounded-answer question (her level,
      // focus area, or "no injuries") instead of making her type it out.
      if (d?.quickReplies) setQuickReplies(d.quickReplies as string[])
      // A cold-start build just flipped intake_completed server-side (same gap
      // fixed in CoachHero.tsx) — refresh so the rest of the app picks it up,
      // and surface a real "go see it" card below routed to the specific thing
      // built, instead of a dead-end reply.
      if (d?.planBuilt) { router.refresh(); broadcastRefresh(); setJustBuilt({ workout: !!d.builtWorkout, nutrition: !!d.builtNutrition }) }
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
        // Same stale-router-cache fix as CoachHero.tsx's decide() — tapping
        // through to /plan/workout right after approving could show her old
        // unchanged workout without this.
        router.refresh()
        broadcastRefresh() // let the dashboard reflect the adjusted plan
        setJustApproved(adj) // surfaces a "take me there" link below, see render
      }
    } catch { /* ignore */ }
  }

  const adjLines = (a: Adjustment) => {
    const out: string[] = []
    const w = a.workoutChange, n = a.nutritionChange
    if (w?.injuryBodyPart) out.push(`Workout → swapped to protect your ${w.injuryBodyPart.replace('_', ' ')}, from now on`)
    else if (w?.trackOverride) out.push(`Workout → swapped to a ${w.trackOverride === 'home' ? 'bodyweight home' : 'gym'} session${w.toMinutes ? `, ${w.toMinutes} min` : ''}`)
    else if (w?.focusOverride?.length) out.push(`Workout → focused on ${joinAreas(w.focusOverride)} today`)
    else if (w?.toMinutes) out.push(`Workout → ${w.toMinutes}-min ${w.swapTo || 'session'}`)
    else if (w?.reason) out.push(`Workout → re-slotted (${w.reason})`)
    if (w?.focusOverride?.length && w?.trackOverride) out.push(`Focus → ${joinAreas(w.focusOverride)} today`)
    if (n?.dinnerSuggestion) out.push(`Nutrition → ${n.dinnerSuggestion}`)
    if (n?.calorieDelta) out.push(`Calories → ${n.calorieDelta > 0 ? '+' : ''}${n.calorieDelta}`)
    return out
  }

  // Unified pill composer — a single rounded-full bar replacing the old
  // textarea + mic-button + "Send" text-button row. Built once here and
  // referenced from both the empty-landing view and the normal chat view
  // below (only one of those renders at a time), so there's exactly one
  // composer implementation to keep in sync.
  const composerEl = (
    <div className="relative">
      {/* "+" repurposed as a toggle for the quick-signal chips, instead of
          that row being permanently visible above the composer — same
          chips, same send(c.text) behavior, just tucked behind a tap. */}
      {chipsOpen && (
        <div className="luf-reveal luf-in absolute bottom-full left-0 mb-2 w-full bg-charcoal border border-smoke rounded-2xl p-3 flex flex-wrap gap-2 z-20">
          {CHIPS.map((c) => (
            <button
              key={c.label}
              onClick={() => { setChipsOpen(false); send(c.text) }}
              disabled={sending}
              className="bg-obsidian border border-smoke text-ivory/70 text-xs px-3 py-1.5 rounded-full hover:border-gold/60 hover:text-gold transition-colors disabled:opacity-40"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Composer — normal flow (no sticky) so the iOS keyboard doesn't make it jump */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input) }}
        className="flex items-center gap-1 bg-charcoal border border-smoke rounded-full pl-2 pr-2 py-2"
      >
        <button
          type="button"
          onClick={() => setChipsOpen((v) => !v)}
          aria-label="Quick signals"
          className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-colors ${chipsOpen ? 'bg-gold/20 text-gold' : 'text-ivory/50 hover:text-gold'}`}
        >
          <PlusIcon />
        </button>
        <textarea
          ref={textareaRef}
          value={input} onChange={(e) => setInput(e.target.value)} disabled={sending}
          placeholder="Ask Coach Asa…"
          rows={1}
          autoComplete="off" autoCorrect="on" enterKeyHint="send" inputMode="text"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          onFocus={() => setChipsOpen(false)}
          className="flex-1 bg-transparent px-1.5 py-1.5 text-base text-white placeholder:text-ivory/30 focus:outline-none resize-none overflow-y-auto leading-snug"
          style={{ maxHeight: 144 }}
        />
        {/* Swap-on-typing, same as ChatGPT's real composer: empty input shows
            the mic (restyled into a gold circle); the moment there's text,
            it swaps to a send-arrow button that calls the same send(). */}
        {input.trim() ? (
          <button
            type="submit"
            disabled={sending}
            aria-label="Send"
            className="shrink-0 h-9 w-9 rounded-full bg-gold text-obsidian flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
          >
            {sending ? <span className="text-sm font-bold leading-none">…</span> : <SendArrowIcon />}
          </button>
        ) : (
          // onInterim writes straight into the visible textarea as she talks.
          // Deepgram Nova-3, not the browser's built-in recognition — see
          // components/DeepgramVoiceInput.tsx. No auto-send: she reviews the
          // transcript like anything typed, same as CoachHero's widget.
          <DeepgramVoiceInput
            source="operator_chat" idleLabel="Talk to Coach Asa" onInterim={setInput} onResult={setInput}
            className="h-9 w-9 rounded-full bg-gold text-obsidian"
            activeClassName="h-9 w-9 rounded-full bg-red-500/90 text-white luf-glow scale-105"
          />
        )}
      </form>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto pb-6">
      {/* Real gap found live, 2026-08-31 (Asa: "its not in all the side tabs
          like talk to coach") — this link to home was always here, but a
          returning conversation auto-scrolls to its latest message on load
          (see the scrollIntoView effect below), which buries a plain
          in-flow header at the very top, off-screen, behind however much
          history exists. `sticky top-0` keeps it pinned to the viewport
          regardless of scroll position or how long the chat gets. */}
      <div className="sticky top-0 z-20 bg-obsidian -mx-4 px-4 py-3 -mt-10 pt-10 flex items-center justify-between mb-4">
        <Link href="/plan" className="inline-flex items-center gap-1 bg-charcoal border border-gold/40 text-gold text-xs font-semibold px-3 py-1.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all">← Home</Link>
        <p className="text-gold text-[10px] uppercase tracking-[0.2em] font-semibold">Coach Asa · your operator</p>
      </div>

      {historyLoaded && isFresh && messages.length === 0 ? (
        // ChatGPT-style empty landing — replaces the old injected greeting
        // bubble entirely on a genuinely fresh conversation. Disappears the
        // moment she sends anything, since send() immediately pushes a user
        // message and messages.length stops being 0.
        <div className="flex flex-col items-center justify-center text-center py-10 md:py-16">
          <h1 className="text-white text-2xl md:text-3xl font-bold leading-snug mb-6 max-w-sm">
            What&rsquo;s going on with your plan today?
          </h1>
          <div className="w-full max-w-md">{composerEl}</div>
          <button
            onClick={() => send('What can Coach Asa do?')}
            disabled={sending}
            className="mt-4 bg-charcoal border border-smoke text-ivory/60 text-xs px-4 py-2 rounded-full hover:border-gold/60 hover:text-gold transition-colors disabled:opacity-40"
          >
            What can Coach Asa do?
          </button>
        </div>
      ) : (
      <>
      <div className="space-y-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-snug ${m.role === 'user' ? 'bg-gold text-obsidian font-medium rounded-br-sm' : 'bg-charcoal border border-smoke text-ivory/90 rounded-bl-sm'}`}>
              {m.role === 'operator' && <p className="text-gold/70 text-[9px] uppercase tracking-wider font-semibold mb-0.5">Coach Asa</p>}
              {m.content}
            </div>
          </div>
        ))}

        {/* Tappable answers to Coach Asa's own gate question (level/focus/injuries)
            — one tap sends the exact text, same as typing it. */}
        {quickReplies && (
          <div className="luf-reveal luf-in flex flex-wrap gap-2">
            {quickReplies.map((o) => (
              <button key={o} onClick={() => send(o)} disabled={sending}
                className="bg-charcoal border border-gold/40 text-gold px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform disabled:opacity-40">
                {o}
              </button>
            ))}
          </div>
        )}

        {/* Recommended adjustment — recommend, don't control */}
        {pending && (
          <div className="luf-reveal luf-in bg-charcoal bg-gradient-to-br from-gold/15 to-charcoal border border-gold/40 rounded-2xl p-4">
            <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-2">Here’s what I recommend</p>
            {adjLines(pending).length ? (
              <ul className="space-y-1 mb-3">
                {adjLines(pending).map((l, i) => <li key={i} className="text-white text-sm">• {l}</li>)}
              </ul>
            ) : <p className="text-ivory/70 text-sm mb-3">A small tweak to keep you on track today.</p>}
            {/* Simplified to Yes/No, same reasoning as CoachHero.tsx — "Modify"
                never actually changed anything itself, just prompted a reply
                asking what she wants instead. She can just type that. */}
            <div className="flex gap-2">
              <button onClick={() => decide('approved')} className="flex-1 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">Yes, update it</button>
              <button onClick={() => decide('rejected')} className="flex-1 bg-charcoal border border-smoke text-ivory/60 px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">No, keep it</button>
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

        {/* Cold-start build — she asked Coach Asa to build her a plan right
            here in chat; take her straight to the specific thing built
            (workout/today), same pattern as justApproved above. Only lands
            on the dashboard when both were built (no single page shows both). */}
        {justBuilt && (
          <div className="luf-reveal luf-in flex flex-col gap-2">
            {justBuilt.workout && justBuilt.nutrition ? (
              <Link href="/plan" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
                View my new plan →
              </Link>
            ) : justBuilt.workout ? (
              <Link href="/plan/workout" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
                💪🏽 View my new workout →
              </Link>
            ) : justBuilt.nutrition ? (
              <Link href="/plan/today" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
                🍽️ View my new nutrition plan →
              </Link>
            ) : (
              <Link href="/plan" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
                View my new plan →
              </Link>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {composerEl}
      </>
      )}
    </div>
  )
}
