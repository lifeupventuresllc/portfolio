'use client'

import { useEffect, useRef, useState } from 'react'
import { hapticTap } from '@/lib/haptics'
import { createClient } from '@/lib/supabase/client'
import { C, MONO, BODY, CSS, TopBar, H1, Sub } from './NewFlow'

// "Save your plan as you go" (2026-10-29, Asa's ask): the first screen of
// the intake, ONLY for an anonymous guest who hasn't answered yet. Before
// this, the only way to connect Google/email was buried under the "⋯" menu,
// so a guest's whole plan lived on a throwaway session. One big tap to save,
// or skip straight to the first question — never a wall.
//
// Google = linkIdentity(), NOT signInWithOAuth(): linking adds Google to her
// EXISTING anonymous user, so it keeps the same user id (every guest row
// stays attached) and she becomes a real account. If that Google account
// already belongs to a real user, Supabase refuses the link (it never
// merges or overwrites) and app/api/auth/callback sends her back here with
// ?link=taken — we then just sign her in to that real account instead.
// If manual linking is switched off in Supabase, linkIdentity() errors right
// away and we fall back to the plain sign-in the Home card already used.

const img = (src: string) => `url(/_next/image?url=${encodeURIComponent(src)}&w=1080&q=70)`
const FULL = { marginBottom: 'calc(-4.5rem - env(safe-area-inset-bottom))' }
const INTAKE_CALLBACK = (next: string) => `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`

export default function SaveGate({ notice, onSkip, onExit, onEmail }: {
  notice: 'taken' | 'failed' | null
  onSkip: () => void
  onExit: () => void
  onEmail: () => void
}) {
  const [busy, setBusy] = useState(notice === 'taken')
  const [msg, setMsg] = useState<string | null>(
    notice === 'taken' ? 'That Google account already has a plan. Opening it…'
      : notice === 'failed' ? "Google didn't connect. Try again, or skip for now." : null,
  )

  // Already-real Google account: sign her in to it (no merge, no overwrite).
  // next=/plan so the callback sends her to her dashboard if she's already
  // done her intake, or straight back here if she hasn't.
  async function signInExisting() {
    const { error } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: INTAKE_CALLBACK('/plan') } })
    if (error) { setBusy(false); setMsg("Google didn't connect. Try again, or skip for now.") }
  }
  const started = useRef(false)
  useEffect(() => {
    if (notice !== 'taken' || started.current) return
    started.current = true
    signInExisting()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice])

  async function google() {
    hapticTap(); setBusy(true); setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: INTAKE_CALLBACK('/plan/intake') } })
    if (!error) return // browser is on its way to Google
    // Linking unavailable (e.g. manual linking off) — same plain sign-in the
    // Home card's "Get started" already uses.
    const { error: e2 } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: INTAKE_CALLBACK('/plan/intake') } })
    if (e2) { setBusy(false); setMsg("Google didn't connect. Try again, or skip for now.") }
  }

  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: C.bg, color: C.ink, fontFamily: BODY, ...FULL }}>
      <style>{CSS}</style>
      <div className="nf-in min-h-[100dvh] relative flex flex-col">
        <div className="absolute inset-x-0 top-0 h-[46vh]" style={{ backgroundImage: img('/images/onboarding/name-step.jpg'), backgroundSize: 'cover', backgroundPosition: 'center 18%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,0) 10%, rgba(2,31,22,.8) 30%, #021F16 42%)' }} />
        <div className="relative max-w-md w-full mx-auto px-4 flex-1 flex flex-col" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <TopBar cal={null} onBack={onExit} onPhoto backLabel="Home" />
          <div className="flex-1 min-h-[22vh]" />
          <H1 size={50}>Save your plan as you go</H1>
          <Sub>Connect once and your answers are safe, even on a new phone. No password.</Sub>
          {msg && <p className="mx-1 mt-3 text-sm" style={{ color: C.gold }} role="status">{msg}</p>}
          <div className="mt-6 flex flex-col gap-3">
            <button onClick={google} disabled={busy} className="nf-press w-full h-[60px] rounded-full shrink-0 uppercase flex items-center justify-center gap-3 disabled:opacity-60"
              style={{ background: C.gold, color: C.bg, fontFamily: MONO, fontWeight: 700, fontSize: 15, letterSpacing: '.1em' }}>
              <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.ink }}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                </svg>
              </span>
              {busy ? 'One sec…' : 'Continue with Google'}
            </button>
            <div className="flex items-center justify-between px-2 mt-1">
              <button onClick={() => { hapticTap(); onEmail() }} disabled={busy} className="nf-press h-11 px-2 text-[13px] uppercase disabled:opacity-50"
                style={{ fontFamily: MONO, fontWeight: 700, letterSpacing: '.1em', color: C.mute }}>Use my email</button>
              <button onClick={() => { hapticTap(); onSkip() }} disabled={busy && notice === 'taken'} className="nf-press h-11 px-2 text-[13px] uppercase disabled:opacity-50"
                style={{ fontFamily: MONO, fontWeight: 700, letterSpacing: '.1em', color: C.mute }}>Skip for now →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
