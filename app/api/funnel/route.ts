import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

let _resend: Resend | null = null
function resend() { return (_resend ??= new Resend(process.env.RESEND_API_KEY)) }

// Fitness-only, 2026-09-02 (Asa's explicit call): content/audio branches
// removed along with the pages/services they pointed at, and every
// personal-brand element (Asa Luke bio, Instagram handle, "view my
// packages" upsell — that pointed at the now-deleted /services/bundles
// anyway) stripped from what stays. This is Life-Up Fitness, a platform,
// not a personal service funnel.
const GUIDE_INFO = {
  fitness: {
    label: 'The Fast Food Flip + The Compound Comeback + The Protein Cheat Sheet',
    path: '/guides/fitness',
    desc: '5-day fast food meal plans + progressive overload compound movement program + top 20 cheapest protein sources',
    assets: [
      { name: 'The Fast Food Flip', desc: '5-Day Meal Plans — fast food alternatives for 3 weight classes (Under 150 lbs, 150-200 lbs, 200+ lbs). Breakfast, lunch, snack & dinner.' },
      { name: 'The Compound Comeback', desc: '7-Day Progressive Overload Program — compound movements only: bench press, deadlift, squat, overhead press, pull-ups & more.' },
      { name: 'The Protein Cheat Sheet', desc: 'Top 20 Cheapest Protein Sources — ranked by cost per gram with budget tiers, swap guide & 5 rules to spend less and eat more protein.' },
    ],
  },
} as Record<string, { label: string; path: string; desc: string; assets: { name: string; desc: string }[] }>

