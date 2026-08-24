'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import CoachHero from '@/components/CoachHero'

function ExitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Standard expand/collapse glyphs — four corner-arrows growing outward to
// maximize, pointing back inward to restore. Same pair every video player
// and chat widget uses for this, so it reads instantly without a label.
function MaximizeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 4 20 4 20 9" /><line x1="20" y1="4" x2="13" y2="11" />
      <polyline points="9 20 4 20 4 15" /><line x1="4" y1="20" x2="11" y2="13" />
    </svg>
  )
}
function MinimizeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 9 15 9 15 4" /><line x1="15" y1="9" x2="21" y2="3" />
      <polyline points="4 15 9 15 9 20" /><line x1="9" y1="15" x2="3" y2="21" />
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
export default function CoachOrbLauncher({ firstName, hasPlan, hasRealName = true }: { firstName: string; hasPlan: boolean; hasRealName?: boolean }) {
  const [open, setOpen] = useState(false)
  // Real ask, live: the fixed middle-band panel meant a longer reply always
  // needed scrolling, and there was no way to just take the whole screen for
  // it — same "maximize" toggle every video/chat widget has. Persists across
  // close/reopen on purpose, same reasoning as never unmounting CoachHero below.
  const [maximized, setMaximized] = useState(false)
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
        {/* Gold illumination accent — Asa's explicit call. A brighter border
            plus a real outer glow layer (not just the existing drop shadow),
            so the entry point to Coach Asa visibly reads as lit up. */}
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 rounded-full border-0 cursor-pointer px-4"
          style={{ height: 52, background: '#0d3a2a', border: '1px solid rgba(229,169,60,0.7)', boxShadow: '0 4px 14px -6px rgba(0,0,0,0.4), 0 0 18px 2px rgba(229,169,60,0.35)' }}
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

        {/* Made clickable straight to the real intake form — Asa's explicit
            call, viewing this as an anonymous visitor. Was a dead-end
            informational card before; "your numbers show up the moment you
            do" is a much stronger prompt when tapping it actually takes her
            there instead of just telling her to go find it herself. */}
        {!hasPlan && (
          <Link href="/plan/intake" className="block bg-[#0d3a2a] border border-[#E5A93C]/30 rounded-2xl p-5 text-center mt-4 w-full active:scale-[0.99] transition-transform hover:border-[#E5A93C]/60">
            <p className="text-white font-semibold text-sm mb-1">No plan built yet</p>
            <p className="text-[#EDE7DA]/60 text-xs">Tell Coach Asa what you&apos;re looking for above, or tap here to build your real plan — your numbers show up here the moment you do.</p>
          </Link>
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
            position," not "vanishing." Maximized state takes the same panel
            straight to a true full-screen sheet instead — same element, just
            a different target size, so the open/close animation still works
            identically either way. */}
        <div
          className="absolute transition-all duration-300 ease-out"
          style={maximized ? {
            left: 0, top: 0, width: '100vw', height: '100dvh',
            transform: open ? 'scale(1)' : 'scale(0.4)',
            transformOrigin: 'center bottom',
            opacity: open ? 1 : 0,
          } : {
            left: '50%', top: '50%',
            width: 'min(90vw, 420px)',
            height: '50vh',
            transform: open ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -35%) scale(0.4)',
            opacity: open ? 1 : 0,
            transformOrigin: 'center bottom',
          }}
        >
          <div className="relative h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMaximized((m) => !m)}
              aria-label={maximized ? 'Restore chat size' : 'Maximize chat'}
              className={`absolute z-10 h-9 w-9 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform ${maximized ? 'top-3 right-3' : '-top-2 -right-2'}`}
              style={{ background: '#0d3a2a', border: '1px solid rgba(229,169,60,0.4)', boxShadow: '0 4px 14px -6px rgba(0,0,0,0.5)' }}
            >
              {maximized ? <MinimizeIcon /> : <MaximizeIcon />}
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className={`absolute z-10 h-9 w-9 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform ${maximized ? 'top-3 left-3' : '-top-2 -left-2'}`}
              style={{ background: '#0d3a2a', border: '1px solid rgba(229,169,60,0.4)', boxShadow: '0 4px 14px -6px rgba(0,0,0,0.5)' }}
            >
              <ExitIcon />
            </button>
            <CoachHero firstName={firstName} hasPlan={hasPlan} maximized={maximized} hasRealName={hasRealName} />
          </div>
        </div>
      </div>,
      document.body
      )}
    </>
  )
}
