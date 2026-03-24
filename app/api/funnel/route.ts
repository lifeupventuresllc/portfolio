import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const GUIDE_INFO = {
  content: {
    label: 'Content Creator Blueprint',
    path: '/guides/content',
    desc: 'The 7-step system to create scroll-stopping Reels',
    packagePath: '/services/content-editing#pricing',
  },
  audio: {
    label: 'Release-Ready Mix Checklist',
    path: '/guides/audio',
    desc: 'The complete checklist to get your music release-ready',
    packagePath: '/services/audio-engineering#pricing',
  },
  fitness: {
    label: '7-Day Fitness Kickstart',
    path: '/guides/fitness',
    desc: 'A full week of workouts + nutrition to build momentum',
    packagePath: '/#fitness',
  },
} as Record<string, { label: string; path: string; desc: string; packagePath: string }>

export async function POST(request: Request) {
  try {
    const { name, email, service } = await request.json()

    if (!name || !email || !service) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const guide = GUIDE_INFO[service]
    if (!guide) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://asaluke.io'
    const guideUrl = `${baseUrl}${guide.path}`
    const packageUrl = `${baseUrl}${guide.packagePath}`

    // Save lead to funnel_leads CRM table
    await supabase.from('funnel_leads').insert({
      name,
      email,
      service,
      status: 'new',
      source: 'funnel',
    })

    // Also log to events for analytics
    await supabase.from('events').insert({
      event_type: 'funnel_lead',
      metadata: { name, email, service, guide: guide.label },
    })

    // Notify Asa
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: 'info.lifeupventures@gmail.com',
      subject: `New Lead: ${name} downloaded ${guide.label}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; color: #333;">
          <h2 style="color: #C9A84C;">New Funnel Lead</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold;">Name</td><td>${name}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Guide</td><td>${guide.label}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Service</td><td>${service}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Date</td><td>${new Date().toLocaleString()}</td></tr>
          </table>
          <br>
          <p><strong>Next step:</strong> Follow up within 24-48 hours. They've already seen your work — pitch the package.</p>
          <p>View their guide: <a href="${guideUrl}">${guideUrl}</a></p>
        </div>
      `,
    })

    // Auto-reply to lead with guide link
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: `Your free ${guide.label} is ready, ${name}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
          <h2 style="color: #C9A84C;">Hey ${name}!</h2>
          <p>Your free <strong>${guide.label}</strong> is ready. Here's your link:</p>

          <div style="background: #1A1A22; border: 2px solid #C9A84C; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <p style="color: #C9A84C; font-size: 14px; margin-bottom: 8px;">${guide.desc}</p>
            <a href="${guideUrl}" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
              Read Your Free Guide →
            </a>
          </div>

          <p>This guide covers real strategies I use with my clients. If you want me to do all of this <em>for you</em>, check out my packages:</p>
          <p><a href="${packageUrl}" style="color: #C9A84C; font-weight: bold;">View My Packages →</a></p>

          <br>
          <p>Talk soon,<br><strong>Asa Luke</strong></p>
          <p style="color: #999; font-size: 12px;">
            IG: <a href="https://instagram.com/1AsaLuke" style="color: #C9A84C;">@1AsaLuke</a> | info.lifeupventures@gmail.com
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Funnel error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
