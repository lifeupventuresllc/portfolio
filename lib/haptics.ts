// Safe haptic tap helper. navigator.vibrate() only works on Android Chrome —
// iOS Safari (most of this app's users today) silently ignores it. This is a
// down payment on the "felt" feedback Asa wants; the real thing lands once the
// app is wrapped natively via Capacitor.
export function hapticTap(ms = 15) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try { navigator.vibrate(ms) } catch { /* noop — never let a haptic call break the UI */ }
}
