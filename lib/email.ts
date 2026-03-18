import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@asaluke.io'

export async function sendPurchaseConfirmation(email: string, productName: string, amount: number) {
  const dollars = (amount / 100).toFixed(2)

  const { error } = await resend.emails.send({
    from: `FitPro <${FROM_EMAIL}>`,
    to: email,
    subject: 'Purchase Confirmed — FitPro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1d4ed8;">Payment Received</h1>
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
        <p>Your content is now unlocked. <a href="${process.env.NEXT_PUBLIC_APP_URL}/content" style="color: #1d4ed8;">Access it here</a>.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">FitPro by asaluke.io</p>
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send purchase confirmation email:', error)
  }
}

export async function sendWelcomeEmail(email: string) {
  const { error } = await resend.emails.send({
    from: `FitPro <${FROM_EMAIL}>`,
    to: email,
    subject: 'Welcome to FitPro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1d4ed8;">Welcome to FitPro</h1>
        <p>Your account is confirmed and ready to go.</p>
        <p>Here's what you can do next:</p>
        <ul style="color: #374151; line-height: 1.8;">
          <li>Check out the <a href="${process.env.NEXT_PUBLIC_APP_URL}/#pricing" style="color: #1d4ed8;">12-week fitness program</a></li>
          <li>One-time payment — lifetime access</li>
          <li>Structured workouts, nutrition guide, and progress tracking</li>
        </ul>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/#pricing" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Get Started</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">FitPro by asaluke.io</p>
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send welcome email:', error)
  }
}

export async function sendOnboardingDay3Email(email: string) {
  const { error } = await resend.emails.send({
    from: `FitPro <${FROM_EMAIL}>`,
    to: email,
    subject: 'Quick tip to get the most out of FitPro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1d4ed8;">Getting Started?</h1>
        <p>You signed up a few days ago — here are some tips to help you get started:</p>
        <ul style="color: #374151; line-height: 1.8;">
          <li><strong>Start with Week 1</strong> — the foundation phase builds your base</li>
          <li><strong>Nutrition matters</strong> — our guide has flexible macro targets for any goal</li>
          <li><strong>Consistency beats intensity</strong> — 3 workouts per week is all you need</li>
        </ul>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/#pricing" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View the Program</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">FitPro by asaluke.io</p>
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send onboarding day 3 email:', error)
  }
}

export async function sendOnboardingDay7Email(email: string) {
  const { error } = await resend.emails.send({
    from: `FitPro <${FROM_EMAIL}>`,
    to: email,
    subject: 'Your first week with FitPro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1d4ed8;">One Week In</h1>
        <p>It's been a week since you joined FitPro. If you haven't started yet, now's the time.</p>
        <p>The program is designed to meet you where you are — whether you're a beginner or experienced.</p>
        <p><strong>What you get:</strong></p>
        <ul style="color: #374151; line-height: 1.8;">
          <li>12 weeks of progressive workouts</li>
          <li>Full nutrition guide with macro targets</li>
          <li>Lifetime access — go at your own pace</li>
        </ul>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/#pricing" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Get Access — $29.99</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">FitPro by asaluke.io</p>
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
    from: `FitPro <${FROM_EMAIL}>`,
    to: email,
    subject: 'Refund Processed — FitPro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1d4ed8;">Refund Processed</h1>
        <p>Your refund has been processed. It may take 5–10 business days to appear on your statement.</p>
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
        <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">FitPro by asaluke.io</p>
      </div>
    `,
  })

  if (error) {
    console.error('Failed to send refund confirmation email:', error)
  }
}
