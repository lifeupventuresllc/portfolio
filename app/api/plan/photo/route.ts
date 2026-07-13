import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Upload a progress photo to a private, per-user folder; log it for her timeline.
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

    const { error: upErr } = await svc.storage.from('progress-photos').upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: false })
    if (upErr) { console.error('photo upload error:', upErr); return NextResponse.json({ error: 'Upload failed.' }, { status: 500 }) }

    await svc.from('challenge_progress').insert({ enrollment_id: enrollment.id, user_id: user.id, photo_urls: [path], note: 'photo' })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Progress photo error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
