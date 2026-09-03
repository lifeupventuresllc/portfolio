'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { PartnerStatus } from '@/lib/partners'

type Message = { id: string; sender_enrollment_id: string; body: string; kind: 'text' | 'nudge'; created_at: string }

function ago(s: string) {
  const d = (Date.now() - new Date(s).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

export default function FriendsView(props: { status: PartnerStatus | null; messages: Message[]; inviteCode: string | null }) {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-obsidian" />}>
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

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Home</Link>
      <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Friends</p>
      <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
      <p className="text-ivory/60 text-sm mb-6">{sub}</p>
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
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked — code is still visible to copy by hand */ }
  }

  async function join() {
    if (!code.trim()) return
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
    <div className="min-h-[100dvh] bg-obsidian px-4 py-12">
      <div className="max-w-xl mx-auto">
        <Header title="Do this with someone" sub="One person you check in with. Not a feed — just you two, keeping each other honest." />

        <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: 'linear-gradient(135deg, #0d3a2a, #044A34 60%, #08281d)', border: '1.5px solid #E5A93C' }}>
          <p className="text-3xl mb-2">🤝</p>
          <h2 className="text-white font-semibold text-lg mb-1.5">Invite your accountability partner</h2>
          <p className="text-ivory/70 text-xs mb-4 leading-relaxed">Send this link to a real friend. Once they join, you&apos;ll see each other&apos;s streaks and check in together.</p>
          {inviteCode && (
            <>
              <div className="bg-charcoal/60 border border-gold/30 rounded-xl py-3 px-4 mb-3">
                <p className="text-gold text-xl font-bold tracking-[0.2em]">{inviteCode}</p>
              </div>
              <button onClick={copyLink} className="w-full bg-gold text-obsidian font-bold text-sm rounded-xl py-3">
                {copied ? 'Link copied ✓' : 'Copy invite link'}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 my-5 text-ivory/40 text-xs uppercase tracking-[0.15em]">
          <div className="flex-1 h-px bg-white/10" /><span>or</span><div className="flex-1 h-px bg-white/10" />
        </div>

        <p className="text-gold text-xs font-semibold tracking-[0.2em] uppercase mb-2">Have a code?</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter their code"
            className="flex-1 bg-charcoal border border-gold/30 rounded-xl px-4 py-3 text-white text-sm tracking-[0.1em] focus:outline-none focus:border-gold" />
          <button onClick={join} disabled={joining || !code.trim()} className="border-2 border-gold text-gold font-bold text-sm rounded-xl px-5 disabled:opacity-40">
            {joining ? '...' : 'Join'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        <p className="text-ivory/40 text-xs mt-3 text-center">Codes come from a friend&apos;s invite link — ask them to share it.</p>
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

  const initial = status.partner.name.trim().charAt(0).toUpperCase() || 'P'
  const goalPct = Math.min(100, Math.round((status.me.weeklyCount / Math.max(1, status.weeklyGoal)) * 100))

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-12">
      <div className="max-w-xl mx-auto">
        <Header title={`You & ${status.partner.name.split(' ')[0]}`} sub="Keeping each other on track." />

        <div className="rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, #0d3a2a, #044A34 60%, #08281d)', border: '1.5px solid #E5A93C' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-gold text-obsidian flex items-center justify-center font-bold text-lg shrink-0">{initial}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[15px]">{status.partner.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-gold text-xs font-bold">🔥 {status.partner.streak} day streak</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${status.partner.checkedInToday ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-ivory/40'}`}>
                  {status.partner.checkedInToday ? 'Checked in today' : 'Not yet today'}
                </span>
              </div>
            </div>
            <button onClick={() => send('nudge')} disabled={nudging} className="border-2 border-gold text-gold text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap disabled:opacity-40">
              {nudging ? '...' : '👋 Nudge'}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-ivory/60 mb-1.5">
            <span>This week&apos;s goal</span>
            <span>{status.me.weeklyCount} / {status.weeklyGoal} workouts</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${goalPct}%`, background: 'linear-gradient(90deg, #E5A93C, #f0c164)' }} />
          </div>
        </div>

        <p className="text-gold text-xs font-semibold tracking-[0.2em] uppercase mb-2">Chat</p>
        <div className="bg-charcoal border border-gold/25 rounded-2xl p-4">
          <div className="max-h-[45vh] overflow-y-auto space-y-2.5 mb-3">
            {thread.length === 0 && <p className="text-ivory/40 text-xs text-center py-6">Say hey — you&apos;re a team now.</p>}
            {thread.map((m) => {
              const mine = m.sender_enrollment_id === status.me.enrollmentId
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-[13px] leading-snug ${mine ? 'bg-gold text-obsidian font-medium rounded-br-md' : 'bg-white/8 text-white rounded-bl-md'}`}>
                    {m.body}
                    <div className={`text-[10px] mt-0.5 ${mine ? 'text-obsidian/50' : 'text-ivory/30'}`}>{ago(m.created_at)}</div>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send('text')}
              placeholder={`Message ${status.partner.name.split(' ')[0]}…`} maxLength={1000}
              className="flex-1 bg-obsidian border border-white/15 rounded-full px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold" />
            <button onClick={() => send('text')} disabled={sending || !draft.trim()} aria-label="Send" className="w-10 h-10 rounded-full bg-gold flex items-center justify-center shrink-0 disabled:opacity-40">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>

        <Link href="/plan/community" className="flex items-center justify-between bg-white/[0.03] border border-dashed border-white/20 rounded-2xl px-4 py-3.5 mt-5">
          <span className="text-ivory/60 text-xs">Want a wider circle too?</span>
          <span className="text-gold text-xs font-bold">Open Connect →</span>
        </Link>
      </div>
    </div>
  )
}
