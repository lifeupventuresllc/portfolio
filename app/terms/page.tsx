import LegalPage, { H2 } from '@/components/LegalPage'

export const metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 9, 2026">
      <p>
        Welcome to Life-Up Fitness, operated by Life-Up Ventures LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;Asa Luke&rdquo;).
        By creating an account, purchasing a program, or using asaluke.io and its apps
        (the &ldquo;Service&rdquo;), you agree to these Terms of Service. If you do not agree, please do not use the Service.
      </p>

      <H2>1. Who can use the Service</H2>
      <p>You must be at least 18 years old and able to form a binding contract to use the Service and make purchases.</p>

      <H2>2. Your account</H2>
      <p>
        You are responsible for keeping your login credentials secure and for all activity under your account.
        Provide accurate information at signup and keep it current. Notify us if you suspect unauthorized use.
      </p>

      <H2>3. The app &amp; digital products</H2>
      <p>
        The Life-Up Fitness app is free — no purchase or subscription is required to create an account or use its features.
        Separate digital products (like the cookbook or the Protein Budget System) are purchased directly through our
        payment processor, Stripe, at the price shown at checkout. These are one-time purchases delivered electronically
        for your personal, non-commercial use.
      </p>

      <H2>4. Refunds &amp; guarantees</H2>
      <p>
        Any guarantee on a specific digital product is described on that product&apos;s offer page at the time of purchase.
        Because digital products are delivered immediately, refunds are granted at our discretion and per the specific
        offer terms. Contact us and we&apos;ll make it right where we reasonably can.
      </p>

      <H2>5. Health disclaimer</H2>
      <p>
        Life-Up Fitness provides fitness and nutrition information and coaching for educational purposes. It is not medical
        advice and is not a substitute for care from a licensed physician. Consult your doctor before starting any exercise or
        nutrition program, especially if you are pregnant, nursing, or have a medical condition. You participate at your own
        risk and assume responsibility for your health decisions.
      </p>

      <H2>6. Acceptable use</H2>
      <p>
        Don&apos;t share your account, resell or redistribute our content, scrape the Service, upload harmful or unlawful
        content, or harass other members in community features. We may suspend or terminate accounts that violate these Terms.
      </p>

      <H2>7. Intellectual property</H2>
      <p>
        All workouts, meal plans, recipes, videos, and written content are owned by Life-Up Ventures LLC and licensed to you
        under our <a href="/eula" className="text-gold hover:underline">End User License Agreement</a> for personal use only.
      </p>

      <H2>8. Community content</H2>
      <p>
        You own what you post in community features but grant us a license to display it within the Service. Keep it
        respectful and lawful; we may remove content or members at our discretion.
      </p>

      <H2>9. Disclaimers &amp; limitation of liability</H2>
      <p>
        The Service is provided &ldquo;as is.&rdquo; To the fullest extent permitted by law, Life-Up Ventures LLC is not liable
        for indirect or consequential damages, and our total liability is limited to the amount you paid us in the prior 12 months.
      </p>

      <H2>10. Changes &amp; contact</H2>
      <p>
        We may update these Terms; material changes will be posted here with a new date. Questions? Email
        info.lifeupventures@gmail.com.
      </p>
    </LegalPage>
  )
}
