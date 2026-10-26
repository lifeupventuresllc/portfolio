'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { PartnerStatus } from '@/lib/partners'
import { hapticTap } from '@/lib/haptics'

// Friends tab (2026-10-26, Asa: "make it look like the rest of the app") —
// same dark look as the new intake + My Day: deep green page, gold + cream,
// Barlow headlines, mono labels/buttons. Look only; every call is unchanged.

type Message = { id: string; sender_enrollment_id: string; body: string; kind: 'text' | 'nudge'; created_at: string }

const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const INK = '#EDE7DA', GOLD = '#E5A93C', BG = '#021F16', MUTE = 'rgba(237,231,218,.72)'
const CARD = 'rgba(237,231,218,.06)', LINE = 'rgba(237,231,218,.14)'
const label = { fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color: GOLD } as const
const pageStyle = { paddingTop: 24, minHeight: 'calc(100dvh - 4.5rem - env(safe-area-inset-bottom))', background: BG, color: INK, fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" } as const

function ago(s: string) {
  const d = (Date.now() - new Date(s).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

export default function FriendsView(props: { status: PartnerStatus | null; messages: Message[]; inviteCode: string | null }) {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" style={{ background: BG }} />}>
      <FriendsViewInner {...props} />
    </Suspense>
  )
}

function FriendsViewInner({ status, messages, inviteCode }: { status: PartnerStatus | null; messages: Message[]; inviteCode: string | null }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  if (status) return <PairedView status={status} messages={messages} router={router} />
  return <EmptyView inviteCode={inviteCode} prefillCode={searchParams.get('join') || ''} router={router} />
}

function Header({ title, sub }: { title: ReactNode; sub: string }) {
  return (
    <>
      <div className="mb-5">
        <Link href="/plan" onClick={() => hapticTap()} className="nf-press inline-flex items-center gap-1.5 h-11 px-4 rounded-full" style={{ background: 'rgba(237,231,218,.1)', color: INK, fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em' }}>← HOME</Link>
      </div>
      <span style={label}>FRIENDS</span>
      <h1 className="nf-head" style={{ margin: '4px 0 10px', fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 56, lineHeight: 0.88, textTransform: 'uppercase', color: INK, overflowWrap: 'anywhere' }}>{title}</h1>
      <p className="text-[15px] leading-snug mb-6" style={{ color: MUTE }}>{sub}</p>
    </>
  )
}

function EmptyView({ inviteCode, prefillCode, router }: { inviteCode: string | null; prefillCode: string; router: ReturnType<typeof useRouter> }) {
  const [code, setCode] = useState(prefillCode)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const shareLink = inviteCode ? `https://www.asaluke.io/plan/friends?join=${inviteCode}` : ''

  async function copyLink() {
    hapticTap()
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked — code is still visible to copy by hand */ }
  }

  async function join() {
    if (!code.trim()) return
    hapticTap()
    setJoining(true); setError('')
    try {
      const res = await fetch('/api/plan/friends/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      const d = await res.json()
      if (res.ok) router.refresh()
      else setError(d.error || 'Could not join.')
    } catch { setError('Could not join.') }
    setJoining(false)
  }

  return (
    <div className="nf-screen px-4 flex flex-col" style={pageStyle}>
      <div className="max-w-md mx-auto w-full pb-6">
        <Header title={<>Your<br />people.</>} sub="One person you check in with. Not a feed — just you two, keeping each other going." />

        <div className="nf-rise rounded-[22px] p-5 mb-4" style={{ background: CARD, border: `1px solid ${LINE}`, animationDelay: '.1s' }}>
          <span style={{ ...label, color: MUTE, fontSize: 11 }}>INVITE A FRIEND</span>
          <p className="mt-1.5 mb-4 text-[15px] leading-snug" style={{ color: INK }}>Send this link to a real friend. Once she joins, you&apos;ll see each other&apos;s streaks and check in together.</p>
          {inviteCode && (
            <>
              <div className="rounded-2xl py-3 px-4 mb-3 text-center" style={{ background: 'rgba(229,169,60,.1)', border: '1px solid rgba(229,169,60,.45)' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.16em', color: MUTE }}>YOUR CODE</span>
                <p style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, letterSpacing: '.2em', color: GOLD, margin: '2px 0 0' }}>{inviteCode}</p>
              </div>
              <button onClick={copyLink} className="nf-press w-full h-14 rounded-full" style={{ background: GOLD, color: BG, fontFamily: MONO, fontSize: 14, fontWeight: 700, letterSpacing: '.1em' }}>
                {copied ? 'LINK COPIED ✓' : 'COPY INVITE LINK'}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 my-5" style={{ color: 'rgba(237,231,218,.45)', fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.16em' }}>
          <div className="flex-1 h-px" style={{ background: LINE }} /><span>OR</span><div className="flex-1 h-px" style={{ background: LINE }} />
        </div>

        <div className="nf-rise" style={{ animationDelay: '.2s' }}>
          <span style={label}>HAVE A CODE?</span>
          <div className="flex gap-2 mt-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter her code"
              className="flex-1 min-w-0 h-14 rounded-2xl px-4 text-base focus:outline-none placeholder:text-[rgba(237,231,218,.4)]"
              style={{ background: CARD, border: `1px solid ${LINE}`, color: INK, fontFamily: MONO, letterSpacing: '.1em' }} />
            <button onClick={join} disabled={joining || !code.trim()} className="nf-press h-14 px-6 rounded-full shrink-0 disabled:opacity-40"
              style={{ background: 'transparent', border: '2px solid rgba(237,231,218,.22)', color: INK, fontFamily: MONO, fontSize: 14, fontWeight: 700, letterSpacing: '.1em' }}>
              {joining ? '...' : 'JOIN'}
            </button>
          </div>
          {error && <p className="text-sm mt-2" style={{ color: '#F2A08C' }}>{error}</p>}
          <p className="text-[13px] mt-3 text-center" style={{ color: 'rgba(237,231,218,.5)' }}>Codes come from a friend&apos;s invite link — ask her to share it.</p>
        </div>
      </div>
    </div>
  )
}

function PairedView({ status, messages, router }: { status: PartnerStatus; messages: Message[]; router: ReturnType<typeof useRouter> }) {
  const [thread, setThread] = useState(messages)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [nudging, setNudging] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  async function send(kind: 'text' | 'nudge', body?: string) {
    const text = kind === 'nudge' ? undefined : (body || draft).trim()
    if (kind === 'text' && !text) return
    hapticTap()
    if (kind === 'nudge') setNudging(true); else setSending(true)
    try {
      const res = await fetch('/api/plan/friends/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, body: text }) })
      if (res.ok) {
        if (kind === 'text') setDraft('')
        setThread((t) => [...t, { id: `local-${Date.now()}`, sender_enrollment_id: status.me.enrollmentId, body: kind === 'nudge' ? '👋 nudged you' : text!, kind, created_at: new Date().toISOString() }])
        router.refresh()
      }
    } finally {
      if (kind === 'nudge') setNudging(false); else setSending(false)
    }
  }

  const firstName = status.partner.name.split(' ')[0]
  const initial = status.partner.name.trim().charAt(0).toUpperCase() || 'P'
  const goalPct = Math.min(100, Math.round((status.me.weeklyCount / Math.max(1, status.weeklyGoal)) * 100))

  return (
    <div className="nf-screen px-4 flex flex-col" style={pageStyle}>
      <div className="max-w-md mx-auto w-full pb-6">
        <Header title={<>You &amp;<br />{firstName}.</>} sub="Keeping each other on track." />

        <div className="nf-rise rounded-[22px] p-4 mb-4" style={{ background: CARD, border: `1px solid ${LINE}`, animationDelay: '.1s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: GOLD, color: BG, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 24 }}>{initial}</div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold text-[16px]" style={{ color: INK }}>{status.partner.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: GOLD }}>{status.partner.streak}-DAY STREAK</span>
                <span className="px-2 py-0.5 rounded-full" style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', ...(status.partner.checkedInToday ? { background: 'rgba(229,169,60,.16)', color: GOLD } : { background: 'rgba(237,231,218,.08)', color: 'rgba(237,231,218,.55)' }) }}>
                  {status.partner.checkedInToday ? 'CHECKED IN TODAY' : 'NOT YET TODAY'}
                </span>
              </div>
            </div>
            <button onClick={() => send('nudge')} disabled={nudging} className="nf-press h-10 px-4 rounded-full shrink-0 whitespace-nowrap disabled:opacity-40"
              style={{ background: 'transparent', border: '2px solid rgba(237,231,218,.22)', color: INK, fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em' }}>
              {nudging ? '...' : 'NUDGE'}
            </button>
          </div>
          <div className="flex items-center justify-between mb-1.5" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: MUTE }}>
            <span>THIS WEEK</span>
            <span>{status.me.weeklyCount} / {status.weeklyGoal} WORKOUTS</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(237,231,218,.1)' }}>
            <div className="h-full rounded-full" style={{ width: `${goalPct}%`, background: GOLD }} />
          </div>
        </div>

        <span style={label}>CHAT</span>
        <div className="nf-rise rounded-[22px] p-4 mt-2" style={{ background: CARD, border: `1px solid ${LINE}`, animationDelay: '.2s' }}>
          <div className="max-h-[45vh] overflow-y-auto space-y-2.5 mb-3">
            {thread.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'rgba(237,231,218,.5)' }}>Say hey — you&apos;re a team now.</p>}
            {thread.map((m) => {
              const mine = m.sender_enrollment_id === status.me.enrollmentId
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-[14px] leading-snug break-words ${mine ? 'rounded-br-md font-medium' : 'rounded-bl-md'}`}
                    style={mine ? { background: GOLD, color: BG } : { background: 'rgba(237,231,218,.1)', color: INK }}>
                    {m.body}
                    <div className="text-[10px] mt-0.5" style={{ color: mine ? 'rgba(2,31,22,.55)' : 'rgba(237,231,218,.45)' }}>{ago(m.created_at)}</div>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send('text')}
              placeholder={`Message ${firstName}…`} maxLength={1000}
              className="flex-1 min-w-0 h-12 rounded-full px-4 text-base focus:outline-none placeholder:text-[rgba(237,231,218,.4)]"
              style={{ background: BG, border: `1px solid ${LINE}`, color: INK }} />
            <button onClick={() => send('text')} disabled={sending || !draft.trim()} aria-label="Send" className="nf-press w-12 h-12 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40" style={{ background: GOLD }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>

        <Link href="/plan/community" onClick={() => hapticTap()} className="nf-press flex items-center justify-between gap-3 rounded-[20px] px-4 py-4 mt-5" style={{ border: '2px solid rgba(237,231,218,.22)' }}>
          <span className="text-sm" style={{ color: MUTE }}>Want a wider circle too?</span>
          <span className="shrink-0" style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: GOLD }}>OPEN CONNECT →</span>
        </Link>
      </div>
    </div>
  )
}
