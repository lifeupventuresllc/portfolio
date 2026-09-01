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
  fitness: { name: 'the Snatched Without Starving challenge', packageUrl: `${BASE_URL}/challenge` },
}

const btn = (url: string, label: string) =>
  `<p style="text-align:center; margin:24px 0;"><a href="${url}" style="display:inline-block; background:#C9A84C; color:#0A0A0F; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:bold;">${label}</a></p>`
const sig = `<p>— <strong>Asa Luke</strong></p><p style="color:#999999; font-size:12px;">IG: <a href="https://instagram.com/1AsaLuke" style="color:#C9A84C;">@1AsaLuke</a></p>`
const wrap = (inner: string) => `<div style="font-family:Arial,sans-serif; max-width:540px; margin:0 auto; color:#333333;">${inner}${sig}${FOOTER}</div>`
const isFit = (service: string) => service === 'fitness'
const CHALLENGE_URL = `${BASE_URL}/challenge`

export const FUNNEL_NURTURE_SEQUENCE: FollowUpStep[] = [
  {
    // Day 1: Check-in
    delayDays: 1,
    subject: (firstName) => `${firstName}, did you check out your guide?`,
    text: (firstName, service) => isFit(service)
      ? `Hey ${firstName},\n\nDid your calorie blueprint make sense? That's your exact numbers to hit your goal.\n\nHere's the thing though — knowing your numbers is step one. Actually hitting them, week after week, with food you love and workouts that fit your body... that's where most people get stuck.\n\nHit reply and tell me your #1 goal. I read every one.\n\n— Asa Luke`
      : `Hey ${firstName},\n\nJust checking in — did you get a chance to look at the guide I sent?\n\nIf you have any questions about ${(SERVICE_LABELS[service] || SERVICE_LABELS.content).name}, I'm here. Just hit reply.\n\nTalk soon,\nAsa Luke`,
    html: (firstName, service) => isFit(service)
      ? wrap(`<p>Hey ${firstName},</p><p>Did your calorie blueprint make sense? That's your exact numbers to hit your goal.</p><p>Here's the thing though — knowing your numbers is step one. Actually hitting them week after week, with food you love and workouts that fit your body, is where most people get stuck.</p><p>Hit reply and tell me your #1 goal. I read every one.</p>`)
      : wrap(`<p>Hey ${firstName},</p><p>Just checking in — did you get a chance to look at the guide I sent?</p><p>If you have any questions about ${(SERVICE_LABELS[service] || SERVICE_LABELS.content).name}, I'm here. Just hit reply.</p>`),
  },
  {
    // Day 3: Value → offer
    delayDays: 3,
    subject: (firstName) => `${firstName}, your numbers won't do the work for you`,
    text: (firstName, service) => isFit(service)
      ? `Hey ${firstName},\n\nYour blueprint gives you the numbers. But numbers on a page don't get you snatched — a plan you'll actually follow does.\n\nThat's exactly what the Life-Up Fitness app does for you, completely free:\n• A custom workout for YOUR body and schedule\n• A done-for-you weekly meal plan built around food you love (on your budget)\n• Coach, built right in, checking in on you\n\nNo trial, no card, no catch — just create your account.\n\nStart here: ${CHALLENGE_URL}\n\n— Asa Luke`
      : `Hey ${firstName},\n\nHope the guide has been helpful. The strategies in it are exactly what I do for my clients — except I handle everything professionally, every month.\n\nIf you want ${(SERVICE_LABELS[service] || SERVICE_LABELS.content).name} done for you: ${(SERVICE_LABELS[service] || SERVICE_LABELS.content).packageUrl}\n\n— Asa Luke`,
    html: (firstName, service) => isFit(service)
      ? wrap(`<p>Hey ${firstName},</p><p>Your blueprint gives you the numbers. But numbers on a page don't get you snatched — a plan you'll actually follow does.</p><p>That's exactly what the <strong>Life-Up Fitness app</strong> does for you, completely free:</p><ul><li>A custom workout for YOUR body and schedule</li><li>A done-for-you weekly meal plan built around food you love (on your budget)</li><li>Coach, built right in, checking in on you</li></ul><p>No trial, no card, no catch — just create your account.</p>${btn(CHALLENGE_URL, 'Get started free →')}`)
      : wrap(`<p>Hey ${firstName},</p><p>Hope the guide has been helpful. The strategies in it are exactly what I do for my clients — except I handle everything professionally, every month.</p>${btn((SERVICE_LABELS[service] || SERVICE_LABELS.content).packageUrl, 'View My Packages')}`),
  },
  {
    // Day 7: Close + guarantee
    delayDays: 7,
    subject: (firstName) => `${firstName}, don't let this sit`,
    text: (firstName, service) => isFit(service)
      ? `Hey ${firstName},\n\nStill haven't made an account? The Life-Up Fitness app is 100% free — custom workouts, done-for-you meals, Coach checking in on you, the whole thing.\n\nNo trial to track, no card, nothing to cancel later.\n\nCreate your account: ${CHALLENGE_URL}\n\nOr just reply and tell me what's holding you back — I'll help.\n\n— Asa Luke`
      : `Hey ${firstName},\n\nI've got a few spots open this month for ${(SERVICE_LABELS[service] || SERVICE_LABELS.content).name} clients.\n\nCheck out the options: ${(SERVICE_LABELS[service] || SERVICE_LABELS.content).packageUrl}\n\nOr just reply and we can chat.\n\n— Asa Luke`,
    html: (firstName, service) => isFit(service)
      ? wrap(`<p>Hey ${firstName},</p><p>Still haven't made an account? The <strong>Life-Up Fitness app is 100% free</strong> — custom workouts, done-for-you meals, Coach checking in on you, the whole thing.</p><p>No trial to track, no card, nothing to cancel later.</p>${btn(CHALLENGE_URL, 'Create your free account →')}<p>Or just reply and tell me what's holding you back — I'll help.</p>`)
      : wrap(`<p>Hey ${firstName},</p><p>I've got a few spots open this month for ${(SERVICE_LABELS[service] || SERVICE_LABELS.content).name} clients.</p>${btn((SERVICE_LABELS[service] || SERVICE_LABELS.content).packageUrl, 'View options')}<p>Or just reply and we can chat.</p>`),
  },
]

