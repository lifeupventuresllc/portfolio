import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMemberEnrollment } from '@/lib/member'
import LifeResetClient from '@/components/LifeResetClient'

export const dynamic = 'force-dynamic'

// Inner Circle exclusive: "life happened" one-tap reset. A dedicated confirm
// page (not a native confirm() dialog) matching the app's existing pattern for
// anything consequential — same shape as /plan/eating-out and /plan/compound.
export default async function LifeResetPage() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user) redirect('/login?redirect=/plan/life-reset')
  if (!enrollment) redirect('/plan')
  if (enrollment.tier !== 'inner_circle') redirect('/plan')

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-12">
      <div className="max-w-lg mx-auto">
        <Link href="/plan" className="text-ivory/50 text-sm mb-6 inline-block hover:text-gold transition-colors">← Home</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Inner Circle</p>
        <h1 className="text-3xl font-bold text-white mb-2">Life happened? Let&apos;s start fresh.</h1>
        <p className="text-ivory/60 text-sm mb-8">
          I&apos;ll personally rebuild your workout from your saved info — no re-intake, no starting over.
          Your progress, streak, and history stay exactly as they are. Just a clean plan for what&apos;s ahead.
        </p>
        <LifeResetClient />
      </div>
    </div>
  )
}
