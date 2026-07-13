import LegalPage, { H2 } from '@/components/LegalPage'

export const metadata = { title: 'End User License Agreement (EULA)' }

export default function EulaPage() {
  return (
    <LegalPage title="End User License Agreement" updated="July 13, 2026">
      <p>
        This End User License Agreement (&ldquo;EULA&rdquo;) governs your use of the Life-Up Fitness apps, digital products,
        workouts, meal plans, recipes, and content (collectively, the &ldquo;Licensed Content&rdquo;) provided by Life-Up
        Ventures LLC. By creating an account or accessing the Licensed Content, you accept this EULA.
      </p>

      <H2>1. License granted</H2>
      <p>
        We grant you a limited, personal, non-exclusive, non-transferable, revocable license to access and use the Licensed
        Content for your own individual, non-commercial fitness and nutrition use while your account or purchase is active.
      </p>

      <H2>2. What you may not do</H2>
      <p>
        You may not copy, resell, sublicense, distribute, publicly post, or share the Licensed Content; use it to train or
        coach others commercially; remove proprietary notices; or reverse-engineer the apps. Your login and content are for you alone.
      </p>

      <H2>3. Ownership</H2>
      <p>
        The Licensed Content is owned by Life-Up Ventures LLC and protected by intellectual-property laws. This EULA grants a
        license only — not a sale — and all rights not expressly granted are reserved.
      </p>

      <H2>4. Updates</H2>
      <p>
        We may update, improve, or modify the apps and Licensed Content over time. New features and content are provided under
        this same EULA unless different terms are presented.
      </p>

      <H2>5. Termination</H2>
      <p>
        This license ends automatically if you breach it or when your account or access period ends. On termination, you must
        stop using and delete any downloaded Licensed Content.
      </p>

      <H2>6. Health &amp; liability</H2>
      <p>
        The Licensed Content is educational and not medical advice — see the health disclaimer in our
        <a href="/terms" className="text-gold hover:underline"> Terms of Service</a>. Use is at your own risk to the fullest
        extent permitted by law.
      </p>

      <p className="text-ivory/50 text-sm">
        This EULA works together with our Terms of Service and Privacy Policy. Questions? Email info.lifeupventures@gmail.com.
      </p>
    </LegalPage>
  )
}
