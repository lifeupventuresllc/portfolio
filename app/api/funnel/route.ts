import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const GUIDE_INFO = {
  content: {
    label: 'Caption Traction + Reel Appeal',
    path: '/guides/content',
    desc: 'AI prompt that writes your captions, headlines & on-screen text — plus a 7-step Reels system',
    packagePath: '/services/content-editing',
    assets: [
      { name: 'Caption Traction', desc: 'AI Prompt Template — paste into ChatGPT/Claude to generate captions, headlines, hashtags & on-screen text for any video' },
      { name: 'Reel Appeal', desc: '7-Step Reels System — hook formulas, filming tips, 3-pillar content strategy, posting times, hashtag strategy & bio optimization' },
    ],
  },
  audio: {
    label: 'The Mix Fix',
    path: '/guides/audio',
    desc: 'Step-by-step vocal chain for any DAW — stock plugins only, pro results',
    packagePath: '/services/audio-engineering',
    assets: [
      { name: 'The Mix Fix', desc: '7-Step Vocal Chain — gain staging, EQ, de-esser, compression, shine EQ, reverb & delay. Works in any DAW with stock plugins.' },
    ],
  },
  fitness: {
    label: 'The Fast Food Flip + The Compound Comeback',
    path: '/guides/fitness',
    desc: '5-day fast food meal plans + progressive overload compound movement program',
    packagePath: '/services/bundles',
    assets: [
      { name: 'The Fast Food Flip', desc: '5-Day Meal Plans — fast food alternatives for 3 weight classes (Under 150 lbs, 150-200 lbs, 200+ lbs). Breakfast, lunch, snack & dinner.' },
      { name: 'The Compound Comeback', desc: '7-Day Progressive Overload Program — compound movements only: bench press, deadlift, squat, overhead press, pull-ups & more.' },
    ],
  },
} as Record<string, { label: string; path: string; desc: string; packagePath: string; assets: { name: string; desc: string }[] }>

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
    const { error: leadError } = await supabase.from('funnel_leads').insert({
      name,
      email,
      service,
      status: 'new',
      source: 'funnel',
    })
    if (leadError) {
      console.error('Failed to save lead:', leadError)
    }

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

    // Build asset list HTML
    const assetListHtml = guide.assets.map((asset, i) => `
      <div style="background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; align-items: flex-start;">
          <div style="background: #C9A84C; color: #0A0A0F; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px; margin-right: 12px; flex-shrink: 0;">${i + 1}</div>
          <div>
            <p style="margin: 0 0 4px; font-weight: bold; font-size: 16px; color: #1a1a1a;">${asset.name}</p>
            <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.5;">${asset.desc}</p>
          </div>
        </div>
      </div>
    `).join('')

    // Auto-reply to lead with guide content + links
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: `Your free ${guide.label} is ready, ${name}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; color: #333;">
          <h2 style="color: #C9A84C; margin-bottom: 4px;">Hey ${name}!</h2>
          <p style="margin-top: 0;">Your free guide${guide.assets.length > 1 ? 's are' : ' is'} ready. Here's everything you got:</p>

          <div style="background: #0A0A0F; border: 2px solid #C9A84C; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #4ade80; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px;">100% FREE</p>
            <p style="color: #fff; font-size: 18px; font-weight: bold; margin: 0 0 16px;">${guide.label}</p>
            ${guide.assets.map((asset, i) => `
              <div style="background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px;">
                <table style="width: 100%;"><tr>
                  <td style="color: #C9A84C; font-size: 12px; width: 20px; vertical-align: top; padding-right: 8px;">&#10003;</td>
                  <td>
                    <p style="color: #fff; font-weight: bold; margin: 0 0 2px; font-size: 14px;">${asset.name}</p>
                    <p style="color: #999; margin: 0; font-size: 12px; line-height: 1.4;">${asset.desc}</p>
                  </td>
                </tr></table>
              </div>
            `).join('')}
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${guideUrl}" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
              View & Download Your Free Guide${guide.assets.length > 1 ? 's' : ''} →
            </a>
            <p style="color: #999; font-size: 11px; margin-top: 8px;">Click above to view on the web. Use the "Save / Download" button on the page to save as PDF.</p>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 16px; margin-top: 16px;">
            <p style="margin-bottom: 4px;"><strong>Want this done for you?</strong></p>
            <p>These guides show you the strategy. I do all of this and more — professionally, every month.</p>
            <p><a href="${packageUrl}" style="color: #C9A84C; font-weight: bold; font-size: 15px;">View My Packages →</a></p>
          </div>

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
