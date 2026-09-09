import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' || profile?.role === 'support'
}

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const svc = createServiceClient()
  const { data, error } = await svc.from('app_feedback').select('*').order('created_at', { ascending: false }).limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Marks a report seen/resolved — the whole point of the status column
// (spec item 3). Not required to use the widget at all; a plain read-only
// list would satisfy "see incoming feedback," but the column exists, so a
// one-tap way to clear it does too.
export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, status } = await request.json().catch(() => ({}))
  if (!id || !['new', 'seen', 'resolved'].includes(status)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const svc = createServiceClient()
  const { error } = await svc.from('app_feedback').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
