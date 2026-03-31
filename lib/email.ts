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

export async function sendPurchaseOnboardingDay3Email(email: string, serviceName: string) {
  const { error } = await resend.emails.send({
    from: `Asa Luke <${FROM_EMAIL}>`,
    to: email,
    replyTo: REPLY_TO,
    subject: 'Quick check-in on your order',
    headers: UNSUB_HEADERS,
    text: `Hey!\n\nJust checking in — you purchased ${serviceName} a few days ago.\n\nHave you submitted your intake form yet? It helps me understand exactly what you need so I can deliver the best results.\n\nIf you haven't filled it out yet, you can do it here: ${process.env.NEXT_PUBLIC_APP_URL}/intake\n\nHit reply if you have any questions.\n\n— Asa Luke\nasaluke.io`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">Quick Check-In</h1>
        <p>Just checking in — you purchased <strong>${serviceName}</strong> a few days ago.</p>
        <p>Have you submitted your intake form yet? It helps me understand exactly what you need so I can deliver the best results.</p>
        <p>If you haven't filled it out yet, submit it here:</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/intake" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Submit Intake Form</a>
        </p>
        <p>Hit reply if you have any questions.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send purchase onboarding day 3 email:', error)
  }
}

export async function sendPurchaseOnboardingDay7Email(email: string, serviceName: string) {
  const { error } = await resend.emails.send({
    from: `Asa Luke <${FROM_EMAIL}>`,
    to: email,
    replyTo: REPLY_TO,
    subject: 'Tips for getting the best results',
    headers: UNSUB_HEADERS,
    text: `Hey!\n\nIt's been about a week since you purchased ${serviceName}. Here are a few tips to get the most out of it:\n\n1. Be specific in your brief — the more detail you give, the better the final product.\n2. Share reference examples — links to content you like help me match your vision.\n3. Communicate early — if something isn't right, let me know before the deadline so we can adjust.\n4. Trust the process — I've delivered for dozens of clients across content editing and audio engineering.\n\nIf you have any questions, just hit reply.\n\n— Asa Luke\nasaluke.io`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">Tips for Best Results</h1>
        <p>It's been about a week since you purchased <strong>${serviceName}</strong>. Here are a few tips to get the most out of it:</p>
        <ol style="color: #374151; line-height: 2;">
          <li><strong>Be specific in your brief</strong> — the more detail you give, the better the final product.</li>
          <li><strong>Share reference examples</strong> — links to content you like help me match your vision.</li>
          <li><strong>Communicate early</strong> — if something isn't right, let me know before the deadline so we can adjust.</li>
          <li><strong>Trust the process</strong> — I've delivered for dozens of clients across content editing and audio engineering.</li>
        </ol>
        <p>If you have any questions, just hit reply.</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/content" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Your Content</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send purchase onboarding day 7 email:', error)
  }
}

export async function sendUpsellEmail(email: string, firstName: string, serviceType: string, stage: number = 1) {
  const serviceLabel = serviceType === 'content' ? 'content' : 'audio'

  const emails: Record<number, { subject: string; html: string; text: string }> = {
    1: {
      subject: 'Want to keep the momentum going?',
      text: `Hey ${firstName}! Glad you liked the ${serviceLabel} work! If you want to keep the momentum going, here are my monthly packages:\n\n→ Starter ($297/mo) — 4 videos\n→ Growth ($597/mo) — 8 videos\n→ VIP ($997/mo) — 12+ videos\n\nWant me to set you up? Just hit reply.\n\n— Asa Luke`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #C9A84C;">Keep the Momentum Going</h1>
          <p>Hey ${firstName}! Glad you liked the ${serviceLabel} work! If you want to keep the momentum going, here are my monthly packages:</p>
          <ul style="color: #374151; line-height: 2; list-style: none; padding: 0;">
            <li><strong style="color: #C9A84C;">→</strong> <strong>Starter ($297/mo)</strong> — 4 videos</li>
            <li><strong style="color: #C9A84C;">→</strong> <strong>Growth ($597/mo)</strong> — 8 videos</li>
            <li><strong style="color: #C9A84C;">→</strong> <strong>VIP ($997/mo)</strong> — 12+ videos</li>
          </ul>
          <p>Want me to set you up? Just hit reply.</p>
          <p style="margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/services" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Packages</a>
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
          ${FOOTER}
        </div>
      `,
    },
    2: {
      subject: `Quick question about your ${serviceLabel} project`,
      text: `Hey ${firstName}, just wanted to follow up. A lot of my clients who started with a single project ended up going monthly — and saw way better results because of the consistency.\n\nIf you're thinking about it, I can put together a custom package for you. Just reply and let me know what you need.\n\n— Asa Luke`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #C9A84C;">Quick Follow-Up</h1>
          <p>Hey ${firstName}, just wanted to follow up.</p>
          <p>A lot of my clients who started with a single project ended up going monthly — and saw way better results because of the <strong>consistency</strong>.</p>
          <p>Here's what they say matters most:</p>
          <ul style="color: #374151; line-height: 2; list-style: none; padding: 0;">
            <li><strong style="color: #C9A84C;">→</strong> Consistent posting builds momentum</li>
            <li><strong style="color: #C9A84C;">→</strong> The algorithm rewards regularity</li>
            <li><strong style="color: #C9A84C;">→</strong> Their audience grew 2-3x in the first month</li>
          </ul>
          <p>If you're thinking about it, I can put together a custom package. Just reply.</p>
          <p style="margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/book" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Book a Quick Call</a>
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
          ${FOOTER}
        </div>
      `,
    },
    3: {
      subject: `Last chance — special offer for returning clients`,
      text: `Hey ${firstName}, this is my last follow-up. I'm offering returning clients 15% off their first month of any monthly package.\n\nThis offer expires in 48 hours. If you're ready to level up your content, now's the time.\n\nReply or book a call: ${process.env.NEXT_PUBLIC_APP_URL}/book\n\n— Asa Luke`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #C9A84C;">Special Offer — Returning Clients Only</h1>
          <p>Hey ${firstName}, this is my last follow-up and I wanted to make it count.</p>
          <p>I'm offering returning clients <strong style="color: #C9A84C;">15% off their first month</strong> of any monthly package.</p>
          <div style="background: #1A1A22; border: 1px solid #C9A84C; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; text-align: center; color: #C9A84C; font-size: 18px; font-weight: bold;">15% OFF FIRST MONTH</p>
            <p style="margin: 8px 0 0; text-align: center; color: #9ca3af; font-size: 13px;">Offer expires in 48 hours</p>
          </div>
          <p>If you're ready to level up your content, now's the time.</p>
          <p style="margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/book" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Claim Your Spot</a>
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
          ${FOOTER}
        </div>
      `,
    },
  }

  const emailData = emails[stage] || emails[1]

  const { error } = await resend.emails.send({
    from: `Asa Luke <${FROM_EMAIL}>`,
    to: email,
    replyTo: REPLY_TO,
    subject: emailData.subject,
    headers: UNSUB_HEADERS,
    text: emailData.text,
    html: emailData.html,
  })

  if (error) {
    console.error(`Failed to send upsell email (stage ${stage}):`, error)
  }
}

// === CLIENT CHECK-IN EMAILS ===

export async function sendCheckinEmail(email: string, firstName: string, type: '30' | '60' | '90') {
  const subjects: Record<string, string> = {
    '30': "Quick check — how's everything going?",
    '60': "2 months in — ready to level up?",
    '90': "3 months strong — let's talk about what's next",
  }

  const bodies: Record<string, string> = {
    '30': `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">How's Everything Going?</h1>
        <p>Hey ${firstName}! It's been about a month since we started working together, and I wanted to check in.</p>
        <p>Quick questions:</p>
        <ul style="color: #374151; line-height: 2;">
          <li>Are you happy with the quality of work?</li>
          <li>Is there anything you'd like adjusted?</li>
          <li>Any feedback on turnaround time?</li>
        </ul>
        <p>Your satisfaction is everything to me. Just hit reply and let me know how things are going.</p>
        <p style="margin-top: 20px;">— Asa Luke</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
    '60': `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">Ready to Level Up?</h1>
        <p>Hey ${firstName}! We're 2 months in and I hope you're seeing results from the content.</p>
        <p>A lot of my clients at this stage start thinking about scaling — posting more frequently, adding new content types, or expanding to new platforms.</p>
        <p>If you're interested in upgrading your package or adding services, I'd love to chat about what would make the biggest impact for your brand.</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/book" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Book a Quick Call</a>
        </p>
        <p style="margin-top: 20px;">— Asa Luke</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
    '90': `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">3 Months Strong</h1>
        <p>Hey ${firstName}! We've been working together for 3 months now and I appreciate you trusting me with your brand.</p>
        <p>At this point, I'd love to have a quick conversation about:</p>
        <ul style="color: #374151; line-height: 2;">
          <li><strong>What's working</strong> — so we can double down</li>
          <li><strong>What could improve</strong> — so we can adjust</li>
          <li><strong>Your goals for the next quarter</strong> — so I can plan content around them</li>
        </ul>
        <p>Also — if you know anyone who could benefit from what we do, I'd appreciate a referral. I'll give you a discount on next month's invoice for every person you send my way.</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/book" style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Book a Strategy Call</a>
        </p>
        <p style="margin-top: 20px;">— Asa Luke</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
  }

  const { error } = await resend.emails.send({
    from: `Asa Luke <${FROM_EMAIL}>`,
    to: email,
    replyTo: REPLY_TO,
    subject: subjects[type],
    headers: UNSUB_HEADERS,
    text: `Hey ${firstName}, checking in after ${type} days. How's everything going? Reply to this email or book a call at ${process.env.NEXT_PUBLIC_APP_URL}/book — Asa Luke`,
    html: bodies[type],
  })

  if (error) {
    console.error(`Failed to send ${type}-day checkin email:`, error)
  }
}

// === BOOKING CONFIRMATION EMAILS ===

export async function sendBookingConfirmation(email: string, name: string, date: string, timeSlot: string, service: string) {
  const { error } = await resend.emails.send({
    from: `Asa Luke <${FROM_EMAIL}>`,
    to: email,
    replyTo: REPLY_TO,
    subject: `Booking Confirmed — ${date} at ${timeSlot}`,
    headers: UNSUB_HEADERS,
    text: `Hey ${name}! Your call is confirmed.\n\nDate: ${date}\nTime: ${timeSlot} (Pacific)\nTopic: ${service}\n\nI'll reach out via email at the scheduled time. If you need to reschedule, just reply to this email.\n\n— Asa Luke`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">You're Booked</h1>
        <p>Hey ${name}! Your call is confirmed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date</td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${date}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Time</td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${timeSlot} (Pacific)</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Topic</td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${service}</td></tr>
        </table>
        <p>I'll reach out via email at the scheduled time. If you need to reschedule, just reply to this email.</p>
        <p style="margin-top: 20px;">— Asa Luke</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Asa Luke — asaluke.io</p>
        ${FOOTER}
      </div>
    `,
  })

  if (error) console.error('Failed to send booking confirmation:', error)

  // Notify admin
  await resend.emails.send({
    from: `Asa Luke System <${FROM_EMAIL}>`,
    to: REPLY_TO,
    subject: `New Booking: ${name} — ${date} at ${timeSlot}`,
    text: `New booking!\n\nName: ${name}\nEmail: ${email}\nDate: ${date}\nTime: ${timeSlot}\nService: ${service}\n\nCheck admin dashboard for details.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C9A84C;">New Booking</h1>
        <p><strong>${name}</strong> (${email}) booked a call.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date</td><td style="text-align: right;">${date}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Time</td><td style="text-align: right;">${timeSlot}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Service</td><td style="text-align: right;">${service}</td></tr>
        </table>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin">View in Admin</a></p>
      </div>
    `,
  })
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
