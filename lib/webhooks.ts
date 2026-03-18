import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function dispatchWebhooks(eventType: string, payload: Record<string, unknown>) {
  const supabase = createServiceClient()

  const { data: hooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('active', true)
    .contains('events', [eventType])

  if (!hooks || hooks.length === 0) return

  const promises = hooks.map(async (hook) => {
    const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() })
    const signature = crypto.createHmac('sha256', hook.secret).update(body).digest('hex')

    try {
      await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body,
      })
    } catch (err) {
      console.error(`Webhook dispatch failed for ${hook.url}:`, err)
    }
  })

  await Promise.allSettled(promises)
}
