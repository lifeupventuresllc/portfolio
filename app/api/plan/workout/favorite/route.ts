import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { readFavorites } from '@/lib/favorites'

// Heart a move (2026-11-17, workout-system step 3). { name, on } → saved on
// her intake (form_data.favorite_moves). See lib/favorites.ts.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).limit(1).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as { name?: unknown; on?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : ''
  if (!name) return NextResponse.json({ error: 'Which move?' }, { status: 400 })
  const on = body?.on !== false

  const { data: intake } = await svc.from('challenge_intake').select('form_data').eq('enrollment_id', enrollment.id).maybeSingle()
  if (!intake) return NextResponse.json({ error: 'No plan yet.' }, { status: 404 })
  const form = (intake.form_data as Record<string, unknown> | null) || {}
  const favs = readFavorites(form).filter((n) => n !== name)
  if (on) favs.unshift(name)
  const { error } = await svc.from('challenge_intake').update({ form_data: { ...form, favorite_moves: favs.slice(0, 60) } }).eq('enrollment_id', enrollment.id)
  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
  return NextResponse.json({ ok: true, favorites: favs })
}
