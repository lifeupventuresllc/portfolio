'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { deviceLabel, markFeedbackSent, FEEDBACK_SEVERITIES, type FeedbackCategory, type FeedbackSeverity } from '@/lib/feedback-context'

function ThumbsUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 .59-1.41L11 5a1.5 1.5 0 0 1 2.09.02L15 5.88Z" />
    </svg>
  )
}

function ThumbsDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17a2 2 0 0 1 2 2v8a2 2 0 0 1-.59 1.41L13 19a1.5 1.5 0 0 1-2.09-.02L9 18.12Z" />
    </svg>
  )
}

// Tiny inline feedback moment dropped at the exact point she just finished something
// (a workout, a saved meal week, a check-in) — not a page she has to remember to visit.
// Layered by design (Asa's explicit call): a quick 👍/👎 tap first, then one optional
// follow-up question either way — "how bad + what happened" on 👎, "what would make
// this even better" on 👍 — so a happy tap can still surface a real suggestion, and
// skipping the follow-up is always one tap away (never required).
// `dark`: set true when this renders inside a bg-charcoal/bg-obsidian card (e.g. a
// completion banner) rather than directly on the white page — flips idle-state text
// from ink (dark-on-white) to ivory (light-on-dark) so it stays readable either way.
// `reviewGate`: at high-trust moments (workout finish, streak milestones), ask
// satisfaction FIRST — a happy tap routes to an actual App Store review ask instead
// of the usual "what would make this better" follow-up; an unhappy tap still routes
// into the normal private severity/text flow below, never to the App Store. This
// protects the rating: only people already glad it's working get asked to rate it.
export default function QuickFeedback({ category, context, dark = false, reviewGate = false, emphasize = false, onSent }: {
  category: FeedbackCategory; context?: string; dark?: boolean; reviewGate?: boolean
  // Gold + bolder idle prompt, only where the moment itself calls for the
  // extra pull on the eye (currently just post-workout) — every other
  // QuickFeedback in the app stays at its normal, easy-to-ignore weight.
  emphasize?: boolean
  onSent?: () => void
}) {
  const pathname = usePathname()
  const [phase, setPhase] = useState<'idle' | 'up' | 'down' | 'review' | 'sent'>('idle')
  const [severity, setSeverity] = useState<FeedbackSeverity | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function send(rating: 'up' | 'down', severityVal?: FeedbackSeverity, textVal?: string) {
    setSending(true)
    try {
      await fetch('/api/plan/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, category, context, severity: severityVal, text: textVal, page: pathname, device: deviceLabel(), reviewGate }),
      })
    } catch { /* best-effort — never block her flow over a feedback ping */ }
    markFeedbackSent()
    setSending(false)
    setPhase('sent')
    onSent?.()
  }

  function tapUp() {
    if (reviewGate) { setPhase('review'); return }
    setPhase('up')
  }

  if (phase === 'sent') {
    return <p className={`${dark ? 'text-ivory/50' : 'text-ink/40'} text-xs mt-3`}>Thanks — noted.</p>
  }

  // This detail box always has its own dark background, so its text stays ivory
  // regardless of what's behind the component.
  if (phase === 'down') {
    return (
      <div className="mt-3 bg-obsidian/90 border border-smoke rounded-2xl p-4 text-left">
        <p className="text-ivory/60 text-xs font-semibold uppercase tracking-wider mb-2">How bad was it?</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {FEEDBACK_SEVERITIES.map((s) => (
            <button key={s.key} onClick={() => setSeverity(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${severity === s.key ? 'bg-gold/15 border-gold text-gold' : 'border-smoke text-ivory/60 hover:border-gold/40'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
          placeholder="What happened? (optional, but this is what helps me fix it)"
          className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold transition-colors resize-none mb-3" />
        <button onClick={() => send('down', severity ?? undefined, text || undefined)} disabled={sending}
          className="bg-gold text-obsidian px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-40">
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    )
  }

  // High-trust moment + she's happy — ask her to actually rate it, instead of
  // (or before) another follow-up question. Logs the 'up' either way she exits.
  if (phase === 'review') {
    const storeUrl = process.env.NEXT_PUBLIC_APP_STORE_URL
    return (
      <div className="mt-3 bg-obsidian/90 border border-smoke rounded-2xl p-4 text-center">
        <p className="text-ivory/70 text-sm font-semibold mb-3">So glad it&apos;s working! Mind leaving a quick review?</p>
        <div className="flex flex-col gap-2">
          <a
            href={storeUrl || '#'}
            target="_blank" rel="noopener noreferrer"
            onClick={() => send('up')}
            aria-disabled={!storeUrl}
            className={`bg-gold text-obsidian px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-center ${!storeUrl ? 'opacity-40 pointer-events-none' : ''}`}
          >
            Leave a review →
          </a>
          <button onClick={() => send('up')} disabled={sending} className="text-ivory/40 text-xs hover:text-ivory/70 transition-colors disabled:opacity-40">
            {sending ? 'Saving…' : 'Maybe later'}
          </button>
        </div>
      </div>
    )
  }

  // 👍 still gets an instant, low-pressure thanks — but layers in one optional
  // question so a happy tap can still surface a real suggestion, not just a rating.
  if (phase === 'up') {
    return (
      <div className="mt-3 bg-obsidian/90 border border-smoke rounded-2xl p-4 text-left">
        <p className="text-ivory/70 text-sm font-semibold mb-2">Glad it&apos;s working. Anything that would make this even better for you?</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
          placeholder="Optional — totally fine to skip"
          className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold transition-colors resize-none mb-3" />
        <div className="flex gap-3 items-center">
          <button onClick={() => send('up', undefined, text || undefined)} disabled={sending}
            className="bg-gold text-obsidian px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-40">
            {sending ? 'Sending…' : text ? 'Send' : 'Skip'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-3 mt-3">
      <span className={`${emphasize ? 'text-gold font-semibold text-sm' : dark ? 'text-ivory/50 text-xs' : 'text-ink/40 text-xs'}`}>{reviewGate ? 'Enjoying Life-Up Fitness so far?' : 'How was this?'}</span>
      <button onClick={tapUp} disabled={sending} className={`${emphasize ? 'text-gold' : dark ? 'text-ivory/50 hover:text-gold' : 'text-ink/40 hover:text-gold'} active:scale-90 transition-transform disabled:opacity-40`} aria-label="Working well"><ThumbsUpIcon /></button>
      <button onClick={() => setPhase('down')} disabled={sending} className={`${emphasize ? 'text-gold' : dark ? 'text-ivory/50 hover:text-gold' : 'text-ink/40 hover:text-gold'} active:scale-90 transition-transform disabled:opacity-40`} aria-label="Something's off"><ThumbsDownIcon /></button>
    </div>
  )
}
