'use client'

import { useState } from 'react'

// One optional tap on the workout-completion screen — the missing half of
// "completion & intensity trend" (lib/fos/pattern.ts's detectDip only ever
// saw did-she-show-up, never how it felt). Relative to HER OWN normal, not
// an absolute 1-10 RPE scale — same baseline-relative philosophy as every
// other signal in this app, and a single tap instead of a form (see
// luf-reduce-her-input-principle). Never blocks her exit — "Back to my
// week" works whether she taps this or not.
const OPTIONS = [
  { value: 1, label: 'Easier than usual' },
  { value: 2, label: 'About my normal' },
  { value: 3, label: 'Tougher than usual' },
] as const

export default function EffortTap() {
  const [picked, setPicked] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  async function tap(value: number) {
    if (picked != null || sending) return
    setPicked(value)
    setSending(true)
    try {
      await fetch('/api/plan/daily', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout: true, effort: value }),
      })
    } catch { /* best-effort — she already got her completion screen either way */ }
    setSending(false)
  }

  if (picked != null) {
    return <p className="text-ivory/40 text-xs mt-4">Got it — noted.</p>
  }

  return (
    <div className="mt-4">
      <p className="text-ivory/50 text-xs mb-2">How did that feel, compared to usual?</p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => tap(o.value)}
            disabled={sending}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-smoke text-ivory/70 hover:border-gold/50 active:scale-95 transition-all disabled:opacity-50"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
