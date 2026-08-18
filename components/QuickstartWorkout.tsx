'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// The Sculpt Sessions fast lane: one photo, one question, straight into a real
// workout — no injury/focus question (that's Coach Asa's chat path), no form.
// After she picks, POST builds the plan server-side, then a router.refresh()
// re-renders this same /plan/workout page, which now finds a real plan and
// shows WorkoutPlayer automatically — no separate redirect needed.
export default function QuickstartWorkout() {
  const router = useRouter()
  const [loading, setLoading] = useState<'home' | 'gym' | null>(null)
  const [error, setError] = useState(false)
  // Degrades to a plain gold-to-obsidian gradient if the hero photo isn't in
  // place yet, instead of a visibly broken image icon.
  const [imgFailed, setImgFailed] = useState(false)

  async function pick(location: 'home' | 'gym') {
    setLoading(location)
    setError(false)
    try {
      const res = await fetch('/api/plan/quickstart-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      })
      if (!res.ok) throw new Error('failed')
      router.refresh()
    } catch {
      setError(true)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-obsidian">
      <div className="relative w-full aspect-[4/5] sm:aspect-[16/9] max-h-[60vh] overflow-hidden">
        {!imgFailed ? (
          <Image
            src="/images/brand/sculpt-session-hero.jpg"
            alt=""
            fill
            priority
            className="object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-obsidian to-obsidian" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />
      </div>
      <div className="max-w-md mx-auto text-center px-4 -mt-16 relative">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">Sculpt Sessions</p>
        <h1 className="text-2xl font-bold text-white mb-2">A real, beginner-friendly full-body workout</h1>
        <p className="text-ivory/60 text-sm mb-8">One question — where are you training today?</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => pick('home')}
            disabled={loading !== null}
            className="bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl disabled:opacity-60"
          >
            {loading === 'home' ? 'Building your workout…' : "I'm at home"}
          </button>
          <button
            onClick={() => pick('gym')}
            disabled={loading !== null}
            className="bg-charcoal border border-smoke text-white px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl disabled:opacity-60"
          >
            {loading === 'gym' ? 'Building your workout…' : "I'm at the gym"}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-4">Couldn&apos;t build that — try again.</p>}
      </div>
    </div>
  )
}
