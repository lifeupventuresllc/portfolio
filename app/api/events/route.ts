import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { eventType, metadata } = await request.json()

    if (!eventType) {
      return NextResponse.json({ error: 'Event type required' }, { status: 400 })
    }

    // Try to get the authenticated user (optional)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Use service client for insert (RLS)
    const service = createServiceClient()
    await service.from('events').insert({
      user_id: user?.id || null,
      event_type: eventType,
      metadata: metadata || {},
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
  }
}
