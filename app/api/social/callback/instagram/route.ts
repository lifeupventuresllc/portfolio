import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exchangeInstagramCode } from '@/lib/social'

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
let _supabase: ReturnType<typeof makeSupabase> | null = null
function supabase() {
  return (_supabase ??= makeSupabase())
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin?social=error&message=${error || 'no_code'}`)
  }

  const result = await exchangeInstagramCode(code)

  if (!result) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin?social=error&message=token_exchange_failed`)
  }

  // Deactivate any existing Instagram connections
  await supabase()
    .from('social_accounts')
    .update({ active: false })
    .eq('platform', 'instagram')

  // Save new connection
  await supabase().from('social_accounts').insert({
    platform: 'instagram',
    account_name: result.accountName,
    account_id: result.userId,
    access_token: result.accessToken,
    page_id: result.pageId,
    page_access_token: result.pageAccessToken,
    ig_user_id: result.igUserId,
    token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
  })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin?social=success&platform=instagram&account=${result.accountName}`)
}
