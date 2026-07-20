import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FeedbackForm from '@/components/FeedbackForm'

export const dynamic = 'force-dynamic'

export default async function FeedbackPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/feedback')

  return (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-lg mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Back to my plan</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Quick feedback</p>
        <h1 className="text-3xl font-bold text-white mb-2">How&apos;s the app treating you?</h1>
        <p className="text-ivory/55 text-sm mb-8">Something broke, felt confusing, or you love it — tell me. I read every one myself.</p>
        <FeedbackForm />
      </div>
    </div>
  )
}
