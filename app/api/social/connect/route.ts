import { NextRequest, NextResponse } from 'next/server'
import { getInstagramAuthUrl, getTikTokAuthUrl } from '@/lib/social'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform')
  const state = crypto.randomBytes(16).toString('hex')

  if (platform === 'instagram') {
    return NextResponse.redirect(getInstagramAuthUrl(state))
  }

  if (platform === 'tiktok') {
    return NextResponse.redirect(getTikTokAuthUrl(state))
  }

  return NextResponse.json({ error: 'Invalid platform. Use ?platform=instagram or ?platform=tiktok' }, { status: 400 })
}
