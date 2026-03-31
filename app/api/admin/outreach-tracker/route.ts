import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'support'].includes(profile.role)) return null
  return user
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7', 10)

  const supabase = createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_outreach')
    .select('*')
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { date, platform, dms_sent, responses_received, meetings_booked, deals_closed, notes } = body

  if (!date || !platform) {
    return NextResponse.json({ error: 'Missing date or platform' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('daily_outreach')
    .insert({
      date,
      platform,
      dms_sent: dms_sent || 0,
      responses_received: responses_received || 0,
      meetings_booked: meetings_booked || 0,
      deals_closed: deals_closed || 0,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('daily_outreach')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
