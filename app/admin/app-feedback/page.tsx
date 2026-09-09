import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppFeedbackList from '@/components/AppFeedbackList'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bug Reports - Asa Luke' }

// The "Report an issue" widget's own inbox (components/FeedbackWidget.tsx) —
// separate from /admin/feedback, which is the periodic up/down pulse-check,
// not this always-on bug-report entry point.
export default async function AppFeedbackPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/app-feedback')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!(profile?.role === 'admin' || profile?.role === 'support')) redirect('/')
  return <AppFeedbackList />
}
