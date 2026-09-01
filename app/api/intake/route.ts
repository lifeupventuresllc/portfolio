import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

let _resend: Resend | null = null
function resend() { return (_resend ??= new Resend(process.env.RESEND_API_KEY)) }

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()

  const { service_type, form_data, email, name } = body

  if (!service_type || !form_data) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Try to link to existing funnel lead
  let leadId = null
  if (email) {
    const { data: lead } = await supabase
      .from('funnel_leads')
      .select('id')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    leadId = lead?.id || null
  }

  const { data, error } = await supabase
    .from('intake_submissions')
    .insert({
      service_type,
      form_data,
      lead_id: leadId,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify Asa
  await resend().emails.send({
    from: `Asa Luke <${process.env.FROM_EMAIL!}>`,
    to: 'info.lifeupventures@gmail.com',
    subject: `New Intake: ${name || 'Unknown'} — ${service_type}`,
    html: `
      <div style="font-family:Arial,sans-serif; max-width:500px; color:#333333;">
        <h2 style="color:#C9A84C;">New Intake Submission</h2>
        <p><strong>Service:</strong> ${service_type}</p>
        <p><strong>Name:</strong> ${name || 'Not provided'}</p>
        <p><strong>Email:</strong> ${email || 'Not provided'}</p>
        <p><strong>Form Data:</strong></p>
        <pre style="background:#f5f5f5; padding:12px; border-radius:8px; font-size:12px; overflow:auto;">${JSON.stringify(form_data, null, 2)}</pre>
      </div>
    `,
  }).catch(console.error)

  return NextResponse.json({ success: true, id: data.id })
}
