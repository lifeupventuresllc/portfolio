import AuthForm from '@/components/AuthForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sign Up - FitPro',
}

export default function SignupPage() {
  return (
    <div className="py-12 px-4">
      <AuthForm mode="signup" />
    </div>
  )
}
