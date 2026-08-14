import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin-auth'

// Records a reply Asa pasted in from Instagram/TikTok (no compliant way to read
// a personal DM inbox automatically) and unlocks AI-drafted response generation.
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { prospectId, replyText } = await request.json()
  if (!prospectId || !replyText || !String(replyText).trim()) {
    return NextResponse.json({ error: 'Missing prospectId/replyText' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: prospect, error: pErr } = await svc.from('outreach_prospects').select('touch_count').eq('id', prospectId).single()
  if (pErr || !prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  const { error: logErr } = await svc.from('outreach_log').insert({
    prospect_id: prospectId,
    channel: 'dm',
    message_type: 'inbound_reply',
    message_content: String(replyText).trim(),
    touch_number: (prospect.touch_count || 0) + 1,
  })
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })

  const { data: updated, error: updErr } = await svc
    .from('outreach_prospects')
    .update({ status: 'replied', updated_at: new Date().toISOString() })
    .eq('id', prospectId)
    .select()
    .single()

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  return NextResponse.json({ prospect: updated })
}
