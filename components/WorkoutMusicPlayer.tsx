'use client'

import { useEffect, useRef, useState } from 'react'
import { WORKOUT_TRACKS } from '@/lib/workout-music'

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
  )
}
function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
  )
}
function SkipBackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6v12l-8.5-6z" /></svg>
  )
}
function SkipForwardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 6l8.5 6L4 18z" /></svg>
  )
}
function MusicNoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M9 18V5l10-2v13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" />
    </svg>
  )
}

// Background music for the workout screen — Peloton/Nike Training-style
// persistent mini-player. Rotation loops continuously through the whole
// library (see lib/workout-music.ts for the track list + license source).
export default function WorkoutMusicPlayer({ duck = false }: {
  // True during the last 10 seconds of any timed step (exercise hold or
  // rest, set by WorkoutPlayer) — ducks the music down so the countdown
  // beep (lib/countdown-beep.ts) reads clearly over it without cutting the
  // music out entirely.
  duck?: boolean
}) {
  // Real bug found live on production: this used to pick a RANDOM starting
  // track inside useState's initializer. That function runs once during
  // server-render and again, separately, during client hydration — two
  // different random values almost every time, a classic Next.js SSR
  // hydration mismatch. React can quietly discard a subtree that mismatches
  // badly enough in production (no visible error, no console warning in the
  // production build), which is exactly how this whole player silently
  // vanished on the live site — confirmed live: build succeeded, the route's
  // JS bundle grew to include it, but the DOM had zero trace of it. Fixed by
  // starting deterministic (index 0, identical on server and client) and
  // never touching Math.random()/Date.now() during the initial render.
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  // Autoplay-on-start is attempted, but browsers can still block a fresh
  // <audio> element from playing with sound before any direct gesture on
  // it specifically — this tracks whether that happened so the UI can show
  // a real "tap to start music" affordance instead of silently doing nothing.
  const [blocked, setBlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const track = WORKOUT_TRACKS[idx]

  // One-time autoplay attempt, right on mount — also where the starting
  // track gets randomized (Asa's ask, 2026-08-31: "make the music randomly
  // play each time"). Deliberately done HERE, inside a client-only effect
  // that only ever runs after the first hydration-matching render, and NOT
  // by seeding useState(idx) with a random value — that's exactly the
  // pattern that caused the real silent-production-bug described above.
  // `setIdx` won't have re-rendered the DOM yet by the time `.play()` runs
  // below in this same synchronous effect body, so `a.src` is set directly
  // first — React re-applies the identical value on the next render once
  // `idx` catches up, a harmless no-op there.
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const startIdx = Math.floor(Math.random() * WORKOUT_TRACKS.length)
    setIdx(startIdx)
    a.src = WORKOUT_TRACKS[startIdx].src
    a.play().then(() => { setPlaying(true); setBlocked(false) }).catch(() => setBlocked(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Whenever the track changes because she tapped next/back WHILE music was
  // already playing, keep playing — resume on the new src instead of going
  // silent. `playing` is still false at mount (the effect above hasn't
  // resolved yet), so this naturally no-ops on the initial render and only
  // ever fires for a real next/back press.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !playing) return
    a.play().catch(() => setBlocked(true))
  }, [idx, playing])

  // Smooth volume ramp rather than an instant jump — a hard cut reads as a
  // glitch, a ~400ms fade reads as an intentional duck. Ramps back up the
  // same way once the 10-second countdown clears.
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const target = duck ? 0.3 : 1
    const start = a.volume
    if (Math.abs(start - target) < 0.01) return
    const startTime = performance.now()
    const durationMs = 400
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs)
      a.volume = start + (target - start) * t
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [duck])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play().then(() => { setPlaying(true); setBlocked(false) }).catch(() => setBlocked(true)) }
  }
  const next = () => setIdx((i) => (i + 1) % WORKOUT_TRACKS.length)
  const back = () => setIdx((i) => (i - 1 + WORKOUT_TRACKS.length) % WORKOUT_TRACKS.length)

  return (
    <div className="flex items-center gap-3 bg-charcoal border border-smoke rounded-2xl px-3 py-2 mb-4">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={track.src} onEnded={next} />
      <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
        <MusicNoteIcon />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-ivory text-xs font-semibold truncate">{track.title}</p>
        <p className="text-ivory/40 text-[10px] truncate">{track.artist} · {blocked && !playing ? 'tap play to start music' : track.genre === 'hip-hop' ? 'Hip-Hop' : track.genre === 'rnb' ? 'R&B' : 'Soul'}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={back} aria-label="Previous track" className="w-7 h-7 flex items-center justify-center text-ivory/60 hover:text-gold active:scale-90 transition-all">
          <SkipBackIcon />
        </button>
        <button onClick={toggle} aria-label={playing ? 'Pause music' : 'Play music'} className="w-8 h-8 rounded-full bg-gold text-charcoal flex items-center justify-center active:scale-90 transition-all">
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button onClick={next} aria-label="Next track" className="w-7 h-7 flex items-center justify-center text-ivory/60 hover:text-gold active:scale-90 transition-all">
          <SkipForwardIcon />
        </button>
      </div>
    </div>
  )
}
