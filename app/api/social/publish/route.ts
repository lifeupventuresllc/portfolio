import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { publishToInstagram, publishToTikTok } from '@/lib/social'

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

// POST: Publish a scheduled post now (or called by cron)
export async function POST(req: NextRequest) {
  const { postId } = await req.json()

  // Get the scheduled post
  const { data: post, error: postError } = await supabase()
    .from('scheduled_posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  if (!post.media_url) {
    return NextResponse.json({ error: 'No media URL. Upload media first.' }, { status: 400 })
  }

  // Mark as publishing
  await supabase().from('scheduled_posts').update({ status: 'publishing' }).eq('id', postId)

  const fullCaption = post.hashtags ? `${post.caption}\n\n${post.hashtags}` : post.caption
  const results: { platform: string; success: boolean; id?: string; error?: string }[] = []

  // Publish to Instagram
  if (post.platform === 'instagram' || post.platform === 'both') {
    const { data: igAccount } = await supabase()
      .from('social_accounts')
      .select('page_access_token, ig_user_id')
      .eq('platform', 'instagram')
      .eq('active', true)
      .single()

    if (igAccount) {
      const result = await publishToInstagram(
        igAccount.page_access_token,
        igAccount.ig_user_id,
        post.media_url,
        fullCaption
      )

      if ('id' in result) {
        results.push({ platform: 'instagram', success: true, id: result.id })
      } else {
        results.push({ platform: 'instagram', success: false, error: result.error })
      }
    } else {
      results.push({ platform: 'instagram', success: false, error: 'No Instagram account connected' })
    }
  }

  // Publish to TikTok
  if (post.platform === 'tiktok' || post.platform === 'both') {
    const { data: ttAccount } = await supabase()
      .from('social_accounts')
      .select('access_token')
      .eq('platform', 'tiktok')
      .eq('active', true)
      .single()

    if (ttAccount) {
      const result = await publishToTikTok(
        ttAccount.access_token,
        post.media_url,
        fullCaption
      )

      if ('id' in result) {
        results.push({ platform: 'tiktok', success: true, id: result.id })
      } else {
        results.push({ platform: 'tiktok', success: false, error: result.error })
      }
    } else {
      results.push({ platform: 'tiktok', success: false, error: 'No TikTok account connected' })
    }
  }

  // Update post status
  const allSuccess = results.every(r => r.success)
  const publishedId = results.find(r => r.id)?.id

  await supabase().from('scheduled_posts').update({
    status: allSuccess ? 'published' : 'failed',
    published_at: allSuccess ? new Date().toISOString() : null,
    published_id: publishedId || null,
    error_message: allSuccess ? null : results.filter(r => !r.success).map(r => `${r.platform}: ${r.error}`).join('; '),
  }).eq('id', postId)

  return NextResponse.json({ results })
}
