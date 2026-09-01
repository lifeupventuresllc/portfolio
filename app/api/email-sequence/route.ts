import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

let _resend: Resend | null = null
function resend() { return (_resend ??= new Resend(process.env.RESEND_API_KEY)) }

const CTA_URL = 'https://asaluke.io/services/fitness'

function wrapEmail(firstName: string, bodyHtml: string, ctaText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#0A0A0F;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0F;">
<tr><td align="center" style="padding:20px;">
<table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px; font-family:Arial,sans-serif; color:#e0e0e0;">
  <tr><td>
    <h2 style="color:#C9A84C; margin-bottom:4px;">Hey ${firstName},</h2>

    ${bodyHtml}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${CTA_URL}" style="display:inline-block; background:#C9A84C; color:#0A0A0F; padding:14px 36px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:15px;">
          ${ctaText}
        </a>
      </td></tr>
    </table>

    <p style="color:#e0e0e0; margin-top:24px;">Talk soon,<br><strong>Asa</strong></p>

    <p style="color:#999999; font-size:12px; margin-top:16px;">
      IG: <a href="https://instagram.com/1AsaLuke" style="color:#C9A84C;">@1AsaLuke</a> | info.lifeupventures@gmail.com
    </p>
    <p style="color:#666666; font-size:10px; margin-top:24px; border-top:1px solid #333333; padding-top:12px;">
      You received this because you downloaded a free guide from asaluke.io. To unsubscribe, reply with "unsubscribe" or email info.lifeupventures@gmail.com.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function getEmail2(firstName: string) {
  const subject = 'The grocery list that changed my physique'
  const body = `
    <p style="line-height:1.7;">Hope the Protein Cheat Sheet is helping you see how affordable high protein actually is.</p>
    <p style="line-height:1.7;">But knowing the cheapest protein sources is only step one. The real question is: <strong>what do you actually COOK with them?</strong></p>
    <p style="line-height:1.7;">That's why I built <strong style="color:#C9A84C;">The Protein Budget System</strong> &mdash; a complete weekly meal plan that hits 120g+ protein daily on under $75/week.</p>
    <p style="line-height:1.7;">15 recipes, all under 30 minutes, all under $4/serving. Plus a grocery list organized by store aisle so you're in and out in one trip.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e; border:1px solid #C9A84C; border-radius:12px; margin:20px 0;">
      <tr><td style="padding:20px;">
        <p style="color:#C9A84C; font-weight:bold; margin:0 0 8px; font-size:15px;">Featured Recipe: BBQ Beef Burritos</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:16px; color:#4ade80; font-size:13px;">270 cal</td>
            <td style="padding-right:16px; color:#4ade80; font-size:13px;">32g protein</td>
            <td style="padding-right:16px; color:#4ade80; font-size:13px;">$2.31/burrito</td>
          </tr>
        </table>
        <p style="color:#999999; font-size:12px; margin:8px 0 0;">Takes 20 minutes to make 11 of them.</p>
      </td></tr>
    </table>
  `
  const html = wrapEmail(firstName, body, 'See What\'s Inside &mdash; $27')
  return { subject, html }
}

function getEmail3(firstName: string) {
  const subject = 'How I feed 2 people for $75/week (the math)'
  const body = `
    <p style="line-height:1.7;">Quick breakdown of what $75/week actually looks like:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e; border:1px solid #333333; border-radius:12px; margin:20px 0;">
      <tr><td style="padding:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:6px 0; color:#e0e0e0; font-size:14px;"><span style="color:#4ade80; margin-right:8px;">&#10003;</span> 15 meals prepped in 2 hours on Sunday</td></tr>
          <tr><td style="padding:6px 0; color:#e0e0e0; font-size:14px;"><span style="color:#4ade80; margin-right:8px;">&#10003;</span> 120g+ protein every single day</td></tr>
          <tr><td style="padding:6px 0; color:#e0e0e0; font-size:14px;"><span style="color:#4ade80; margin-right:8px;">&#10003;</span> Average cost per meal: $2.85</td></tr>
          <tr><td style="padding:6px 0; color:#e0e0e0; font-size:14px;"><span style="color:#4ade80; margin-right:8px;">&#10003;</span> That's less than a single Chipotle bowl.</td></tr>
        </table>
      </td></tr>
    </table>

    <p style="line-height:1.7;">The Protein Budget System isn't a recipe book &mdash; it's a <strong>plug-and-play system</strong>. You pick the meals, it tells you exactly what to buy, how to cook it, and how much each person eats.</p>
    <p style="line-height:1.7;">Plus the <strong style="color:#C9A84C;">Prep Day Playbook</strong> walks you through a timed 2-hour cook session step by step. No guessing, no wasted food.</p>
    <p style="line-height:1.7;">Over 50 people have grabbed it this month. Here's what's inside:</p>
  `
  const html = wrapEmail(firstName, body, 'Get The System &mdash; $27')
  return { subject, html }
}

export async function POST(request: Request) {
  try {
    const { email, name, emailNumber } = await request.json()

    if (!email || !name || !emailNumber) {
      return NextResponse.json({ error: 'Missing required fields: email, name, emailNumber' }, { status: 400 })
    }

    if (![2, 3].includes(emailNumber)) {
      return NextResponse.json({ error: 'emailNumber must be 2 or 3 (email 1 is sent by the funnel route)' }, { status: 400 })
    }

    const firstName = name.split(' ')[0]
    const emailData = emailNumber === 2 ? getEmail2(firstName) : getEmail3(firstName)

    await resend().emails.send({
      from: `Asa Luke <${process.env.FROM_EMAIL!}>`,
      to: email,
      replyTo: 'info.lifeupventures@gmail.com',
      subject: emailData.subject,
      html: emailData.html,
      headers: {
        'List-Unsubscribe': '<mailto:info.lifeupventures@gmail.com?subject=Unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })

    // Update funnel_leads notes to track sequence progress
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // Fetch current notes to append (not overwrite)
    const { data: lead } = await supabase
      .from('funnel_leads')
      .select('notes')
      .eq('email', email)
      .eq('service', 'fitness')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const existingNotes = lead?.notes || ''
    const newNote = `${existingNotes ? existingNotes + '\n' : ''}Email ${emailNumber} sent: ${now}`

    await supabase
      .from('funnel_leads')
      .update({ notes: newNote, updated_at: now })
      .eq('email', email)
      .eq('service', 'fitness')
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({ success: true, emailNumber, sentTo: email })
  } catch (err) {
    console.error('Email sequence error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
