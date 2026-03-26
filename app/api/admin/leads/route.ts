import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('funnel_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient()
  const { id, ...updates } = await request.json()

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // If status changed to converted, set converted_at
  if (updates.status === 'converted') {
    updates.converted_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('funnel_leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
