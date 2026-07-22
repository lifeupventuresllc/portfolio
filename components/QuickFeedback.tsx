'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { deviceLabel, markFeedbackSent, FEEDBACK_SEVERITIES, type FeedbackCategory, type FeedbackSeverity } from '@/lib/feedback-context'

// Tiny inline feedback moment dropped at the exact point she just finished something
// (a workout, a saved meal week, a check-in) — not a page she has to remember to visit.
// 👍 sends instantly with zero extra taps. 👎 only THEN asks one more question (how bad)
// plus an optional note, so we get precise, fixable signal without adding friction to
// the common case.
// `dark`: set true when this renders inside a bg-charcoal/bg-obsidian card (e.g. a
// completion banner) rather than directly on the white page — flips idle-state text
// from ink (dark-on-white) to ivory (light-on-dark) so it stays readable either way.
export default function QuickFeedback({ category, context, dark = false, onSent }: {
  category: FeedbackCategory; context?: string; dark?: boolean; onSent?: () => void
}) {
  const pathname = usePathname()
  const [phase, setPhase] = useState<'idle' | 'down' | 'sent'>('idle')
  const [severity, setSeverity] = useState<FeedbackSeverity | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function send(rating: 'up' | 'down', severityVal?: FeedbackSeverity, textVal?: string) {
    setSending(true)
    try {
      await fetch('/api/plan/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, category, context, severity: severityVal, text: textVal, page: pathname, device: deviceLabel() }),
      })
    } catch { /* best-effort — never block her flow over a feedback ping */ }
    markFeedbackSent()
    setSending(false)
    setPhase('sent')
    onSent?.()
  }

  if (phase === 'sent') {
    return <p className={`${dark ? 'text-ivory/50' : 'text-ink/40'} text-xs mt-3`}>Thanks — noted 🙏🏽</p>
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

  return (
    <div className="flex items-center justify-center gap-3 mt-3">
      <span className={`${dark ? 'text-ivory/50' : 'text-ink/40'} text-xs`}>How was this?</span>
      <button onClick={() => send('up')} disabled={sending} className="text-xl active:scale-90 transition-transform disabled:opacity-40" aria-label="Working well">👍</button>
      <button onClick={() => setPhase('down')} disabled={sending} className="text-xl active:scale-90 transition-transform disabled:opacity-40" aria-label="Something's off">👎</button>
    </div>
  )
}
