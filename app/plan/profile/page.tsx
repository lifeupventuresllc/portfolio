import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/ProfileForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Profile - FitPro',
}

// My Profile (Asa's ask, 2026-09-07): the one place to see and edit contact
// info — name, email, phone — same idea as any e-commerce account page.
// Linked from the hamburger menu (components/ClientMenu.tsx). No intake gate
// here on purpose: even a pre-intake or anonymous session should be able to
// fix a typo'd email or add a real one, not just someone with a full plan.
//
// Real bug found live testing (Asa's ask, 2026-09-07): an anonymous session
// couldn't save just a phone number, since the form unconditionally required
// email — and worse, if she HAD typed one in while still anonymous, this
// form would have attached a real email with no password ever set (this
// form never collected one), leaving her with no way to log back in as that
// same identity later. isAnonymous is passed down so the form can drop
// email entirely for her (name + phone only) and point to the real,
// already-correct claim flow (/plan/save, which collects email + password
// together) instead of half-doing that job itself.
export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/profile')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id, name, email, phone').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id, name, email, phone').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-12">
      <div className="max-w-md mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-6">← Home</Link>
        <h1 className="text-2xl font-bold text-white mb-1">My Profile</h1>
        <p className="text-ivory/50 text-sm mb-6">Your contact info — kept up to date so your coach can reach you.</p>
        <ProfileForm
          initialName={(enrollment.name as string) || ''}
          initialEmail={(enrollment.email as string) || user.email || ''}
          initialPhone={(enrollment.phone as string) || ''}
          isAnonymous={!!user.is_anonymous}
        />
      </div>
    </div>
  )
}
