import { Suspense } from 'react'
import Link from 'next/link'
import AuthForm from '@/components/AuthForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Save Your Progress - FitPro',
}

// Anonymous-access, Phase 1: the claim page, linked from the intake
// done-reveal and the dashboard's AnonymousSessionBanner. Lives under
// /plan so middleware already requires SOME session (anonymous or real) to
// reach it, which is exactly right for a claim flow — nothing new needed
// in middleware.ts for this to work.
export default function SavePage() {
  return (
    <Suspense fallback={<div className="py-12 px-4 text-center">Loading...</div>}>
      <div className="py-12 px-4">
        <div className="max-w-md mx-auto">
          <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Home</Link>
        </div>
        <AuthForm mode="claim" />
      </div>
    </Suspense>
  )
}
