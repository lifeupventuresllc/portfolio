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
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('outreach_prospects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createServiceClient()
  const body = await request.json()

  // Support bulk import (array of prospects)
  if (Array.isArray(body)) {
    const { data, error } = await supabase
      .from('outreach_prospects')
      .insert(body.map(p => ({
        name: p.name,
        email: p.email || null,
        phone: p.phone || null,
        platform: p.platform || 'email',
        prospect_type: p.prospect_type || p.type || 'other',
        instagram: p.instagram || null,
        notes: p.notes || null,
        status: 'new',
      })))
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ inserted: data?.length || 0 })
  }

  // Single prospect
  const { data, error } = await supabase
    .from('outreach_prospects')
    .insert({
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      platform: body.platform || 'email',
      prospect_type: body.prospect_type || body.type || 'other',
      instagram: body.instagram || null,
      notes: body.notes || null,
      status: 'new',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createServiceClient()
  const { id, ...updates } = await request.json()

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data, error } = await supabase
    .from('outreach_prospects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-schedule follow-ups when status changes to "contacted" and prospect has email
  if (updates.status === 'contacted' && data?.email && !data?.next_follow_up_at) {
    const now = new Date()
    const FOLLOW_UP_DAYS = [2, 5, 10, 20]

    for (let i = 0; i < FOLLOW_UP_DAYS.length; i++) {
      const scheduledFor = new Date(now.getTime() + FOLLOW_UP_DAYS[i] * 24 * 60 * 60 * 1000)
      await supabase.from('follow_up_queue').insert({
        prospect_id: id,
        sequence_type: 'free-sample',
        step: i,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
      })
    }

    // Mark that follow-ups are scheduled
    await supabase.from('outreach_prospects').update({
      next_follow_up_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', id)
  }

  return NextResponse.json(data)
}
