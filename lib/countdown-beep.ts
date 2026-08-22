// Countdown beep for the last 10 seconds of any timed workout step —
// exercise holds AND rest periods alike, since both share the same
// `seconds`-driven countdown in WorkoutPlayer. Synthesized via Web Audio
// (a couple of oscillator tones) rather than a sourced/licensed sound file
// — zero licensing question, zero network fetch, and gives full control
// over the "gets louder as it approaches zero" feel that was asked for.
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// Real bug found live: playCountdownBeep only ever fired from the
// countdown's setInterval tick, never from a direct click — so the
// AudioContext's very first creation/resume attempt always happened
// OUTSIDE a genuine user gesture. Browsers require the resume to happen
// inside a real click/tap call stack or they leave it permanently
// suspended (no console error, just silent audio forever) — exactly what
// "refreshed my session and couldn't hear anything" was. Call this once
// on the very first tap anywhere on the workout screen (see
// WorkoutPlayer.tsx) so the context is already running by the time a real
// countdown needs it, well before any timer ever touches it.
export function unlockAudioContext() {
  getCtx()
}

// secondsLeft: 10 down to 1. The final beep (secondsLeft === 1, i.e. the
// step is about to hit zero) gets a distinct higher, longer tone — same
// "go" cue pattern as a real gym interval timer.
export function playCountdownBeep(secondsLeft: number) {
  const c = getCtx()
  if (!c) return
  const isFinal = secondsLeft <= 1
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = 'sine'
  osc.frequency.value = isFinal ? 1046.5 : 880 // C6 on the final beep, A5 otherwise
  const peak = Math.min(0.12 + (10 - secondsLeft) * 0.02, 0.32) // builds louder toward zero
  const dur = isFinal ? 0.35 : 0.14
  const t0 = c.currentTime
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}
