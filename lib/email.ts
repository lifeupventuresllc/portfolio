import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@asaluke.io'
const REPLY_TO = 'info.lifeupventures@gmail.com'
const UNSUB_HEADERS = {
  'List-Unsubscribe': '<mailto:info.lifeupventures@gmail.com?subject=Unsubscribe>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
}
const FOOTER = `<p style="color:#cccccc; font-size:10px; margin-top:24px; border-top:1px solid #eeeeee; padding-top:12px;">You received this because you have an account at asaluke.io. To unsubscribe, reply with "unsubscribe" or email info.lifeupventures@gmail.com.</p>`

export async function sendPurchaseConfirmation(email: string, productName: string, amount: number) {
  const dollars = (amount / 100).toFixed(2)

  const { error } = await resend.emails.send({
    from: `Asa Luke <${FROM_EMAIL}>`,
    to: email,
    replyTo: REPLY_TO,
    subject: `Purchase Confirmed — ${productName}`,
    headers: UNSUB_HEADERS,
    text: `Payment Received\n\nThank you for your purchase.\n\nProduct: ${productName}\nAmount: $${dollars}\n\nYour content is now unlocked: ${process.env.NEXT_PUBLIC_APP_URL}/content\n\n— Asa Luke\nasaluke.io`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">Payment Received</h1>
        <p>Thank you for your purchase.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Product</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${productName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Amount</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">$${dollars}</td>
          </tr>
        </table>
        <p>Your content is now unlocked. <a href="${process.env.NEXT_PUBLIC_APP_URL}/content" style="color: #C9A84C;">Access it here</a>.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send purchase confirmation email:', error)
  }
}

export async function sendWelcomeEmail(email: string) {
  const { error } = await resend.emails.send({
    from: `Asa Luke <${FROM_EMAIL}>`,
    to: email,
    replyTo: REPLY_TO,
    subject: 'Welcome to Asa Luke',
    headers: UNSUB_HEADERS,
    text: `Welcome!\n\nYour account is confirmed and ready to go.\n\nHere's what you can do next:\n- Check out my services at ${process.env.NEXT_PUBLIC_APP_URL}\n- Content editing, audio engineering, and fitness packages available\n\n— Asa Luke\nasaluke.io`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">Welcome</h1>
        <p>Your account is confirmed and ready to go.</p>
        <p>Here's what you can do next:</p>
        <ul style="color: #374151; line-height: 1.8;">
          <li>Check out my <a href="${process.env.NEXT_PUBLIC_APP_URL}/services/content-editing" style="color: #C9A84C;">content editing</a>, <a href="${process.env.NEXT_PUBLIC_APP_URL}/services/audio-engineering" style="color: #C9A84C;">audio engineering</a>, and <a href="${process.env.NEXT_PUBLIC_APP_URL}/services/bundles" style="color: #C9A84C;">bundle packages</a></li>
          <li>Subscription plans or one-time options available</li>
          <li>Professional-grade work delivered on schedule</li>
        </ul>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Services</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send welcome email:', error)
  }
}

export async function sendOnboardingDay3Email(email: string) {
  const { error } = await resend.emails.send({
    from: `Asa Luke <${FROM_EMAIL}>`,
    to: email,
    replyTo: REPLY_TO,
    subject: 'Quick question for you',
    headers: UNSUB_HEADERS,
    text: `Hey,\n\nYou signed up a few days ago — wanted to check in.\n\nWhether you need content editing, audio engineering, or fitness coaching, I've got packages that fit.\n\nCheck them out: ${process.env.NEXT_PUBLIC_APP_URL}\n\nHit reply if you have any questions.\n\n— Asa Luke\nasaluke.io`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">Checking In</h1>
        <p>You signed up a few days ago — wanted to see if you had any questions.</p>
        <p>Whether you need content editing, audio engineering, or fitness coaching, I've got packages designed to deliver real results:</p>
        <ul style="color: #374151; line-height: 1.8;">
          <li><strong>Content Editing</strong> — short-form video editing, starting at $247/mo</li>
          <li><strong>Audio Engineering</strong> — mixing and mastering, starting at $99</li>
          <li><strong>Bundles</strong> — combined packages for creators who want it all</li>
        </ul>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Packages</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send onboarding day 3 email:', error)
  }
}

export async function sendOnboardingDay7Email(email: string) {
  const { error } = await resend.emails.send({
    from: `Asa Luke <${FROM_EMAIL}>`,
    to: email,
    replyTo: REPLY_TO,
    subject: 'Still thinking about it?',
    headers: UNSUB_HEADERS,
    text: `Hey,\n\nIt's been about a week since you joined. If you're still on the fence, I get it.\n\nHere's what my clients get:\n- Content editing: 6-24 videos/month, subscription-based\n- Audio engineering: mixing & mastering, one-time or monthly\n- Bundle deals that save 20-30%\n\nCheck it out: ${process.env.NEXT_PUBLIC_APP_URL}\n\nHit reply anytime — happy to answer questions.\n\n— Asa Luke\nasaluke.io`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">One Week In</h1>
        <p>It's been about a week since you joined. If you haven't checked out the full services yet, here's what's available:</p>
        <ul style="color: #374151; line-height: 1.8;">
          <li><strong>Content Editing</strong> — 6, 12, or 24 videos/month on subscription</li>
          <li><strong>Audio Engineering</strong> — single track, EP, or full album options</li>
          <li><strong>Bundle Packages</strong> — Creator ($597/mo) or Empire ($997/mo)</li>
        </ul>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View All Packages</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send onboarding day 7 email:', error)
  }
}

export async function sendRefundConfirmation(email: string, productName: string, amount: number) {
  const dollars = (amount / 100).toFixed(2)

  const { error } = await resend.emails.send({
    from: `Asa Luke <${FROM_EMAIL}>`,
    to: email,
    replyTo: REPLY_TO,
    subject: `Refund Processed — ${productName}`,
    headers: UNSUB_HEADERS,
    text: `Refund Processed\n\nYour refund has been processed. It may take 5-10 business days to appear on your statement.\n\nProduct: ${productName}\nRefund Amount: $${dollars}\n\n— Asa Luke\nasaluke.io`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">Refund Processed</h1>
        <p>Your refund has been processed. It may take 5-10 business days to appear on your statement.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Product</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${productName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Refund Amount</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">$${dollars}</td>
          </tr>
        </table>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send refund confirmation email:', error)
  }
}
