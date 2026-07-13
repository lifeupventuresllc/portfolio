import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { COMMUNITY_URL } from '@/lib/bonuses'
import PostBox from '@/components/PostBox'

export const dynamic = 'force-dynamic'

function ago(s: string) {
  const d = (Date.now() - new Date(s).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

export default async function Community() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/community')
  const svc = createServiceClient()

  let { data: enrollment } = await svc.from('challenge_enrollments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('*').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')
  const firstName = ((enrollment.name as string) || 'there').split(' ')[0]

  // Load the feed (gracefully if the table isn't applied yet)
  const { data: posts } = await svc.from('challenge_community_posts')
    .select('id, name, body, created_at').order('created_at', { ascending: false }).limit(50)

  const linked = COMMUNITY_URL && COMMUNITY_URL !== '#'

  return (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-xl mx-auto">
        <Link href="/plan" className="text-ivory/40 text-xs hover:text-gold mb-2 inline-block">← Back to my plan</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">The Curve Collective</p>
        <h1 className="text-3xl font-bold text-white mb-2">You&apos;re not doing this alone, {firstName} 💛</h1>
        <p className="text-ivory/50 text-sm mb-6">Our private circle of women walking it out together. Share a win, ask a question, cheer each other on.</p>

        {linked && (
          <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="block text-center bg-charcoal border border-gold/30 rounded-2xl py-3 mb-5 text-gold font-semibold text-sm hover:bg-gold/5">
            Join the live community →
          </a>
        )}

        <PostBox />

        <div className="space-y-3">
          {(posts || []).map((p) => (
            <div key={p.id} className="bg-charcoal border border-smoke rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white font-semibold text-sm">{p.name || 'A sister'}</span>
                <span className="text-ivory/30 text-xs">{ago(p.created_at)}</span>
              </div>
              <p className="text-ivory/70 text-sm whitespace-pre-wrap">{p.body}</p>
            </div>
          ))}
          {(!posts || posts.length === 0) && (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">👋🏽</p>
              <p className="text-ivory/50 text-sm">Be the first to post — start the conversation, {firstName}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
