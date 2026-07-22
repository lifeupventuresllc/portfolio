import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppFeedback from '@/components/AppFeedback'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'App Feedback - Asa Luke' }

export default async function AppFeedbackPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/feedback')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!(profile?.role === 'admin' || profile?.role === 'support')) redirect('/')
  return <AppFeedback />
}
