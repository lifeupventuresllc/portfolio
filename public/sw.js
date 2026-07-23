// Life-Up Fitness service worker — makes the app installable, gives an offline
// fallback, and receives push reminders. Network-FIRST (so new deploys are always
// fresh), cache as backup. Never touches API or auth requests.
const CACHE = 'luf-v4'

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
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = {} }
  const title = data.title || 'Life-Up Fitness'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/plan' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/plan'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus() } }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
