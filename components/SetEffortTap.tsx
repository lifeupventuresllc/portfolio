'use client'

// Layer four of the workout-engine rebuild (Asa's spec, 2026-09-01): "after
// each set, the user provides a simple effort signal, easy, right, or hard,
// through a minimal full-screen tap interface shown during the rest timer.
// This signal immediately adjusts the very next set's parameters live, in
// addition to feeding the longer-term progression memory system... two
// simultaneous effects of one input, immediate and long-term."
//
// This component owns only the TAP — the immediate effect (rest-timer
// adjustment, shown live) and the long-term effect (the POST that updates
// lib/progression.ts's stored state) both happen in the parent
// (WorkoutPlayer), which is the thing that actually owns the countdown and
// the network call. Kept this way so the immediate half can apply the
// instant a finger lifts, with zero dependency on the fetch resolving.
//
// UI simplified 2026-09-02 (Asa's explicit call, mockup approved first):
// two big color-coded choices instead of three plain ones — "just right"
// removed so every tap is a real, unambiguous signal, not a hedge. The
// 'right' value stays in the type (progression.ts/set-effort route both
// still handle it) since nothing downstream needs to change — this
// component just never sends it anymore.
export type Effort = 'easy' | 'right' | 'hard'

export default function SetEffortTap({ exerciseName, onPick, onDismiss }: {
  exerciseName: string
  onPick: (effort: Effort) => void
  onDismiss: () => void
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 bg-obsidian/92 backdrop-blur-sm"
      role="dialog"
      aria-label="How did that set feel?"
    >
      {/* Never a hard block — a real rest timer keeps running underneath
          this exactly as it would with no tap at all; tapping the backdrop
          skips it. "Minimal," per spec, not a form. */}
      <button aria-label="Skip" onClick={onDismiss} className="absolute inset-0" tabIndex={-1} />
      <div className="relative z-10 text-center max-w-xs w-full h-[70vh] max-h-[420px] flex flex-col">
        <p className="text-ivory/50 text-xs font-semibold uppercase tracking-[0.2em] mb-1.5">{exerciseName}</p>
        <p className="text-white text-xl font-bold mb-6">How did that set feel?</p>
        {/* Asa's explicit call, 2026-09-02: two big color-coded choices, not
            three plain ones — "just right" removed so every tap gives a
            real, unambiguous signal. A "Difficult" tap logs as 'hard'
            underneath — same progression math as before, just without the
            middle option ever being offered. */}
        <div className="flex flex-col gap-3 flex-1">
          <button
            onClick={() => onPick('easy')}
            className="w-full flex-1 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xl font-extrabold rounded-3xl active:scale-95 transition-transform shadow-[0_8px_22px_-6px_rgba(34,197,94,0.55)]"
          >
            Easy
          </button>
          <button
            onClick={() => onPick('hard')}
            className="w-full flex-1 bg-gradient-to-br from-red-400 to-red-600 text-white text-xl font-extrabold rounded-3xl active:scale-95 transition-transform shadow-[0_8px_22px_-6px_rgba(239,68,68,0.55)]"
          >
            Difficult
          </button>
        </div>
        <button onClick={onDismiss} className="text-ivory/30 text-xs font-semibold mt-5">Skip</button>
      </div>
    </div>
  )
}
