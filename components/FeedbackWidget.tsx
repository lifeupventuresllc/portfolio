'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

// Always-on "Report an issue" button — persistent on every real screen, not
// buried in a menu (Asa's spec, 2026-09-09). Separate from the periodic
// /plan/feedback pulse-check (components/FeedbackForm.tsx): that one's an
// occasional "how's it going" nudge; this one's a dedicated bug-report entry
// point that's always there the moment something breaks. Mounted once in
// app/layout.tsx so it's truly global — hides itself only on /admin (Asa's
// own tooling, not a user-facing screen) so it never looks like part of the
// interface she's managing feedback from.
function osLabel(): string {
  if (typeof navigator === 'undefined') return ''
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Other'
}

export default function FeedbackWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (pathname?.startsWith('/admin')) return null

  function close() {
    setOpen(false)
    // Reset shortly after the close animation would finish, not instantly —
    // an instant reset would flash the blank form before the sheet is gone.
    setTimeout(() => { setMessage(''); setDone(false); setError('') }, 200)
  }

  async function submit() {
    if (!message.trim()) { setError('Let us know what happened first.'); return }
    setSending(true); setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), screen: pathname, os: osLabel() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Report an issue"
        className="fixed z-[45] bottom-24 right-4 w-12 h-12 rounded-full bg-charcoal border border-gold/40 text-gold shadow-lg shadow-black/40 flex items-center justify-center hover:border-gold hover:bg-gold/10 active:scale-95 transition-all"
        style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 21V4a1 1 0 0 1 1-1h13.5a.5.5 0 0 1 .4.8L15 9l3.9 5.2a.5.5 0 0 1-.4.8H5a1 1 0 0 0-1 1Z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60" onClick={close}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-charcoal border border-smoke rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            {done ? (
              <div className="text-center py-4">
                <p className="text-3xl mb-3">✅</p>
                <p className="text-white font-semibold text-lg mb-1">Got it — thanks, we&apos;ll look into this.</p>
                <p className="text-ivory/50 text-sm mb-6">Your report went straight through.</p>
                <button onClick={close} className="w-full bg-gold text-obsidian py-3 font-bold text-sm uppercase tracking-wider rounded-2xl">Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-lg">Report an issue</h2>
                  <button onClick={close} aria-label="Close" className="text-ivory/40 hover:text-white text-xl leading-none px-2">×</button>
                </div>
                <label className="block text-ivory/50 text-xs uppercase tracking-wider mb-2">What happened?</label>
                <textarea
                  autoFocus
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setError('') }}
                  rows={5}
                  placeholder="Tell us what broke or what felt off…"
                  className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold transition-colors resize-none mb-1"
                />
                <p className="text-ivory/30 text-[11px] mb-4">We automatically include the screen you&apos;re on and your account — no need to explain that part.</p>
                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                <button
                  onClick={submit}
                  disabled={sending}
                  className="w-full bg-gold text-obsidian py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Submit'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
