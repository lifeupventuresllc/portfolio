import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
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
  return NextResponse.json(data)
}