const EMAIL_GUIDE_CONTENT: Record<string, string> = {
  fitness: `
    <div style="background:#f9f9f9; border:1px solid #ddd; border-radius:12px; padding:24px; margin:20px 0;">
      <h3 style="color:#C9A84C; margin:0 0 12px;">Asset 1: The Fast Food Flip</h3>
      <p style="font-size:13px; color:#555;">5 days of fast food alternatives for 3 weight classes. View the full meal plans with images on the guide page — click the button below to access your weight class.</p>
      <p style="font-size:12px; color:#888;">Classes: Under 150 lbs | 150-200 lbs | 200+ lbs<br>Includes: Breakfast, Lunch, Snack & Dinner for each day</p>
    </div>
    <div style="background:#f9f9f9; border:1px solid #ddd; border-radius:12px; padding:24px; margin:20px 0;">
      <h3 style="color:#C9A84C; margin:0 0 12px;">Asset 2: The Compound Comeback — 7-Day Program</h3>
      <p style="font-size:12px; color:#888; margin-bottom:12px;">Rule: Add +5 lbs, +1 rep, or +1 set each week (progressive overload)</p>
      <div style="font-size:13px; color:#333; line-height:1.8;">
        <p><strong>Day 1: Push</strong> — Barbell Bench Press (4x8), Overhead Press (3x10), Dips (3x max)</p>
        <p><strong>Day 2: Pull</strong> — Deadlift (4x6), Pull-ups/Lat Pulldown (4x8), Barbell Row (3x10)</p>
        <p><strong>Day 3: Legs</strong> — Barbell Squat (4x8), Romanian Deadlift (3x10), Walking Lunges (3x12 each)</p>
        <p><strong>Day 4: Rest</strong> — Active recovery. Walk, stretch, foam roll. 20-30 min.</p>
        <p><strong>Day 5: Upper Body</strong> — Incline DB Press (4x10), Weighted Pull-ups/Rows (4x8), DB Overhead Press (3x10)</p>
        <p><strong>Day 6: Legs + Core</strong> — Front Squat (4x8), Hip Thrust (3x12), Hanging Leg Raises (3x15)</p>
        <p><strong>Day 7: Full Rest</strong> — No gym. Eat well, sleep 7-9 hours, hydrate.</p>
      </div>
    </div>
    <div style="background:#f9f9f9; border:1px solid #ddd; border-radius:12px; padding:24px; margin:20px 0;">
      <h3 style="color:#C9A84C; margin:0 0 12px;">Asset 3: The Protein Cheat Sheet — Top 20 Cheapest Protein Sources</h3>
      <p style="font-size:12px; color:#888; margin-bottom:12px;">Ranked by cost per gram of protein</p>
      <div style="font-size:13px; color:#333; line-height:1.8;">
        <p><strong>Tier 1 — Under $0.04/g:</strong> Lentils, Black Beans, Eggs, Chicken Thighs, Peanut Butter, Whey Protein (bulk tub)</p>
        <p><strong>Tier 2 — $0.04-$0.08/g:</strong> Greek Yogurt, Ground Turkey, Ground Beef, Tofu</p>
        <p style="margin-top:12px; font-weight:bold; color:#C9A84C;">5 Rules to Spend Less & Eat More Protein:</p>
        <p><strong>1.</strong> Build meals around beans + eggs + chicken thighs</p>
        <p><strong>2.</strong> Buy whey in bulk tubs (5 lb+) — never single-serve packets</p>
        <p><strong>3.</strong> Use whole milk for easy protein (8g per glass)</p>
        <p><strong>4.</strong> Large tubs of yogurt, never single-serve cups</p>
        <p><strong>5.</strong> Shop sales, buy bulk, freeze portions</p>
      </div>
    </div>
  `,
}

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

    // Save lead to funnel_leads CRM table
    const { error: leadError } = await supabase.from('funnel_leads').insert({
      name,
      email,
      service,
      status: 'new',
      source: 'funnel',
      notes: `Guide delivery sent: ${new Date().toISOString()}`,
    })
    if (leadError) {
      console.error('Failed to save lead:', leadError)
    }

    // Also log to events for analytics
    await supabase.from('events').insert({
      event_type: 'funnel_lead',
      metadata: { name, email, service, guide: guide.label },
    })

    // Notify the team
    await resend().emails.send({
      from: `Life-Up Fitness <${process.env.FROM_EMAIL!}>`,
      to: 'info.lifeupventures@gmail.com',
      subject: `New Lead: ${name} downloaded ${guide.label}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; color: #333;">
          <h2 style="color: #C9A84C;">New Guide Download</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold;">Name</td><td>${name}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Guide</td><td>${guide.label}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Date</td><td>${new Date().toLocaleString()}</td></tr>
          </table>
          <br>
          <p>View their guide: <a href="${guideUrl}">${guideUrl}</a></p>
        </div>
      `,
    })

    // Auto-reply to lead with guide content + link
    const firstName = name.split(' ')[0]
    const plainText = `Hey ${firstName},\n\nYour free ${guide.label} guide is ready.\n\n${guide.assets.map(a => `- ${a.name}: ${a.desc}`).join('\n')}\n\nView your guide: ${guideUrl}\n\n— Life-Up Fitness\n\nTo unsubscribe, reply with "unsubscribe".`

    await resend().emails.send({
      from: `Life-Up Fitness <${process.env.FROM_EMAIL!}>`,
      to: email,
      replyTo: 'info.lifeupventures@gmail.com',
      subject: `${firstName}, your free ${guide.label} is ready`,
      text: plainText,
      headers: {
        'List-Unsubscribe': '<mailto:info.lifeupventures@gmail.com?subject=Unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
<tr><td align="center" style="padding:20px;">
<table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px; font-family:Arial,sans-serif; color:#333333;">
  <tr><td>
    <h2 style="color:#C9A84C; margin-bottom:4px;">Hey ${firstName},</h2>
    <p style="margin-top:0;">Your free guide${guide.assets.length > 1 ? 's are' : ' is'} ready. Here's everything you got:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0F; border:2px solid #C9A84C; border-radius:12px; margin:20px 0;">
      <tr><td style="padding:20px;">
        <p style="color:#4ade80; font-size:11px; font-weight:bold; text-transform:uppercase; letter-spacing:2px; margin:0 0 4px;">Included Free</p>
        <p style="color:#ffffff; font-size:18px; font-weight:bold; margin:0 0 16px;">${guide.label}</p>
        ${guide.assets.map((asset) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e; border:1px solid #333333; border-radius:8px; margin-bottom:8px;">
            <tr>
              <td style="color:#C9A84C; font-size:12px; width:20px; vertical-align:top; padding:12px 8px 12px 16px;">&#10003;</td>
              <td style="padding:12px 16px 12px 0;">
                <p style="color:#ffffff; font-weight:bold; margin:0 0 2px; font-size:14px;">${asset.name}</p>
                <p style="color:#999999; margin:0; font-size:12px; line-height:1.4;">${asset.desc}</p>
              </td>
            </tr>
          </table>
        `).join('')}
      </td></tr>
    </table>

    ${EMAIL_GUIDE_CONTENT[service] || ''}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td align="center">
        <a href="${guideUrl}" style="display:inline-block; background:#C9A84C; color:#0A0A0F; padding:14px 36px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:15px;">
          View Full Guide on Web
        </a>
        <p style="color:#999999; font-size:11px; margin-top:8px;">View the full interactive version with images. Use "Save / Download" to save as PDF.</p>
      </td></tr>
    </table>

    <br>
    <p>— Life-Up Fitness</p>
    <p style="color:#cccccc; font-size:10px; margin-top:24px; border-top:1px solid #eeeeee; padding-top:12px;">
      You received this because you requested a free guide from asaluke.io. To unsubscribe, reply with "unsubscribe" or email info.lifeupventures@gmail.com.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Funnel error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
