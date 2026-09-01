import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

let _resend: Resend | null = null
function resend() { return (_resend ??= new Resend(process.env.RESEND_API_KEY)) }

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
    label: 'The Fast Food Flip + The Compound Comeback + The Protein Cheat Sheet',
    path: '/guides/fitness',
    desc: '5-day fast food meal plans + progressive overload compound movement program + top 20 cheapest protein sources',
    packagePath: '/services/bundles',
    assets: [
      { name: 'The Fast Food Flip', desc: '5-Day Meal Plans — fast food alternatives for 3 weight classes (Under 150 lbs, 150-200 lbs, 200+ lbs). Breakfast, lunch, snack & dinner.' },
      { name: 'The Compound Comeback', desc: '7-Day Progressive Overload Program — compound movements only: bench press, deadlift, squat, overhead press, pull-ups & more.' },
      { name: 'The Protein Cheat Sheet', desc: 'Top 20 Cheapest Protein Sources — ranked by cost per gram with budget tiers, swap guide & 5 rules to spend less and eat more protein.' },
    ],
  },
} as Record<string, { label: string; path: string; desc: string; packagePath: string; assets: { name: string; desc: string }[] }>

const EMAIL_GUIDE_CONTENT: Record<string, string> = {
  content: `
    <div style="background:#f9f9f9; border:1px solid #ddd; border-radius:12px; padding:24px; margin:20px 0;">
      <h3 style="color:#C9A84C; margin:0 0 12px;">Asset 1: Caption Traction</h3>
      <p style="font-size:13px; color:#555; margin-bottom:12px;">Copy this prompt into ChatGPT, Claude, or any AI. Replace the [BRACKETS] with your details.</p>
      <div style="background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:16px; font-family:monospace; font-size:12px; line-height:1.6; color:#333;">
        <p>You are a viral content strategist for short-form video (Reels, TikTok, Shorts). I'm making a video about <strong>[DESCRIBE VIDEO]</strong> in the <strong>[YOUR NICHE]</strong> niche for <strong>[TARGET CUSTOMER]</strong>. My tone is <strong>[YOUR TONE]</strong>. Generate:</p>
        <p><strong>1. TABLOID-STYLE HEADLINE & CAPTION</strong> — Bold headline playing on my target market's #1 fear. Open with fear, build tension, end with relief/solution.</p>
        <p><strong>2. THREE THUMBNAIL/ON-SCREEN TEXT OPTIONS:</strong><br>A) Curiosity Gap — makes them NEED to watch<br>B) Bold Claim — a specific, surprising statement<br>C) Pattern Interrupt — breaks expectations</p>
        <p><strong>3. THREE CAPTION VARIATIONS:</strong><br>A) Story-based — personal hook → lesson → CTA<br>B) Value-first — lead with the tip → expand → CTA<br>C) Controversial — hot take → defend it → CTA</p>
        <p><strong>4. 15 HASHTAGS:</strong> 3 broad (500K+), 5 mid-range (50K-500K), 7 niche (under 50K)</p>
      </div>
    </div>
    <div style="background:#f9f9f9; border:1px solid #ddd; border-radius:12px; padding:24px; margin:20px 0;">
      <h3 style="color:#C9A84C; margin:0 0 12px;">Asset 2: Reel Appeal — 7-Step System</h3>
      <div style="font-size:13px; color:#333; line-height:1.8;">
        <p><strong>1. Hook in 0.5 seconds</strong> — Use open loops: "Nobody talks about this..." / "Stop scrolling if you..."</p>
        <p><strong>2. Film in natural light</strong> — 4K 30fps, face the window, golden hour is best</p>
        <p><strong>3. 3-Pillar content strategy</strong> — Educate (30%), Entertain (40%), Connect (30%)</p>
        <p><strong>4. Caption = Second hook</strong> — First line must stop the scroll. Use story, value, or controversy</p>
        <p><strong>5. Post at peak hours</strong> — Weekdays: 7-9 AM, 12-1 PM, 7-9 PM. Weekends: 9-11 AM</p>
        <p><strong>6. Hashtag strategy</strong> — 5-15 tags: mix of broad, mid-range, and niche</p>
        <p><strong>7. Optimize your bio</strong> — Line 1: What you do. Line 2: Who it's for. Line 3: CTA + link</p>
      </div>
    </div>
  `,
  audio: `
    <div style="background:#f9f9f9; border:1px solid #ddd; border-radius:12px; padding:24px; margin:20px 0;">
      <h3 style="color:#C9A84C; margin:0 0 12px;">The Mix Fix — 7-Step Vocal Chain</h3>
      <p style="font-size:12px; color:#888; margin-bottom:16px;">Works in Logic, FL Studio, Ableton, Pro Tools, GarageBand, Studio One — stock plugins only.</p>
      <div style="font-size:13px; color:#333; line-height:1.8;">
        <p><strong>Step 1: Turn It Down (Gain Staging)</strong><br>Pull vocal fader to <strong>-12 dB</strong> peak. Gives plugins headroom to work.</p>
        <p><strong>Step 2: Cut the Junk (Subtractive EQ)</strong><br>High-pass filter at <strong>80 Hz</strong>. Narrow cut at 200-400 Hz (<strong>-2 to -3 dB</strong>).</p>
        <p><strong>Step 3: Tame the S Sounds (De-Esser)</strong><br>Target <strong>6-7 kHz</strong>. Set threshold so it only catches harsh sibilance.</p>
        <p><strong>Step 4: Even It Out (Compressor)</strong><br><strong>3:1 ratio</strong>, 10-15ms attack, 100ms release, 3-5 dB gain reduction.</p>
        <p><strong>Step 5: Add the Shine (Additive EQ)</strong><br>High shelf at <strong>10 kHz (+1 to +2 dB)</strong>. Optional: small boost at 4-5 kHz for presence.</p>
        <p><strong>Step 6: Add Space (Reverb)</strong><br>Send/bus only. Plate or Room preset. <strong>1.2-1.5s decay</strong>. Blend low.</p>
        <p><strong>Step 7: Add Movement (Delay)</strong><br>Send/bus only. <strong>1/4 note sync</strong>, 15-20% feedback. Should be barely audible.</p>
        <p style="margin-top:12px; padding:12px; background:#fff; border:1px solid #C9A84C; border-radius:8px; text-align:center; font-weight:bold; color:#C9A84C;">
          Chain: Gain Stage → Cut EQ → De-Esser → Compressor → Shine EQ → Reverb → Delay
        </p>
      </div>
    </div>
  `,
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
    const packageUrl = `${baseUrl}${guide.packagePath}`

    // Save lead to funnel_leads CRM table with sequence tracking
    const { error: leadError } = await supabase.from('funnel_leads').insert({
      name,
      email,
      service,
      status: 'new',
      source: 'funnel',
      notes: `Email 1 (delivery) sent: ${new Date().toISOString()}`,
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
    await resend().emails.send({
      from: `Asa Luke <${process.env.FROM_EMAIL!}>`,
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

    // Auto-reply to lead with guide content + links
    const firstName = name.split(' ')[0]
    const plainText = `Hey ${firstName},\n\nYour free ${guide.label} guide is ready.\n\n${guide.assets.map(a => `- ${a.name}: ${a.desc}`).join('\n')}\n\nView your guide: ${guideUrl}\n\nWant this done for you? View my packages: ${packageUrl}\n\nTalk soon,\nAsa Luke\n\nIG: @1AsaLuke | info.lifeupventures@gmail.com\n\nTo unsubscribe, reply with "unsubscribe".`

    await resend().emails.send({
      from: `Asa Luke <${process.env.FROM_EMAIL!}>`,
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

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eeeeee; margin-top:16px;">
      <tr><td style="padding-top:16px;">
        <p style="margin-bottom:4px;"><strong>Want this done for you?</strong></p>
        <p>These guides show you the strategy. I do all of this and more, professionally, every month.</p>
        <p><a href="${packageUrl}" style="color:#C9A84C; font-weight:bold; font-size:15px;">View My Packages</a></p>
      </td></tr>
    </table>

    <br>
    <p>Talk soon,<br><strong>Asa Luke</strong></p>
    <p style="color:#999999; font-size:12px;">
      IG: <a href="https://instagram.com/1AsaLuke" style="color:#C9A84C;">@1AsaLuke</a> | info.lifeupventures@gmail.com
    </p>
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
