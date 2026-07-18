import webpush from 'web-push'

// Web Push sender. VAPID keypair is self-generated (no third-party account) and lives
// in env. Degrades to a no-op when not configured so nothing breaks until keys are set.
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:asa@asaluke.io'

export const pushConfigured = !!(PUBLIC && PRIVATE)
if (pushConfigured) webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE)

export type StoredSub = { endpoint: string; p256dh: string; auth: string }
export type PushPayload = { title: string; body: string; url?: string }

// Returns 'gone' when the subscription is dead (404/410) so the caller can prune it.
export async function sendPush(sub: StoredSub, payload: PushPayload): Promise<'ok' | 'gone' | 'error'> {
  if (!pushConfigured) return 'error'
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return 'ok'
  } catch (e) {
    const code = (e as { statusCode?: number })?.statusCode
    return code === 404 || code === 410 ? 'gone' : 'error'
  }
}
