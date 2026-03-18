import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin'
}

export async function GET() {
  const supabase = createClient()
  if (!(await verifyAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: affiliates, error } = await supabase
    .from('affiliates')
    .select('*, profiles(email), referrals(id, commission_amount, status)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(affiliates)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  if (!(await verifyAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, code, commissionRate } = await request.json()
  if (!userId || !code) {
    return NextResponse.json({ error: 'User ID and code required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('affiliates')
    .insert({
      user_id: userId,
      code: code.toLowerCase(),
      commission_rate: commissionRate || 20,
      active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  if (!(await verifyAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await request.json()
  const { error } = await supabase
    .from('affiliates')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
