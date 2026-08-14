'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Fires on /plan once every ~7 days (server decides — see app/plan/page.tsx) when
// she hasn't weighed in recently. Real problem it solves: the goal progress bar and
// the pace-based drift check Coach Asa uses both depend on real weigh-ins, and
// nothing was ever prompting her for one — she'd only get here if she remembered to
// tap into /plan/checkin herself. "Mandatory but not mandatory": impossible to miss
// (sits above everything else on the page, not blended in with the daily cards) but
// never a hard gate — Skip for today dismisses it for the rest of THIS calendar day
// only (localStorage, same dedupe pattern as the workout-celebration flag), and the
// rest of the dashboard stays fully usable underneath it either way.
export default function WeeklyCheckinPrompt({ firstName, todayIso }: { firstName: string; todayIso: string }) {
  const router = useRouter()
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dismissed, setDismissed] = useState(false)

  // Read after mount, not in useState's initializer — that runs during SSR too
  // (where localStorage doesn't exist) and would otherwise render true one way on
  // the server and flip on the client, a hydration mismatch for no real benefit.
  useEffect(() => {
    try { if (localStorage.getItem('luf_checkin_skipped-' + todayIso) === '1') setDismissed(true) } catch { /* ignore */ }
  }, [todayIso])

  if (dismissed) return null

  function skip() {
    try { localStorage.setItem('luf_checkin_skipped-' + todayIso, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  async function submit() {
    if (!weight.trim()) { setError('Add your weight so I can actually track this.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/plan/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weight_lbs: weight }),
      })
      const data = await res.json()
      if (data.success) { setDismissed(true); router.refresh() }
      else setError(data.error || 'Something went wrong.')
    } catch { setError('Something went wrong. Try again.') }
    setLoading(false)
  }

  return (
    <div className="luf-reveal luf-in rounded-2xl border border-gold/40 bg-charcoal bg-gradient-to-br from-gold/15 to-charcoal p-5 mb-5">
      <p className="text-gold text-[10px] uppercase tracking-[0.2em] font-semibold mb-1.5">Quick check-in, {firstName}</p>
      <p className="text-white text-sm mb-4">Where&apos;s your weight today? This is how I actually track your real progress toward your goal — takes five seconds.</p>
      <div className="flex gap-2 mb-2">
        <input
          type="number" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={weight} onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g. 168" disabled={loading}
          className="flex-1 min-w-0 bg-obsidian border border-smoke rounded-xl px-4 py-3 text-base text-white placeholder:text-ivory/30 focus:border-gold/60 focus:outline-none"
        />
        <button onClick={submit} disabled={loading} className="bg-gold text-obsidian px-5 py-3 font-bold text-xs uppercase tracking-wider rounded-xl disabled:opacity-40 active:scale-95 transition-transform">
          {loading ? '…' : 'Log it'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <div className="flex items-center justify-between mt-2">
        <Link href="/plan/checkin" className="text-gold/80 hover:text-gold text-xs underline">Add measurements & notes too</Link>
        <button onClick={skip} className="text-ivory/40 hover:text-ivory/60 text-xs">Not today</button>
      </div>
    </div>
  )
}
