import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'

// Snap-a-meal-photo logging — mirrors app/api/plan/photo/route.ts's upload
// pattern (private per-user bucket, same 10MB cap), but writes to
// challenge_food_log instead of challenge_progress: a real row with a real
// photo_path (migration 037), zeroed macros and source:'photo' as a stub
// for the future Cal-AI-style backend to fill in with a real estimate.
// Never a fabricated calorie number — same "don't show a number we don't
// have yet" rule as the rest of this app.
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

    const day = localDateISO()
    const { data: row, error: insErr } = await svc.from('challenge_food_log').insert({
      enrollment_id: enrollment.id, user_id: user.id, logged_on: day, meal: 'snack',
      name: 'Meal photo — calories pending', servings: 1,
      calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0,
      source: 'photo', photo_path: path,
    }).select('id').maybeSingle()
    if (insErr) { console.error('meal photo log-row error:', insErr); return NextResponse.json({ error: 'Saved the photo, but logging it failed.' }, { status: 500 }) }

    return NextResponse.json({ success: true, id: row?.id, path })
  } catch (error) {
    console.error('Meal photo error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
