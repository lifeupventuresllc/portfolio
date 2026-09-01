import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// GET: List scheduled posts
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || 'all'

  let query = supabase()
    .from('scheduled_posts')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query.limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data })
}

// POST: Schedule a new post
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { platform, content_type, caption, hashtags, media_url, scheduled_at, planner_day } = body

  if (!caption || !scheduled_at) {
    return NextResponse.json({ error: 'Caption and scheduled_at are required' }, { status: 400 })
  }

  const { data, error } = await supabase()
    .from('scheduled_posts')
    .insert({
      platform: platform || 'instagram',
      content_type: content_type || 'reel',
      caption,
      hashtags,
      media_url,
      scheduled_at,
      planner_day,
      status: media_url ? 'scheduled' : 'draft',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}

// PATCH: Update a scheduled post
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data, error } = await supabase()
    .from('scheduled_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}

// DELETE: Remove a scheduled post
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()

  const { error } = await supabase()
    .from('scheduled_posts')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