// Prospect outreach follow-up sequence (for cold outreach prospects)
export const PROSPECT_FOLLOW_UP_SEQUENCE = [
  {
    delayDays: 2,
    subject: (firstName: string) => `Just bumping this up, ${firstName}`,
    text: (firstName: string) => `Hey ${firstName}! Just bumping this up in case it got buried — would love to do that free edit/mix for you. Totally no pressure either way!\n\n— Asa Luke\nIG: @1AsaLuke`,
    html: (firstName: string) => `<div style="font-family:Arial,sans-serif; max-width:540px; margin:0 auto; color:#333333;">
      <p>Hey ${firstName}!</p>
      <p>Just bumping this up in case it got buried — would love to do that free edit/mix for you. Totally no pressure either way!</p>
      <p>— <strong>Asa Luke</strong><br><a href="https://instagram.com/1AsaLuke" style="color:#C9A84C;">@1AsaLuke</a></p>
      ${FOOTER}
    </div>`,
  },
  {
    delayDays: 5,
    subject: (firstName: string) => `Thought of you, ${firstName}`,
    text: (firstName: string) => `Hey ${firstName} — just finished an edit for another creator and it reminded me of your style. Still happy to do one for you free if you're interested.\n\nCheck out my work: ${BASE_URL}\n\n— Asa Luke`,
    html: (firstName: string) => `<div style="font-family:Arial,sans-serif; max-width:540px; margin:0 auto; color:#333333;">
      <p>Hey ${firstName},</p>
      <p>Just finished an edit for another creator and it reminded me of your style. Still happy to do one for you free if you're interested.</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${BASE_URL}" style="display:inline-block; background:#C9A84C; color:#0A0A0F; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:bold;">See My Work</a>
      </p>
      <p>— <strong>Asa Luke</strong></p>
      ${FOOTER}
    </div>`,
  },
  {
    delayDays: 10,
    subject: (firstName: string) => `Last few free spots, ${firstName}`,
    text: (firstName: string) => `Hey ${firstName}! I'm about to close out my free spots for this month — wanted to check one more time if you'd want me to edit a clip or mix a track for you before I fill up. Just send me the file and I'll get it done in 48 hrs.\n\n— Asa Luke`,
    html: (firstName: string) => `<div style="font-family:Arial,sans-serif; max-width:540px; margin:0 auto; color:#333333;">
      <p>Hey ${firstName}!</p>
      <p>I'm about to close out my free spots for this month — wanted to check one more time if you'd want me to edit a clip or mix a track for you before I fill up.</p>
      <p>Just send me the file and I'll get it done in 48 hrs.</p>
      <p>— <strong>Asa Luke</strong><br><a href="https://instagram.com/1AsaLuke" style="color:#C9A84C;">@1AsaLuke</a></p>
      ${FOOTER}
    </div>`,
  },
  {
    delayDays: 20,
    subject: (firstName: string) => `No worries, ${firstName}`,
    text: (firstName: string) => `Hey ${firstName} — no worries if the timing isn't right! If you ever need a content editor or mix engineer, I'm here. Keep killing it!\n\n— Asa Luke`,
    html: (firstName: string) => `<div style="font-family:Arial,sans-serif; max-width:540px; margin:0 auto; color:#333333;">
      <p>Hey ${firstName},</p>
      <p>No worries if the timing isn't right! If you ever need a content editor or mix engineer, I'm here. Keep killing it!</p>
      <p>— <strong>Asa Luke</strong><br><a href="https://instagram.com/1AsaLuke" style="color:#C9A84C;">@1AsaLuke</a></p>
      ${FOOTER}
    </div>`,
  },
]

export async function sendProspectFollowUpEmail(
  email: string,
  firstName: string,
  step: number
): Promise<boolean> {
  const sequence = PROSPECT_FOLLOW_UP_SEQUENCE[step]
  if (!sequence) return false

  try {
    const { error } = await resend.emails.send({
      from: `Asa Luke <${FROM_EMAIL}>`,
      to: email,
      replyTo: REPLY_TO,
      subject: sequence.subject(firstName),
      text: sequence.text(firstName),
      headers: UNSUB_HEADERS,
      html: sequence.html(firstName),
    })

    if (error) {
      console.error(`Prospect follow-up failed (step ${step}):`, error)
      return false
    }
    return true
  } catch (err) {
    console.error(`Prospect follow-up error (step ${step}):`, err)
    return false
  }
}

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
