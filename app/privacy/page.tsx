import LegalPage, { H2 } from '@/components/LegalPage'

export const metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 13, 2026">
      <p>
        Life-Up Ventures LLC (&ldquo;we&rdquo;) respects your privacy. This policy explains what we collect through asaluke.io
        and the Life-Up Fitness apps, and how we use it.
      </p>

      <H2>What we collect</H2>
      <p>
        Account info (name, email); the fitness details you provide at intake (stats, goals, injuries, food preferences);
        your check-ins, progress, photos you upload, and community posts; and payment details processed securely by Stripe
        (we never store your full card number). If you sign in with Google, we receive your name and email from Google.
      </p>

      <H2>How we use it</H2>
      <p>
        To build your custom workout and meal plan, run your check-ins and coaching, process purchases, operate community
        features, send account and program emails, and improve the Service. We do not sell your personal information.
      </p>

      <H2>Who we share it with</H2>
      <p>
        Only service providers that help us operate: Supabase (database &amp; auth), Stripe (payments), Resend (email), and
        Google (if you use Google Sign-In). They process data on our behalf under their own terms.
      </p>

      <H2>Your progress photos</H2>
      <p>
        Photos you upload are stored privately and are only accessible to you and your coach. They are never public.
      </p>

      <H2>Your choices</H2>
      <p>
        You can update your info in your account, request a copy or deletion of your data, and unsubscribe from marketing
        emails at any time. Email info.lifeupventures@gmail.com to make a request.
      </p>

      <H2>Data security &amp; retention</H2>
      <p>
        We use reputable providers with encryption in transit. We keep your data while your account is active and as needed
        for legal and business purposes, then delete or anonymize it.
      </p>

      <p className="text-ivory/50 text-sm">Questions about your privacy? Email info.lifeupventures@gmail.com.</p>
    </LegalPage>
  )
}
