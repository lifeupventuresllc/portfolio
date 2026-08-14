import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin-auth'

// Logs a message Asa actually sent (manual tap, per Instagram/TikTok policy) and
// advances the prospect's touch tracking.
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { prospectId, messageType, content } = await request.json()
  if (!prospectId || !messageType || !content) {
    return NextResponse.json({ error: 'Missing prospectId/messageType/content' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: prospect, error: pErr } = await svc.from('outreach_prospects').select('touch_count, status').eq('id', prospectId).single()
  if (pErr || !prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  const touchNumber = (prospect.touch_count || 0) + 1

  const { error: logErr } = await svc.from('outreach_log').insert({
    prospect_id: prospectId,
    channel: 'dm',
    message_type: messageType,
    message_content: content,
    touch_number: touchNumber,
  })
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })

  const { data: updated, error: updErr } = await svc
    .from('outreach_prospects')
    .update({
      touch_count: touchNumber,
      last_contacted_at: new Date().toISOString(),
      status: prospect.status === 'new' ? 'contacted' : prospect.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId)
    .select()
    .single()

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  return NextResponse.json({ prospect: updated })
}
