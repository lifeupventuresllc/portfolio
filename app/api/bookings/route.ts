import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendBookingConfirmation } from '@/lib/email'

// Lazy — constructing at module scope throws immediately when the env
// vars are unset, which crashes the whole build during Next.js's
// page-data collection (every route module gets evaluated then).
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

const TIME_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get('days') || '14')

  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date()
  endDate.setDate(endDate.getDate() + days)

  // Get booked slots
  const { data: booked } = await supabase()
    .from('bookings')
    .select('date, time_slot')
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .neq('status', 'cancelled')

  // Generate available dates (next N days, exclude Sundays)
  const available: { date: string; slots: string[] }[] = []

  for (let i = 1; i <= days; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)

    // Skip Sundays (0 = Sunday)
    if (d.getDay() === 0) continue

    const dateStr = d.toISOString().split('T')[0]
    const bookedSlots = (booked || [])
      .filter(b => b.date === dateStr)
      .map(b => b.time_slot)

    const openSlots = TIME_SLOTS.filter(s => !bookedSlots.includes(s))

    if (openSlots.length > 0) {
      available.push({ date: dateStr, slots: openSlots })
    }
  }

  return NextResponse.json({ available })
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, service_interest, date, time_slot, notes } = await req.json()

    if (!name || !email || !date || !time_slot) {
      return NextResponse.json({ error: 'Name, email, date, and time slot are required' }, { status: 400 })
    }

    // Check if slot is still available
    const { data: existing } = await supabase()
      .from('bookings')
      .select('id')
      .eq('date', date)
      .eq('time_slot', time_slot)
      .neq('status', 'cancelled')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 })
    }

    // Save booking
    const { data, error } = await supabase()
      .from('bookings')
      .insert({ name, email, phone, service_interest: service_interest || 'content', date, time_slot, notes })
      .select()
      .single()

    if (error) throw error

    // Send confirmation emails (client + admin)
    const serviceLabels: Record<string, string> = {
      content: 'Content Editing',
      audio: 'Audio Engineering',
      fitness: 'Fitness Coaching',
      general: 'General Inquiry',
    }
    await sendBookingConfirmation(email, name, date, time_slot, serviceLabels[service_interest] || service_interest)

    return NextResponse.json({ booking: data })
  } catch (err) {
    console.error('Booking error:', err)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
