import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { COMMUNITY_URL } from '@/lib/bonuses'
import { getLeaderboard } from '@/lib/leaderboard'
import PostBox from '@/components/PostBox'
import ProviderMatchTeaser from '@/components/ProviderMatchTeaser'
import CommunityTabs from '@/components/CommunityTabs'

export const dynamic = 'force-dynamic'

// Connect tab (2026-10-26, Asa: "make it look like the rest of the app") —
// same dark look as the new intake + My Day. Look only; data is unchanged.
const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const INK = '#EDE7DA', GOLD = '#E5A93C', BG = '#021F16', MUTE = 'rgba(237,231,218,.72)'
const CARD = 'rgba(237,231,218,.06)', LINE = 'rgba(237,231,218,.14)'
const LABEL = { fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color: GOLD } as const

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
  const firstName = ((enrollment.name as string) || '').trim().split(' ')[0]

  // Load the feed (gracefully if the table isn't applied yet)
  const { data: posts } = await svc.from('challenge_community_posts')
    .select('id, name, body, created_at').order('created_at', { ascending: false }).limit(50)

  const { leaderboard, spotlight } = await getLeaderboard(enrollment.id as string)

  const linked = COMMUNITY_URL && COMMUNITY_URL !== '#'

  return (
    <div className="nf-screen px-4 flex flex-col" style={{ paddingTop: 24, minHeight: 'calc(100dvh - 4.5rem - env(safe-area-inset-bottom))', background: BG, color: INK, fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" }}>
      <div className="max-w-md mx-auto w-full pb-6">
        <div className="mb-5">
          <Link href="/plan" className="nf-press inline-flex items-center gap-1.5 h-11 px-4 rounded-full" style={{ background: 'rgba(237,231,218,.1)', color: INK, fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em' }}>← HOME</Link>
        </div>
        <span style={LABEL}>THE CURVE COLLECTIVE</span>
        <h1 className="nf-head" style={{ margin: '4px 0 10px', fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 56, lineHeight: 0.88, textTransform: 'uppercase', color: INK }}>You&apos;re not<br />alone.</h1>
        <p className="text-[15px] leading-snug mb-6" style={{ color: MUTE }}>{firstName ? `${firstName}, this is` : 'This is'} our private circle of women walking it out together. Share a win, ask a question, cheer each other on.</p>

        <CommunityTabs
          match={<ProviderMatchTeaser />}
          community={
            <>
              {linked && (
                <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="nf-press flex items-center justify-center h-14 rounded-full mb-5" style={{ border: '2px solid rgba(237,231,218,.22)', color: INK, fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: '.1em' }}>
                  JOIN THE LIVE COMMUNITY →
                </a>
              )}

              {spotlight && (
                <div className="nf-rise rounded-[22px] px-4 py-3.5 mb-4" style={{ background: 'rgba(229,169,60,.1)', borderLeft: `4px solid ${GOLD}` }}>
                  <span style={{ ...LABEL, fontSize: 11 }}>THIS WEEK&apos;S SPOTLIGHT</span>
                  <p className="text-[15px] mt-1" style={{ color: INK }}>
                    <span className="font-semibold">{spotlight.isYou ? 'You' : spotlight.name}</span> — {spotlight.streak}-day streak
                  </p>
                </div>
              )}

              {leaderboard.length > 1 && (
                <div className="nf-rise rounded-[22px] p-4 mb-4" style={{ background: CARD, border: `1px solid ${LINE}`, animationDelay: '.1s' }}>
                  <span style={{ ...LABEL, fontSize: 11, color: MUTE }}>LEADERBOARD</span>
                  <div className="space-y-2 mt-3">
                    {leaderboard.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-[15px]">
                        <span className="truncate" style={{ color: entry.isYou ? GOLD : INK, fontWeight: entry.isYou ? 600 : 400 }}>
                          {i + 1}. {entry.isYou ? 'You' : entry.name}
                        </span>
                        <span className="shrink-0" style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: MUTE }}>{entry.streak}D</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <PostBox />

              <div className="space-y-3">
                {(posts || []).map((p) => (
                  <div key={p.id} className="rounded-[22px] p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="truncate font-semibold text-[15px]" style={{ color: INK }}>{p.name || 'A sister'}</span>
                      <span className="shrink-0" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'rgba(237,231,218,.45)' }}>{ago(p.created_at)}</span>
                    </div>
                    <p className="text-[15px] leading-snug whitespace-pre-wrap break-words" style={{ color: 'rgba(237,231,218,.85)' }}>{p.body}</p>
                  </div>
                ))}
                {(!posts || posts.length === 0) && (
                  <div className="text-center py-10">
                    <p style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 30, lineHeight: 1, textTransform: 'uppercase', color: INK }}>Be the first.</p>
                    <p className="text-[15px] mt-2" style={{ color: MUTE }}>Start the conversation{firstName ? `, ${firstName}` : ''}.</p>
                  </div>
                )}
              </div>
            </>
          }
        />
      </div>
    </div>
  )
}
