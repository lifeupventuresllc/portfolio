import { Suspense } from 'react'
import AuthForm from '@/components/AuthForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Log In - FitPro',
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-12 px-4 text-center">Loading...</div>}>
      <div className="py-12 px-4">
        <AuthForm mode="login" />
      </div>
    </Suspense>
  )
}
