import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@asaluke.io'
const REPLY_TO = 'info.lifeupventures@gmail.com'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://asaluke.io'

const UNSUB_HEADERS = {
  'List-Unsubscribe': '<mailto:info.lifeupventures@gmail.com?subject=Unsubscribe>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
}

const FOOTER = `<p style="color:#cccccc; font-size:10px; margin-top:24px; border-top:1px solid #eeeeee; padding-top:12px;">You received this because you downloaded a free guide from asaluke.io. To unsubscribe, reply with "unsubscribe" or email info.lifeupventures@gmail.com.</p>`

type FollowUpStep = {
  delayDays: number
  subject: (firstName: string) => string
  text: (firstName: string, service: string) => string
  html: (firstName: string, service: string) => string
}

const SERVICE_LABELS: Record<string, { name: string; packageUrl: string }> = {
  content: { name: 'content editing', packageUrl: `${BASE_URL}/services/content-editing` },
  audio: { name: 'audio engineering', packageUrl: `${BASE_URL}/services/audio-engineering` },
  fitness: { name: 'fitness coaching', packageUrl: `${BASE_URL}/services/bundles` },
}

export const FUNNEL_NURTURE_SEQUENCE: FollowUpStep[] = [
  {
    // Day 1: Check-in
    delayDays: 1,
    subject: (firstName) => `${firstName}, did you check out your guide?`,
    text: (firstName, service) => {
      const svc = SERVICE_LABELS[service] || SERVICE_LABELS.content
      return `Hey ${firstName},\n\nJust checking in — did you get a chance to look at the guide I sent?\n\nIf you have any questions about ${svc.name}, I'm here. Just hit reply.\n\nTalk soon,\nAsa Luke`
    },
    html: (firstName, service) => {
      const svc = SERVICE_LABELS[service] || SERVICE_LABELS.content
      return `<div style="font-family:Arial,sans-serif; max-width:540px; margin:0 auto; color:#333333;">
        <p>Hey ${firstName},</p>
        <p>Just checking in — did you get a chance to look at the guide I sent?</p>
        <p>If you have any questions about ${svc.name}, I'm here. Just hit reply.</p>
        <p>Talk soon,<br><strong>Asa Luke</strong></p>
        <p style="color:#999999; font-size:12px;">IG: <a href="https://instagram.com/1AsaLuke" style="color:#C9A84C;">@1AsaLuke</a></p>
        ${FOOTER}
      </div>`
    },
  },
  {
    // Day 3: Value add
    delayDays: 3,
    subject: (firstName) => `Quick tip for you, ${firstName}`,
    text: (firstName, service) => {
      const svc = SERVICE_LABELS[service] || SERVICE_LABELS.content
      return `Hey ${firstName},\n\nHope the guide has been helpful. Here's a bonus tip:\n\nThe strategies in that guide are exactly what I do for my clients — except I handle everything professionally, every month.\n\nIf you're interested in having ${svc.name} done for you, check out my packages: ${svc.packageUrl}\n\nNo pressure — just wanted to make sure you knew the option was there.\n\n— Asa Luke`
    },
    html: (firstName, service) => {
      const svc = SERVICE_LABELS[service] || SERVICE_LABELS.content
      return `<div style="font-family:Arial,sans-serif; max-width:540px; margin:0 auto; color:#333333;">
        <p>Hey ${firstName},</p>
        <p>Hope the guide has been helpful. Here's a bonus tip:</p>
        <p>The strategies in that guide are exactly what I do for my clients — except I handle everything professionally, every month.</p>
        <p>If you're interested in having ${svc.name} done for you:</p>
        <p style="text-align:center; margin:24px 0;">
          <a href="${svc.packageUrl}" style="display:inline-block; background:#C9A84C; color:#0A0A0F; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:bold;">View My Packages</a>
        </p>
        <p>No pressure — just wanted to make sure you knew the option was there.</p>
        <p>— <strong>Asa Luke</strong></p>
        ${FOOTER}
      </div>`
    },
  },
  {
    // Day 7: Soft pitch
    delayDays: 7,
    subject: (firstName) => `${firstName}, one more thing`,
    text: (firstName, service) => {
      const svc = SERVICE_LABELS[service] || SERVICE_LABELS.content
      return `Hey ${firstName},\n\nI've got a few spots open this month for ${svc.name} clients.\n\nIf you've been thinking about getting professional help with your ${service === 'audio' ? 'music' : service === 'fitness' ? 'fitness goals' : 'content'}, now's a good time.\n\nCheck out the packages: ${svc.packageUrl}\n\nOr just reply to this email and we can chat about what would work best for you.\n\n— Asa Luke`
    },
    html: (firstName, service) => {
      const svc = SERVICE_LABELS[service] || SERVICE_LABELS.content
      return `<div style="font-family:Arial,sans-serif; max-width:540px; margin:0 auto; color:#333333;">
        <p>Hey ${firstName},</p>
        <p>I've got a few spots open this month for ${svc.name} clients.</p>
        <p>If you've been thinking about getting professional help with your ${service === 'audio' ? 'music' : service === 'fitness' ? 'fitness goals' : 'content'}, now's a good time.</p>
        <p style="text-align:center; margin:24px 0;">
          <a href="${svc.packageUrl}" style="display:inline-block; background:#C9A84C; color:#0A0A0F; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:bold;">View Packages</a>
        </p>
        <p>Or just reply to this email and we can chat about what would work best for you.</p>
        <p>— <strong>Asa Luke</strong></p>
        ${FOOTER}
      </div>`
    },
  },
]

export async function sendFollowUpEmail(
  email: string,
  firstName: string,
  service: string,
  step: number
): Promise<boolean> {
  const sequence = FUNNEL_NURTURE_SEQUENCE[step]
  if (!sequence) return false

  try {
    const { error } = await resend.emails.send({
      from: `Asa Luke <${FROM_EMAIL}>`,
      to: email,
      replyTo: REPLY_TO,
      subject: sequence.subject(firstName),
      text: sequence.text(firstName, service),
      headers: UNSUB_HEADERS,
      html: sequence.html(firstName, service),
    })

    if (error) {
      console.error(`Follow-up email failed (step ${step}):`, error)
      return false
    }
    return true
  } catch (err) {
    console.error(`Follow-up email error (step ${step}):`, err)
    return false
  }
}
