import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: List connected accounts
export async function GET() {
  const { data, error } = await supabase
    .from('social_accounts')
    .select('id, platform, account_name, connected_at, active, token_expires_at')
    .eq('active', true)
    .order('connected_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accounts: data })
}

// DELETE: Disconnect an account
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()

  const { error } = await supabase
    .from('social_accounts')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
