// Life-Up Fitness service worker — makes the app installable, gives an offline
// fallback, and receives push reminders. Network-FIRST (so new deploys are always
// fresh), cache as backup. Never touches API or auth requests.
const CACHE = 'luf-v5'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return
  // Video (and any other ranged-request media) must bypass this entirely — a video
  // element streams via Range requests, which return 206 Partial Content, and the
  // Cache API cannot store 206 responses (cache.put throws on them). That silently
  // stalled every <video> on the site (hero backgrounds, tile rows) at readyState 0
  // forever, since respondWith's fetch chain never resolved cleanly. Videos don't
  // need offline caching anyway — let the browser stream them natively.
  if (url.pathname.startsWith('/videos/') || req.headers.has('range')) return

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req))
  )
})

// ── Push reminders ──
// Meal-time offers (2026-10-30) carry offerId + Yes / No actions. Android and
// desktop Chrome show the buttons; iPhone shows none, and a tap opens the
// offer page (data.url) with the same two buttons, full screen.
function offerOptions(data) {
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/plan', offerId: data.offerId || null },
  }
  if (data.tag) options.tag = data.tag
  if (Array.isArray(data.actions) && data.actions.length) options.actions = data.actions
  return options
}

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = {} }
  const title = data.title || 'Life-Up Fitness'
  event.waitUntil(self.registration.showNotification(title, offerOptions(data)))
})

function openOrFocus(url) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    // An outside link (her delivery app's site) always gets its own window.
    const same = new URL(url, self.location.origin).origin === self.location.origin
    if (same) for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus() } }
    if (self.clients.openWindow) return self.clients.openWindow(url)
  })
}

function answerOffer(offerId, answer) {
  return fetch('/api/plan/offer/' + offerId, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer: answer, via: 'notification' }),
  }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const d = event.notification.data || {}
  const url = d.url || '/plan'
  const offerId = d.offerId

  // Yes (Android/desktop button): save it (logs the meal + price), then open
  // her delivery app on that restaurant — no page in between. A home pick
  // opens its page (what she needs). Never orders or charges anything.
  if (offerId && event.action === 'yes') {
    event.waitUntil(answerOffer(offerId, 'yes').then((j) => openOrFocus((j && j.open) || url)))
    return
  }
  // No (button): one different meal as a fresh notification right here, no
  // new push from the server. After a second No: nothing until her next meal.
  if (offerId && event.action === 'no') {
    event.waitUntil(answerOffer(offerId, 'no').then((j) => {
      if (!j) return openOrFocus(url + '?a=no') // couldn't reach us → the page finishes it
      if (j.next && j.next.push) {
        const p = j.next.push
        return self.registration.showNotification(p.title, offerOptions(p))
      }
    }))
    return
  }
  event.waitUntil(openOrFocus(url))
})
