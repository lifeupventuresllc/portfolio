import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// The write side of the real-location eating-out signal (2026-09-23, Asa's
// direct ask). Called ONLY after a real, explicit tap grants browser
// location permission (components/LocationOptIn.tsx) — never polled, never
// requested silently. Overwrites her last known position; this is "where
// is she right now," never a location history/log.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: { lat?: number; lng?: number }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }
  const lat = Number(body.lat)
  const lng = Number(body.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'Invalid coordinates.' }, { status: 400 })
  }

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

  await svc.from('challenge_enrollments').update({ last_lat: lat, last_lng: lng, last_location_at: new Date().toISOString() }).eq('id', enrollment.id as string)

  return NextResponse.json({ ok: true })
}
