import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWorkout } from '@/lib/workout'
import { generateWorkoutPDF } from '@/lib/workout-pdf'
import type { Injury, Muscle, Level } from '@/lib/workout-exercises'

// Coach-only: generate a client's workout program PDF on demand.
async function isAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' || profile?.role === 'support'
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden — coach login required.' }, { status: 403 })
  }
  try {
    const b = await request.json()
    const prog = generateWorkout({
      name: b.name || 'Client',
      track: b.track === 'home' ? 'home' : 'gym',
      level: (Number(b.level) || 1) as Level,
      goal: b.goal === 'gain' || b.goal === 'maintain' ? b.goal : 'lose',
      daysPerWeek: Number(b.daysPerWeek) || 3,
      weekNumber: Number(b.weekNumber) || 1,
      injuries: (Array.isArray(b.injuries) ? b.injuries : []) as Injury[],
      targets: (Array.isArray(b.targets) ? b.targets : []) as Muscle[],
    })
    const bytes = await generateWorkoutPDF(prog)
    const pdfBase64 = Buffer.from(bytes).toString('base64')
    const safe = (b.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')
    return NextResponse.json({
      success: true,
      pdfBase64,
      filename: `${safe}_Week${prog.weekNumber}_${prog.track === 'home' ? 'Home' : 'Gym'}.pdf`,
    })
  } catch (error) {
    console.error('Workout generation error:', error)
    return NextResponse.json({ error: 'Failed to generate workout' }, { status: 500 })
  }
}
