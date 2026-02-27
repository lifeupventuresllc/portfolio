import AuthForm from '@/components/AuthForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Log In - FitPro',
}

export default function LoginPage() {
  return (
    <div className="py-12 px-4">
      <AuthForm mode="login" />
    </div>
  )
}
