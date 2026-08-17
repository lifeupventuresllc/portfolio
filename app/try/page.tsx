'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// The single anonymous-entry choke point every marketing CTA and homepage
// feature card routes through (app/page.tsx, app/challenge/page.tsx) —
// instead of scattering "create a session" bootstrap logic across every
// entry point. Ensures a session exists (creating an anonymous one via
// supabase.auth.signInAnonymously() only if she doesn't already have any
// session — a real account included, so a returning logged-in user just
// passes through untouched), provisions her enrollment via /api/anon/start,
// then sends her straight to the real feature she clicked. No account, no
// login wall — see the anonymous-access plan for the full "why."
function TryInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const to = searchParams.get('to') || '/plan'
    let cancelled = false

    async function run() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          const { error: anonError } = await supabase.auth.signInAnonymously()
          if (anonError) throw anonError
        }
        const res = await fetch('/api/anon/start', { method: 'POST' })
        if (!res.ok) throw new Error('anon/start failed')
        if (!cancelled) router.replace(to)
      } catch {
        if (!cancelled) setError(true)
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-paper flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-ink text-lg font-semibold mb-2">Couldn&apos;t get you in — try again</p>
          <p className="text-ink/50 text-sm mb-6">Or create a free account the usual way.</p>
          <a href="/signup?redirect=/plan/intake" className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl">Create account</a>
        </div>
      </div>
    )
  }

  // Same "One moment" visual language as app/plan/intake/page.tsx's
  // building phase, so this doesn't read as a different, unfamiliar screen.
  return (
    <div className="min-h-[100dvh] bg-paper flex items-center justify-center px-6">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-gold/25" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" style={{ animationDuration: '0.9s' }} />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">💪🏽</div>
        </div>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">One moment</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-2">Getting you in…</h1>
      </div>
    </div>
  )
}

export default function TryPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-paper" />}>
      <TryInner />
    </Suspense>
  )
}
