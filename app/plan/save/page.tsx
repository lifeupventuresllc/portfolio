import { Suspense } from 'react'
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
        <AuthForm mode="claim" />
      </div>
    </Suspense>
  )
}
