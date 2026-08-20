'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import CoachHero from '@/components/CoachHero'

function ExitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// The dashboard's primary focus: a compact glowing pill (emerald/mustard —
// the Jewel-Box palette), sitting right under the hero photo. Tapping it
// brings the real, fully-functional CoachHero forward as a centered 9:16
// modal over a dimmed (not solid) scrim — Asa's explicit spec, modeled on a
// standard AI chat overlay (think a full-screen Claude/ChatGPT panel, not a
// popover). CoachHero is mounted here UNCONDITIONALLY, even while closed —
// only its container's visibility/transform toggles. That's deliberate, not
// an oversight: it's what makes closing non-destructive. Closing by either
// the exit button or tapping the scrim never unmounts CoachHero, so her
// in-progress draft text and the whole conversation are exactly where she
// left them if she reopens — no localStorage hack needed, React just never
// throws the component away.
export default function CoachOrbLauncher({ firstName, hasPlan }: { firstName: string; hasPlan: boolean }) {
  const [open, setOpen] = useState(false)
  // Real root cause of "modal is huge / big blank gap / had to scroll to reach
  // the input": app/plan/template.tsx wraps every /plan page in a `.luf-page`
  // div that runs a one-time entrance animation touching `transform`. Even
  // once that animation finishes, Chrome keeps treating it as an active
  // transform context (fill-mode: both), which makes `position: fixed`
  // descendants resolve against the PAGE's full scrollable height instead of
  // the real viewport — confirmed live: the modal's `fixed inset-0` wrapper
  // measured 1104px tall against a 687px viewport, so a "centered" panel sat
  // mostly below the fold. Portaling straight to document.body sidesteps any
  // transformed ancestor, now or from any future page animation, rather than
  // just patching around this one instance.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Standard modal behavior — the page shouldn't scroll out from under a
  // background that's supposed to read as "dimmed, still there," not gone.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [open])

  // Close on Escape — free with a modal this shape, standard expectation.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* Docked trigger — always in the page flow. Left in place (not
          conditionally hidden) while the modal's open: it's background
          content like everything else, and the scrim dims it the same way. */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 rounded-full border-0 cursor-pointer px-4"
          style={{ height: 52, background: '#0d3a2a', border: '1px solid rgba(229,169,60,0.4)', boxShadow: '0 4px 14px -6px rgba(0,0,0,0.4)' }}
        >
          <span
            className="luf-float rounded-full shrink-0"
            style={{
              width: 28, height: 28,
              background: 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.9), rgba(255,255,255,0.35) 30%, rgba(4,74,52,0.6) 70%, rgba(2,31,22,0) 100%)',
              boxShadow: '0 0 10px 2px rgba(229,169,60,0.5)',
            }}
          />
          <span className="text-white text-sm font-bold">Talk to Coach Asa…</span>
        </button>

        {!hasPlan && (
          <div className="bg-[#0d3a2a] border border-[#E5A93C]/30 rounded-2xl p-5 text-center mt-4 w-full">
            <p className="text-white font-semibold text-sm mb-1">No plan built yet</p>
            <p className="text-[#EDE7DA]/60 text-xs">Tell Coach Asa what you&apos;re looking for above, or pick a feature above — your numbers show up here the moment you do.</p>
          </div>
        )}
      </div>

      {/* Modal layer. Always mounted (not conditionally rendered) so
          CoachHero's state survives every open/close — see the note above.
          Portaled to document.body (see the mounted/transform-context note
          above) — mounted guards against the SSR/first-paint mismatch since
          document.body doesn't exist on the server. */}
      {mounted && createPortal(
      <div
        className="fixed inset-0 z-50"
        style={{ pointerEvents: open ? 'auto' : 'none' }}
        aria-hidden={!open}
      >
        {/* Scrim — a dim, not a solid cover. Background stays visible through
            it, just pushed back. Tapping anywhere on it closes the modal. */}
        <div
          onClick={() => setOpen(false)}
          className="absolute inset-0 transition-opacity duration-300 ease-out"
          style={{ background: 'rgba(2,31,22,0.72)', opacity: open ? 1 : 0 }}
        />

        {/* Panel — centered on the middle HALF of the screen (25vh-75vh band:
            "lower half of the top quadrant to the top half of the bottom
            quadrant," Asa's exact spec), not a near-fullscreen 9:16 sheet.
            The earlier 9:16 version stood ~74% of viewport tall, which left
            a big dead gap between the greeting and the pinned input and
            forced scrolling to reach it. Fixed height instead of an
            aspect-ratio, so the panel always hugs that middle band
            regardless of content length. Still scales/fades from (and back
            down to) the docked bar's spot rather than just a flat fade, so
            closing genuinely reads as "returning to its normal docked
            position," not "vanishing." */}
        <div
          className="absolute left-1/2 top-1/2 transition-all duration-300 ease-out"
          style={{
            width: 'min(90vw, 420px)',
            height: '50vh',
            transform: open ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -35%) scale(0.4)',
            opacity: open ? 1 : 0,
            transformOrigin: 'center bottom',
          }}
        >
          <div className="relative h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="absolute -top-2 -left-2 z-10 h-9 w-9 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
              style={{ background: '#0d3a2a', border: '1px solid rgba(229,169,60,0.4)', boxShadow: '0 4px 14px -6px rgba(0,0,0,0.5)' }}
            >
              <ExitIcon />
            </button>
            <CoachHero firstName={firstName} hasPlan={hasPlan} />
          </div>
        </div>
      </div>,
      document.body
      )}
    </>
  )
}
