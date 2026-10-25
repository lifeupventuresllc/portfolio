// Safe haptic tap helper. navigator.vibrate() only works on Android Chrome —
// iOS Safari ignores it. On iPhone (iOS 18+), toggling a hidden
// `<input type="checkbox" switch>` through its label plays the system's
// light switch tap — the only buzz a web page can get on iPhone today
// (2026-10-25, new intake). Older iPhones simply feel nothing. The full
// buzz everywhere lands once the app is wrapped natively.
let iosLabel: HTMLLabelElement | null = null

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function iosTap() {
  try {
    if (!iosLabel || !iosLabel.isConnected) {
      const id = 'luf-haptic-switch'
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('switch', '')
      input.id = id
      input.setAttribute('aria-hidden', 'true')
      input.tabIndex = -1
      input.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
      const label = document.createElement('label')
      label.htmlFor = id
      label.setAttribute('aria-hidden', 'true')
      label.style.cssText = input.style.cssText
      document.body.append(input, label)
      iosLabel = label
    }
    iosLabel.click()
  } catch { /* noop */ }
}

export function hapticTap(ms = 15) {
  if (typeof navigator === 'undefined') return
  if (typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(ms) } catch { /* noop — never let a haptic call break the UI */ }
    return
  }
  if (isIOS()) iosTap()
}
