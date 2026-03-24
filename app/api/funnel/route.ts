import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { name, email, service } = await request.json()

    if (!name || !email || !service) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Save lead to events table
    await supabase.from('events').insert({
      event_type: 'funnel_lead',
      metadata: { name, email, service },
    })

    const serviceLabel =
      service === 'content' ? 'Content Editing (Free Video Edit)' :
      service === 'audio' ? 'Audio Engineering (Free Mix & Master)' :
      'Fitness (Free Consult)'

    // Notify Asa
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: 'info.lifeupventures@gmail.com',
      subject: `New Lead: ${name} wants ${serviceLabel}`,
      html: `
        <h2>New Funnel Lead</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Service:</strong> ${serviceLabel}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <br>
        <p>Reach out within 24 hours to collect their files.</p>
      `,
    })

    // Auto-reply to lead
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: `Got it, ${name}! Your free sample is on the way`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
          <h2 style="color: #C9A84C;">Hey ${name}!</h2>
          <p>Thanks for reaching out. I got your request for a <strong>${serviceLabel}</strong>.</p>
          <p>Here's what happens next:</p>
          <ol>
            <li><strong>I'll reach out within 24 hours</strong> to collect your files</li>
            <li><strong>I'll complete your free sample</strong> within 48 hours</li>
            <li><strong>You decide</strong> if you want to continue — no pressure</li>
          </ol>
          <p>In the meantime, check out my packages at <a href="https://asaluke.io" style="color: #C9A84C;">asaluke.io</a></p>
          <br>
          <p>Talk soon,<br><strong>Asa Luke</strong></p>
          <p style="color: #999; font-size: 12px;">
            IG: @1AsaLuke | info.lifeupventures@gmail.com
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
