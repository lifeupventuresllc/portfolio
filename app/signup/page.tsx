import { Suspense } from 'react'
import AuthForm from '@/components/AuthForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sign Up - FitPro',
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="py-12 px-4 text-center">Loading...</div>}>
      <div className="py-12 px-4">
        <AuthForm mode="signup" />
      </div>
    </Suspense>
  )
}
