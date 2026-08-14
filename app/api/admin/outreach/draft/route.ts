import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin-auth'
import { draftMessage, type OutreachMessageType } from '@/lib/outreach-ai'

const VALID_TYPES: OutreachMessageType[] = ['opener', 'fu2', 'matcher']

// Draft-only — nothing is persisted here. The draft is written to outreach_log
// only once Asa actually sends it (POST /api/admin/outreach/mark-sent).
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { prospectId, messageType } = await request.json()
  if (!prospectId || !VALID_TYPES.includes(messageType)) {
    return NextResponse.json({ error: 'Missing or invalid prospectId/messageType' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: prospect, error: pErr } = await svc.from('outreach_prospects').select('name, platform, prospect_type, notes').eq('id', prospectId).single()
  if (pErr || !prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  const { data: history } = await svc
    .from('outreach_log')
    .select('message_type, message_content')
    .eq('prospect_id', prospectId)
    .order('sent_at', { ascending: true })

  const message = await draftMessage(prospect, messageType, history || [])
  if (!message) return NextResponse.json({ error: 'Draft generation unavailable — check ANTHROPIC_API_KEY.' }, { status: 503 })

  return NextResponse.json({ message })
}
