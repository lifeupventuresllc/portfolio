import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exchangeTikTokCode } from '@/lib/social'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin?social=error&message=${error || 'no_code'}`)
  }

  const result = await exchangeTikTokCode(code)

  if (!result) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin?social=error&message=token_exchange_failed`)
  }

  // Deactivate any existing TikTok connections
  await supabase
    .from('social_accounts')
    .update({ active: false })
    .eq('platform', 'tiktok')

  // Save new connection
  await supabase.from('social_accounts').insert({
    platform: 'tiktok',
    account_name: result.openId,
    account_id: result.openId,
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    token_expires_at: new Date(Date.now() + result.expiresIn * 1000).toISOString(),
  })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin?social=success&platform=tiktok`)
}
