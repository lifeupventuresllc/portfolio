'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// Shown only when Supabase's "Confirm email" is off and she's using the app before
// verifying — a gentle reminder, never a gate (see the immediate-access signup
// change in components/AuthForm.tsx). Dismissible per browser session so it's a
// nudge, not a nag on every visit.
export default function VerifyEmailBanner({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(true)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem('luf_verify_email_dismissed') === '1') } catch { setDismissed(false) }
  }, [])

  if (dismissed) return null

  function dismiss() {
    try { sessionStorage.setItem('luf_verify_email_dismissed', '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  async function resend() {
    setSending(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s/g, ''),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/[^A-Za-z0-9._-]/g, ''),
      { isSingleton: false }
    )
    await supabase.auth.resend({ type: 'signup', email })
    setSending(false)
    setSent(true)
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-charcoal/70 border border-smoke rounded-xl px-4 py-2.5 mb-4 text-xs">
      <p className="text-ivory/50">
        {sent ? 'Verification email sent — check your inbox.' : <>Verify {email} whenever you get a sec — {' '}
          <button onClick={resend} disabled={sending} className="text-gold hover:underline disabled:opacity-50">{sending ? 'sending…' : 'resend link'}</button></>}
      </p>
      <button onClick={dismiss} className="text-ivory/30 hover:text-ivory/60 shrink-0">✕</button>
    </div>
  )
}
