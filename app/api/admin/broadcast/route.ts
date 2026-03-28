import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

async function verifyAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { subject, body, audience } = await request.json()

  if (!subject || !body || !audience) {
    return NextResponse.json({ error: 'Missing subject, body, or audience' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.FROM_EMAIL || 'noreply@asaluke.io'

  let emails: string[] = []

  if (audience === 'leads') {
    const { data } = await supabase.from('funnel_leads').select('email')
    emails = (data || []).map(l => l.email).filter(Boolean)
  } else if (audience === 'all') {
    const { data } = await supabase.from('profiles').select('email')
    emails = (data || []).map(p => p.email).filter(Boolean)
  } else {
    return NextResponse.json({ error: 'Invalid audience. Use "leads" or "all"' }, { status: 400 })
  }

  // Deduplicate
  emails = Array.from(new Set(emails))

  let sent = 0
  for (const email of emails) {
    try {
      await resend.emails.send({
        from: `Asa Luke <${fromEmail}>`,
        to: email,
        replyTo: 'info.lifeupventures@gmail.com',
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, ''),
        headers: {
          'List-Unsubscribe': '<mailto:info.lifeupventures@gmail.com?subject=Unsubscribe>',
        },
      })
      sent++
    } catch {
      // Skip failed sends
    }
  }

  return NextResponse.json({ sent, total: emails.length })
}
