import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type ProtectedRouteProps = {
  children: React.ReactNode
  requiredRole?: 'admin' | 'customer'
  requirePurchase?: boolean
}

export default async function ProtectedRoute({
  children,
  requiredRole,
  requirePurchase,
}: ProtectedRouteProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (requiredRole) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (requiredRole === 'admin' && profile?.role !== 'admin') {
      redirect('/')
    }

    if (requiredRole === 'customer' && profile?.role === 'free') {
      // Check if they have a purchase
      const { data: purchases } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .limit(1)

      if (!purchases || purchases.length === 0) {
        redirect('/')
      }
    }
  }

  if (requirePurchase) {
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .limit(1)

    if (!purchases || purchases.length === 0) {
      redirect('/')
    }
  }

  return <>{children}</>
}
