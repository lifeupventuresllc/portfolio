import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Snap-a-meal-photo logging — mirrors app/api/plan/photo/route.ts's upload
// pattern (private per-user bucket, same 10MB cap).
//
// Real bug found live, 2026-09-03 (beta tester report, cross-checked): this
// used to also insert a challenge_food_log row with zeroed macros and
// name:'Meal photo — calories pending', as a stub for a future Cal-AI-style
// backend to fill in with a real estimate. That backend was never built —
// no cron, no webhook, nothing anywhere touches a photo-sourced row after
// insert — so every meal logged this way was PERMANENTLY stuck at 0
// calories forever, with no edit UI (see the food-log route's lack of a
// PATCH handler) to ever fix it. Worse than the "don't show a fabricated
// number" rule it was trying to follow: a real, wrong number the user can
// never correct. Now just stores the photo (still useful, still free) and
// hands the real logging job to the actual working flow — see
// lib/useMealPhotoUpload.ts, which routes to /plan/nutrition right after.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const svc = createServiceClient()

    let { data: enrollment } = await svc
      .from('challenge_enrollments').select('id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
    if (!enrollment && user.email) {
      const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
      enrollment = byEmail || null
    }
    if (!enrollment) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

    const form = await request.formData()
    const file = form.get('photo') as File | null
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'No photo received.' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Photo is too large (max 10MB).' }, { status: 400 })

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await svc.storage.from('meal-photos').upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: false })
    if (upErr) { console.error('meal photo upload error:', upErr); return NextResponse.json({ error: 'Upload failed.' }, { status: 500 }) }

    return NextResponse.json({ success: true, path })
  } catch (error) {
    console.error('Meal photo error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
