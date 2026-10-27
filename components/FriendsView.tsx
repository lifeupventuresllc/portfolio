'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { PartnerStatus, Shares } from '@/lib/partners'
import { CHEERS, type CheerId } from '@/lib/partner-cheers'
import { hapticTap } from '@/lib/haptics'

// Friends tab (2026-10-26, Asa: "make it look like the rest of the app") —
// same dark look as the new intake + My Day: deep green page, gold + cream,
// Barlow headlines, mono labels/buttons.
// Sharing (same day, friends-plan.md + mockups FriendsShare / FriendsPartner):
// right after pairing she sees one screen with four switches, already set,
// and one big SHARE THESE button. Then her partner's "today" card: check
// mark, streak, goal line, picked meals (never calories), one-tap cheers, a
// team target, and a quiet "End partnership" at the bottom. Whatever her
// partner switched off never reaches this screen — it's dropped on the server.

type Message = { id: string; sender_enrollment_id: string; body: string; kind: 'text' | 'nudge' | 'cheer'; created_at: string }

const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const INK = '#EDE7DA', GOLD = '#E5A93C', BG = '#021F16', MUTE = 'rgba(237,231,218,.72)', MINT = '#9FDCC4'
const CARD = 'rgba(237,231,218,.06)', LINE = 'rgba(237,231,218,.14)'
const label = { fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color: GOLD } as const
const mono = (size: number) => ({ fontFamily: MONO, fontSize: size, fontWeight: 700, letterSpacing: '.12em' }) as const
const head = (size: number) => ({ margin: 0, fontFamily: HEAD, fontStyle: 'italic' as const, fontWeight: 800, fontSize: size, lineHeight: 0.88, textTransform: 'uppercase' as const, color: INK })
const pageStyle = { paddingTop: 24, minHeight: 'calc(100dvh - 4.5rem - env(safe-area-inset-bottom))', background: BG, color: INK, fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" } as const
const ghost = { background: 'transparent', border: '2px solid rgba(237,231,218,.22)', color: INK, ...mono(12) } as const

function ago(s: string) {
  const d = (Date.now() - new Date(s).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

const post = (url: string, body: object) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export default function FriendsView(props: { status: PartnerStatus | null; messages: Message[]; inviteCode: string | null; ended?: boolean }) {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" style={{ background: BG }} />}>
      <FriendsViewInner {...props} />
    </Suspense>
  )
}

function FriendsViewInner({ status, messages, inviteCode, ended }: { status: PartnerStatus | null; messages: Message[]; inviteCode: string | null; ended?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // The share screen: on its own right after pairing (she hasn't chosen
  // yet), and again any time from "WHAT I SHARE".
  const [sharing, setSharing] = useState(false)

  if (status && (!status.sharesChosen || sharing)) {
    return <ShareView status={status} reopened={status.sharesChosen} onDone={() => { setSharing(false); router.refresh() }} />
  }
  if (status) return <PairedView status={status} messages={messages} router={router} onShare={() => { hapticTap(); setSharing(true) }} />
  return <EmptyView inviteCode={inviteCode} prefillCode={searchParams.get('join') || ''} router={router} ended={!!ended} />
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

function EmptyView({ inviteCode, prefillCode, router, ended }: { inviteCode: string | null; prefillCode: string; router: ReturnType<typeof useRouter>; ended: boolean }) {
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
      const res = await post('/api/plan/friends/join', { code })
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

        {ended && (
          <div className="nf-rise rounded-[18px] px-4 py-3 mb-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
            <p className="text-[15px]" style={{ margin: 0, color: INK }}>This partnership ended.</p>
            <p className="text-[13px] mt-1" style={{ margin: 0, color: MUTE }}>Find a new partner below. Your plan keeps going either way.</p>
          </div>
        )}

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
              style={{ ...ghost, fontSize: 14 }}>
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

// ---- the share screen (mockup FriendsShare) ------------------------------------

function ShareView({ status, reopened, onDone }: { status: PartnerStatus; reopened: boolean; onDone: () => void }) {
  const first = status.partner.name.split(' ')[0]
  const FIRST = first.toUpperCase()
  const [on, setOn] = useState<Shares>(() => (reopened ? status.myShares : { showed_up: true, goal: true, meals: true, progress: false }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const goal = status.myGoalLine
  const rows: { k: keyof Shares; e: string; title: string; yes: string; no: string }[] = [
    { k: 'showed_up', e: '🔥', title: 'I showed up', yes: `${first} sees your check mark and streak.`, no: `${first} won't see your check mark or streak.` },
    { k: 'goal', e: '🎯', title: 'My goal', yes: goal ? `${first} sees: "Doing it for ${goal}."` : `${first} sees what you're doing it for, once you pick it.`, no: 'Your goal stays with you.' },
    { k: 'meals', e: '🥗', title: 'My meals', yes: `${first} sees what you picked here. Names only, no calories.`, no: 'Your meals stay with you.' },
    ...(status.canShareProgress ? [{ k: 'progress' as const, e: '📈', title: 'My progress', yes: `${first} sees "down 4 lbs." Never your weight.`, no: 'Off. Only you see your progress.' }] : []),
  ]
  const count = rows.filter((r) => on[r.k]).length

  async function finish() {
    if (saving || saved) return
    hapticTap()
    setSaving(true); setError('')
    try {
      const res = await post('/api/plan/friends/shares', on)
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(onDone, 900)
    } catch { setError('Could not save. Try again.') }
    setSaving(false)
  }

  return (
    <div className="nf-screen px-4 flex flex-col" style={pageStyle}>
      <style>{`.fv-track{width:52px;height:30px;border-radius:999px;position:relative;flex-shrink:0;transition:background .2s ease}.fv-knob{position:absolute;top:3px;width:24px;height:24px;border-radius:999px;background:${INK};transition:left .2s cubic-bezier(.2,1,.3,1);box-shadow:0 2px 6px rgba(0,0,0,.35)}.fv-pop{animation:fvPop .4s ease}@keyframes fvPop{0%{transform:scale(1)}40%{transform:scale(1.06)}100%{transform:scale(1)}}@media (prefers-reduced-motion: reduce){.fv-pop{animation:none}}`}</style>
      <div className="max-w-md mx-auto w-full pb-6 flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          {reopened ? (
            <button type="button" onClick={() => { hapticTap(); onDone() }} aria-label="Back" className="nf-press w-11 h-11 rounded-full grid place-items-center" style={{ background: 'rgba(237,231,218,.08)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
            </button>
          ) : <span />}
          <span className="rounded-full px-3 py-2 truncate" style={{ ...mono(11), background: 'rgba(229,169,60,.14)', border: '1px solid rgba(229,169,60,.5)', color: GOLD, maxWidth: '70%' }}>YOU + {FIRST} · PAIRED</span>
        </div>

        <div className="flex flex-col gap-1.5 px-1">
          <span style={{ ...mono(12), color: GOLD }}>YOU&apos;RE IN THIS TOGETHER</span>
          <h1 className="nf-head" style={{ ...head(50), overflowWrap: 'anywhere' }}>What can<br />{first} see?</h1>
          <p className="text-[15px] mt-0.5" style={{ margin: 0, color: MUTE }}>We set it up for you. Change anything, or just tap share.</p>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const v = on[r.k]
            return (
              <button key={r.k} type="button" role="switch" aria-checked={v} onClick={() => { hapticTap(); setOn({ ...on, [r.k]: !v }); setSaved(false) }}
                className="nf-press flex items-center gap-3 text-left"
                style={{ borderRadius: 18, border: `2px solid ${v ? GOLD : LINE}`, background: v ? 'rgba(229,169,60,.1)' : 'rgba(237,231,218,.04)', color: INK, padding: '12px 14px' }}>
                <span aria-hidden style={{ fontSize: 24, width: 30, textAlign: 'center', flexShrink: 0 }}>{r.e}</span>
                <span className="flex flex-col gap-[3px] flex-1 min-w-0">
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{r.title}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.35, color: v ? 'rgba(237,231,218,.78)' : 'rgba(237,231,218,.5)' }}>{v ? r.yes : r.no}</span>
                </span>
                <span className="fv-track" style={{ background: v ? GOLD : 'rgba(237,231,218,.2)' }}><span className="fv-knob" style={{ left: v ? 25 : 3 }} /></span>
              </button>
            )
          })}
        </div>

        <div className="flex items-start gap-2.5" style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(237,231,218,.04)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(237,231,218,.6)" strokeWidth="2" strokeLinecap="round" aria-hidden style={{ flexShrink: 0, marginTop: 1 }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
          <span style={{ fontSize: 13, lineHeight: 1.4, color: 'rgba(237,231,218,.7)' }}>Never shared: your weight, calories, snacks, or your why. Change this anytime. {first} is never told.</span>
        </div>

        <button type="button" onClick={finish} disabled={saving} className={`nf-press rounded-full mt-2 ${saved ? 'fv-pop' : ''}`}
          style={{ height: 62, background: saved ? MINT : GOLD, color: BG, ...mono(16) }}>
          {saved ? `✓ SHARED WITH ${FIRST}` : saving ? '...' : count ? `SHARE THESE ${count}` : 'KEEP IT ALL PRIVATE'}
        </button>
        {error && <p className="text-sm text-center" style={{ margin: 0, color: '#F2A08C' }}>{error}</p>}
        <span className="text-center" style={{ fontSize: 13, color: 'rgba(237,231,218,.6)' }}>
          {saved ? 'Done. Cheers and nudges always work both ways.' : `You see what ${first} shares. She sees what you share.`}
        </span>
      </div>
    </div>
  )
}

// ---- her partner today (mockup FriendsPartner) ---------------------------------------

function PairedView({ status, messages, router, onShare }: { status: PartnerStatus; messages: Message[]; router: ReturnType<typeof useRouter>; onShare: () => void }) {
  const [thread, setThread] = useState(messages)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [cheer, setCheer] = useState<{ id: CheerId; n: number } | null>(null)
  const [teamBusy, setTeamBusy] = useState(false)
  const [ending, setEnding] = useState<'idle' | 'ask' | 'busy'>('idle')
  const endRef = useRef<HTMLDivElement>(null)
  const firstLoad = useRef(true)

  useEffect(() => { setThread(messages) }, [messages])
  useEffect(() => {
    // Don't jump the page to the chat on first open — only when a message lands.
    if (firstLoad.current) { firstLoad.current = false; return }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [thread])

  function addLocal(kind: Message['kind'], body: string) {
    setThread((t) => [...t, { id: `local-${Date.now()}`, sender_enrollment_id: status.me.enrollmentId, body, kind, created_at: new Date().toISOString() }])
  }

  async function send(kind: 'text' | 'nudge') {
    const text = kind === 'nudge' ? undefined : draft.trim()
    if (kind === 'text' && !text) return
    hapticTap()
    if (kind === 'nudge') setNudging(true); else setSending(true)
    try {
      const res = await post('/api/plan/friends/messages', { kind, body: text })
      if (res.ok) {
        if (kind === 'text') setDraft('')
        addLocal(kind, kind === 'nudge' ? '👋 nudged you' : text!)
      }
    } finally {
      if (kind === 'nudge') setNudging(false); else setSending(false)
    }
  }

  async function sendCheer(id: CheerId) {
    hapticTap()
    setCheer((c) => ({ id, n: (c?.n || 0) + 1 }))
    const res = await post('/api/plan/friends/messages', { kind: 'cheer', cheer: id }).catch(() => null)
    if (res?.ok) addLocal('cheer', CHEERS[id].body)
  }

  async function team(action: 'start' | 'accept', goal?: number) {
    if (teamBusy) return
    hapticTap()
    setTeamBusy(true)
    try { await post('/api/plan/friends/team', { action, goal }); router.refresh() } finally { setTeamBusy(false) }
  }

  async function end() {
    hapticTap()
    setEnding('busy')
    const res = await post('/api/plan/friends/end', {}).catch(() => null)
    if (res?.ok) router.refresh(); else setEnding('ask')
  }

  const p = status.partner
  const firstName = p.name.split(' ')[0]
  const initial = p.name.trim().charAt(0).toUpperCase() || 'P'
  const sharesShowUp = p.streak != null
  const t = status.team
  const teamGoal = Math.max(2, (status.weeklyGoal || 4) * 2)
  const myPct = Math.min(100, Math.round((status.me.weeklyCount! / Math.max(1, status.weeklyGoal)) * 100))

  return (
    <div className="nf-screen px-4 flex flex-col" style={pageStyle}>
      <style>{`.fv-pop{animation:fvPop .4s ease}@keyframes fvPop{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}.fv-fly{animation:fvFly 1s ease both}@keyframes fvFly{0%{opacity:0;transform:translateY(10px) scale(.6)}30%{opacity:1;transform:translateY(-8px) scale(1.2)}100%{opacity:0;transform:translateY(-60px) scale(1)}}@media (prefers-reduced-motion: reduce){.fv-pop,.fv-fly{animation:none}}`}</style>
      <div className="max-w-md mx-auto w-full pb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span style={{ ...mono(12), color: GOLD }}>YOUR PARTNER</span>
          <button type="button" onClick={onShare} className="nf-press rounded-full px-3 py-2" style={{ ...mono(11), color: 'rgba(237,231,218,.75)', border: '1px solid rgba(237,231,218,.2)' }}>WHAT I SHARE</button>
        </div>

        <div className="flex items-center gap-3.5 px-1">
          <span className="shrink-0 grid place-items-center rounded-full" style={{ width: 62, height: 62, background: GOLD, color: BG, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 34 }}>{initial}</span>
          <span className="flex flex-col gap-1 min-w-0">
            <h1 className="nf-head" style={{ ...head(46), overflowWrap: 'anywhere' }}>{firstName} today</h1>
            {p.goalLine && <span style={{ fontSize: 14, color: MUTE }}>Doing it for: <b style={{ color: INK }}>{p.goalLine}</b></span>}
            {p.progressLine && <span className="self-start rounded-full px-2.5 py-1" style={{ ...mono(11), color: '#9FDCC4', background: 'rgba(110,190,160,.14)', border: '1px solid rgba(110,190,160,.45)' }}>{p.progressLine.toUpperCase()}</span>}
          </span>
        </div>

        {sharesShowUp && (
          <div className="nf-rise grid grid-cols-2 gap-2" style={{ animationDelay: '.08s' }}>
            <div className="flex flex-col gap-1.5" style={{ borderRadius: 18, padding: '12px 14px', ...(p.checkedInToday ? { background: 'rgba(229,169,60,.1)', border: `2px solid ${GOLD}` } : { background: CARD, border: '2px solid transparent' }) }}>
              <span style={{ ...mono(10), color: p.checkedInToday ? GOLD : 'rgba(237,231,218,.6)' }}>SHOWED UP</span>
              <span className="flex items-center gap-2">
                <span className="grid place-items-center rounded-full shrink-0" style={{ width: 30, height: 30, background: p.checkedInToday ? GOLD : 'rgba(237,231,218,.1)' }}>
                  {p.checkedInToday && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>}
                </span>
                <span style={{ ...head(24), lineHeight: 1 }}>{p.checkedInToday ? 'Done' : 'Not yet'}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1.5" style={{ borderRadius: 18, padding: '12px 14px', background: CARD }}>
              <span style={{ ...mono(10), color: 'rgba(237,231,218,.6)' }}>STREAK</span>
              <span style={{ ...head(30), lineHeight: 1 }}>🔥 {p.streak} {p.streak === 1 ? 'day' : 'days'}</span>
            </div>
          </div>
        )}

        {/* You two this week: the team target when there is one, else her own week. */}
        <div className="nf-rise flex flex-col gap-2" style={{ borderRadius: 18, padding: '12px 14px', background: CARD, animationDelay: '.14s' }}>
          {t && t.accepted ? (
            <>
              <span className="flex justify-between" style={mono(10)}><span style={{ color: 'rgba(237,231,218,.6)' }}>YOU TWO THIS WEEK</span><span style={{ color: GOLD }}>{t.count} / {t.goal}</span></span>
              <div className="flex overflow-hidden" style={{ height: 10, borderRadius: 999, background: 'rgba(237,231,218,.12)' }}>
                <div style={{ width: `${Math.min(100, (t.partnerCount / t.goal) * 100)}%`, background: GOLD }} />
                <div style={{ width: `${Math.max(0, Math.min(100 - (t.partnerCount / t.goal) * 100, (t.myCount / t.goal) * 100))}%`, background: MINT }} />
              </div>
              <span style={{ fontSize: 13, color: MUTE }}>
                {t.count >= t.goal ? 'You did it together! New goal starts Monday.' : `${firstName} ${t.partnerCount} · You ${t.myCount} · Team goal ${t.goal}. You win together.`}
              </span>
            </>
          ) : t && !t.startedByMe ? (
            <>
              <span style={{ ...mono(10), color: GOLD }}>TEAM GOAL?</span>
              <span style={{ fontSize: 15, color: INK }}>{firstName} wants to do {t.goal} workouts together this week.</span>
              <button type="button" onClick={() => team('accept')} disabled={teamBusy} className="nf-press rounded-full mt-1 disabled:opacity-60" style={{ height: 48, background: GOLD, color: BG, ...mono(14) }}>{teamBusy ? '...' : "I'M IN"}</button>
            </>
          ) : t ? (
            <>
              <span style={{ ...mono(10), color: 'rgba(237,231,218,.6)' }}>TEAM GOAL</span>
              <span style={{ fontSize: 14, color: MUTE }}>Together, {t.goal} workouts this week. Waiting for {firstName} to say she&apos;s in.</span>
            </>
          ) : (
            <>
              <span className="flex justify-between" style={mono(10)}><span style={{ color: 'rgba(237,231,218,.6)' }}>YOUR WEEK</span><span style={{ color: GOLD }}>{status.me.weeklyCount} / {status.weeklyGoal}</span></span>
              <div className="overflow-hidden" style={{ height: 10, borderRadius: 999, background: 'rgba(237,231,218,.12)' }}>
                <div className="h-full" style={{ width: `${myPct}%`, background: GOLD }} />
              </div>
              {status.teamAvailable && (
                <button type="button" onClick={() => team('start', teamGoal)} disabled={teamBusy} className="nf-press rounded-full mt-1 disabled:opacity-60" style={{ height: 46, ...ghost, borderColor: GOLD, color: GOLD }}>
                  {teamBusy ? '...' : `TEAM UP: ${teamGoal} TOGETHER THIS WEEK`}
                </button>
              )}
            </>
          )}
        </div>

        {p.meals.length > 0 && (
          <>
            <span className="px-1 pt-0.5" style={{ ...mono(11), color: 'rgba(237,231,218,.6)' }}>WHAT {firstName.toUpperCase()} ATE</span>
            <div className="flex gap-2">
              {p.meals.slice(-2).map((m, i) => (
                <div key={i} className="flex-1 min-w-0 overflow-hidden" style={{ borderRadius: 16, background: CARD }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.photo} alt="" className="w-full object-cover" style={{ height: 74 }} />
                  <div className="flex flex-col gap-0.5" style={{ padding: '8px 10px 10px' }}>
                    <span style={{ ...mono(9), color: GOLD }}>{m.slot}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{m.name}</span>
                    <span className="truncate" style={{ fontSize: 12, color: 'rgba(237,231,218,.6)' }}>{m.place}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="relative flex gap-2 mt-2">
          {(Object.keys(CHEERS) as CheerId[]).map((id) => {
            const c = CHEERS[id], s = cheer?.id === id
            return (
              <button key={`${id}-${s ? cheer!.n : 0}`} type="button" onClick={() => sendCheer(id)} className={`nf-press flex-1 rounded-full flex items-center justify-center gap-1.5 ${s ? 'fv-pop' : ''}`}
                style={{ height: 58, border: `2px solid ${s ? GOLD : 'rgba(237,231,218,.2)'}`, background: s ? GOLD : 'rgba(237,231,218,.05)', color: s ? BG : INK, fontWeight: 700, fontSize: 15 }}>
                <span aria-hidden style={{ fontSize: 20 }}>{c.e}</span>{c.label}
              </button>
            )
          })}
          {cheer && <span key={`fly-${cheer.n}`} aria-hidden className="fv-fly absolute pointer-events-none" style={{ left: '50%', top: -10, marginLeft: -16, fontSize: 32 }}>{CHEERS[cheer.id].e}</span>}
        </div>
        <span className="text-center" style={{ fontSize: 13, color: 'rgba(237,231,218,.6)' }}>{cheer ? `Sent. ${firstName} gets it on her phone.` : `One tap sends ${firstName} a cheer.`}</span>

        <div className="flex items-center justify-between mt-4">
          <span style={label}>CHAT</span>
          <button onClick={() => send('nudge')} disabled={nudging} className="nf-press h-9 px-4 rounded-full whitespace-nowrap disabled:opacity-40" style={{ ...ghost, fontSize: 11 }}>
            {nudging ? '...' : 'NUDGE'}
          </button>
        </div>
        <div className="rounded-[22px] p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div className="max-h-[45vh] overflow-y-auto space-y-2.5 mb-3">
            {thread.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'rgba(237,231,218,.5)' }}>Say hey — you&apos;re a team now.</p>}
            {thread.map((m) => {
              const mine = m.sender_enrollment_id === status.me.enrollmentId
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-[14px] leading-snug break-words ${mine ? 'rounded-br-md font-medium' : 'rounded-bl-md'}`}
                    style={mine ? { background: GOLD, color: BG } : { background: 'rgba(237,231,218,.1)', color: INK }}>
                    {m.body}
                    <div suppressHydrationWarning className="text-[10px] mt-0.5" style={{ color: mine ? 'rgba(2,31,22,.55)' : 'rgba(237,231,218,.45)' }}>{ago(m.created_at)}</div>
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

        <Link href="/plan/community" onClick={() => hapticTap()} className="nf-press flex items-center justify-between gap-3 rounded-[20px] px-4 py-4 mt-2" style={{ border: '2px solid rgba(237,231,218,.22)' }}>
          <span className="text-sm" style={{ color: MUTE }}>Want a wider circle too?</span>
          <span className="shrink-0" style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: GOLD }}>OPEN CONNECT →</span>
        </Link>

        {/* End partnership: two taps, no pop-up. */}
        <div className="flex flex-col items-center gap-2 mt-4">
          {ending === 'idle' ? (
            <button type="button" onClick={() => { hapticTap(); setEnding('ask') }} className="underline underline-offset-2" style={{ fontSize: 13, color: 'rgba(237,231,218,.45)' }}>End partnership</button>
          ) : (
            <div className="w-full flex flex-col gap-2 rounded-[18px] p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <span style={{ fontSize: 15, color: INK }}>End it with {firstName}? All sharing stops now. She won&apos;t be told why.</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => { hapticTap(); setEnding('idle') }} disabled={ending === 'busy'} className="nf-press flex-1 h-12 rounded-full" style={ghost}>KEEP</button>
                <button type="button" onClick={end} disabled={ending === 'busy'} className="nf-press flex-1 h-12 rounded-full disabled:opacity-60" style={{ background: '#F2A08C', color: BG, ...mono(12) }}>{ending === 'busy' ? '...' : 'YES, END IT'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
