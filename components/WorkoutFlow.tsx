'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { hapticTap } from '@/lib/haptics'
import { playCountdownBeep } from '@/lib/countdown-beep'
import type { Block, Move } from '@/lib/workout-blocks'
import type { Effort } from '@/components/SetEffortTap'

// The workout screen (2026-10-29, Asa's spec): ONE exercise at a time, full
// screen. Photo (or looping video) up top, the name big, the sets as circles,
// the reps as one plain number, one big Done button. Done fills the circle
// and starts a short rest; during the rest she taps Easy or Hard (same
// progression signal as before — never removed). After the last set the
// next exercise slides in. Two moves done back to back share one screen,
// count rounds, and rest after both. Nothing else on screen.

const INK = '#EDE7DA', GOLD = '#E5A93C', BG = '#021F16', MUTE = 'rgba(237,231,218,.72)', MINT = '#1EE38A'
const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const pill = { fontFamily: MONO, fontWeight: 700, letterSpacing: '.1em' } as const
const FALLBACK = ['/images/app/pexels-8846586.jpg', '/images/app/pexels-8402239.jpg', '/images/app/pexels-7746282.jpg']

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const repText = (m: Move, round: number) => {
  if (m.seconds) return m.seconds >= 120 ? `${Math.round(m.seconds / 60)} min` : `${m.seconds} sec`
  const n = m.reps[Math.min(round, m.reps.length - 1)] || m.reps[0]
  return `${n} reps${m.eachSide ? ' each side' : ''}`
}

function Media({ m, idx, tall }: { m?: Move; idx: number; tall?: boolean }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: tall ? '100%' : '100%', background: '#0B2E22' }}>
      {m?.videoUrl ? (
        <video src={m.videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      ) : m?.imageUrl || !m ? (
        <Image src={m?.imageUrl || FALLBACK[idx % FALLBACK.length]} alt={m?.name || ''} fill sizes="(max-width: 480px) 100vw, 480px" className="object-cover rw-photo" style={{ objectPosition: 'center 25%' }} priority />
      ) : (
        // No photo of THIS exact move yet → a calm panel, never a photo of a
        // different move (2026-10-29, Asa: "the exact workout picture").
        <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 40%, rgba(229,169,60,.16), transparent 70%), linear-gradient(170deg, #0B3B2B, #021F16 75%)' }} />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,.55) 0%, rgba(2,31,22,0) 25%, rgba(2,31,22,0) 60%, rgba(2,31,22,.95) 100%)' }} />
    </div>
  )
}

function Circles({ total, done, active }: { total: number; done: number; active: boolean }) {
  return (
    <div className="flex items-center gap-2" aria-label={`${done} of ${total} done`}>
      {Array.from({ length: total }, (_, k) => {
        const filled = k < done
        const current = k === done && active
        return (
          <span key={k} className={filled ? 'wf-fill' : ''} style={{
            width: 26, height: 26, borderRadius: 999, flexShrink: 0,
            background: filled ? GOLD : 'transparent',
            border: `2.5px solid ${filled ? GOLD : current ? INK : 'rgba(237,231,218,.3)'}`,
            boxShadow: current ? '0 0 0 4px rgba(237,231,218,.12)' : undefined,
          }} />
        )
      })}
    </div>
  )
}

export default function WorkoutFlow({ blocks, onFinish, onEffort, onProgress, onClose, menu }: {
  blocks: Block[]
  onFinish: () => void
  onEffort: (names: string[], effort: Effort, setIndex: number) => void
  onProgress?: (doneExercises: number, totalExercises: number) => void
  onClose: () => void
  menu?: ReactNode            // day switch / music / trained elsewhere, tucked behind "⋯"
}) {
  const [bi, setBi] = useState(0)
  const [round, setRound] = useState(0)        // circles filled on this screen
  const [phase, setPhase] = useState<'work' | 'rest'>('work')
  const [rest, setRest] = useState(0)
  const [asked, setAsked] = useState(false)    // Easy/Hard answered for this rest
  const [timer, setTimer] = useState<number | null>(null) // a timed move counting down
  const [menuOpen, setMenuOpen] = useState(false)
  const block = blocks[bi]
  const exercises = blocks.filter((b) => b.kind === 'exercise')
  const exNo = blocks.slice(0, bi + 1).filter((b) => b.kind === 'exercise').length
  const lastRound = block ? round + 1 >= block.rounds : true

  // Full screen: the page itself never scrolls mid-workout (the layout's
  // tab-bar padding below would otherwise peek in and push the top bar off).
  useEffect(() => {
    const el = document.documentElement
    const prev = el.style.overflow
    el.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    return () => { el.style.overflow = prev }
  }, [])

  // Phone stays awake mid-workout (she's not touching it between sets).
  useEffect(() => {
    type WL = { release: () => Promise<void> }
    let lock: WL | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WL> } }
    const grab = () => { if (document.visibilityState === 'visible') nav.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {}) }
    grab()
    document.addEventListener('visibilitychange', grab)
    return () => { document.removeEventListener('visibilitychange', grab); lock?.release().catch(() => {}) }
  }, [])

  useEffect(() => { onProgress?.(blocks.slice(0, bi).filter((b) => b.kind === 'exercise').length, exercises.length) }, [bi]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    if (bi + 1 >= blocks.length) { onFinish(); return }
    setBi(bi + 1); setRound(0); setPhase('work'); setTimer(null)
  }
  const nextRef = useRef(next)
  nextRef.current = next

  // After a rest: the next circle, or the next exercise after the last one.
  const afterRest = useRef<() => void>(() => {})
  afterRest.current = () => {
    hapticTap(60)
    setPhase('work'); setTimer(null)
    if (round >= (block?.rounds ?? 1)) { nextRef.current(); return }
    // Same timed move again: she's already in place, so its timer just
    // starts — one less tap mid-workout.
    const m = block?.moves[0]
    if (block && block.moves.length === 1 && m?.seconds) setTimer(m.seconds)
  }

  function done() {
    if (!block) return
    hapticTap(30)
    if (block.kind !== 'exercise') { next(); return }
    const filled = round + 1
    setRound(filled)
    setTimer(null)
    if (block.restSec > 0) {
      setRest(block.restSec); setAsked(false); setPhase('rest')
    } else if (filled >= block.rounds) next()
  }
  const doneRef = useRef(done)
  doneRef.current = done

  // Rest countdown — beeps the last 3 seconds, moves on by itself.
  useEffect(() => {
    if (phase !== 'rest') return
    const id = setInterval(() => {
      setRest((r) => {
        if (r <= 1) { clearInterval(id); setTimeout(() => afterRest.current(), 0); return 0 }
        if (r - 1 <= 3) playCountdownBeep(r - 1)
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, bi, round])

  // A timed move ("40 sec"): START runs it, zero counts as Done.
  useEffect(() => {
    if (timer == null || phase !== 'work') return
    const id = setInterval(() => {
      setTimer((t) => {
        if (t == null) return t
        if (t <= 1) { clearInterval(id); setTimeout(() => doneRef.current(), 0); return 0 }
        if (t - 1 <= 3) playCountdownBeep(t - 1)
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timer != null, phase, bi]) // eslint-disable-line react-hooks/exhaustive-deps

  function effort(e: Effort) {
    if (!block || asked) return
    hapticTap()
    setAsked(true)
    setRest((r) => Math.max(5, r + (e === 'hard' ? 20 : e === 'easy' ? -10 : 0)))
    onEffort(block.moves.map((m) => m.name), e, round - 1)
  }

  if (!block) return null
  const pair = block.moves.length > 1
  const single = block.moves[0]
  const timed = !pair && !!single?.seconds

  const top = (
    <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-4" style={{ paddingTop: 'calc(8px + env(safe-area-inset-top))' }}>
      <button onClick={onClose} aria-label="Close workout" className="nf-press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(2,31,22,.7)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <span className="rounded-full px-3.5 py-2" style={{ ...pill, fontSize: 12, background: 'rgba(2,31,22,.7)', color: INK }}>
        {block.kind === 'warmup' ? 'WARM-UP' : block.kind === 'cooldown' ? 'COOL-DOWN' : `EXERCISE ${exNo} OF ${exercises.length}`}
      </span>
      {menu ? (
        <button onClick={() => setMenuOpen((x) => !x)} aria-label="More" aria-expanded={menuOpen} className="nf-press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(2,31,22,.7)', color: INK, fontSize: 20, lineHeight: 1 }}>⋯</button>
      ) : <span className="w-11" />}
    </div>
  )
  const menuSheet = menu && menuOpen ? (
    <div className="absolute inset-x-4 z-30 rounded-[20px] p-3 flex flex-col gap-2" style={{ top: 'calc(62px + env(safe-area-inset-top))', background: 'rgba(2,31,22,.96)', border: '1px solid rgba(237,231,218,.14)' }}>{menu}</div>
  ) : null

  const style = <style>{`.wf-page{margin:0 -16px;height:100dvh;overflow:hidden;padding-bottom:env(safe-area-inset-bottom)}.wf-in{animation:wfIn .38s cubic-bezier(.2,1,.3,1) both}@keyframes wfIn{from{transform:translateX(48px);opacity:0}to{transform:none;opacity:1}}.wf-fill{animation:wfFill .35s ease}@keyframes wfFill{0%{transform:scale(.6)}60%{transform:scale(1.18)}100%{transform:scale(1)}}@media (prefers-reduced-motion: reduce){.wf-in,.wf-fill{animation:none}}`}</style>

  // ---------- warm-up / cool-down ----------
  if (block.kind !== 'exercise') {
    return (
      <div className="wf-page relative flex flex-col" style={{ color: INK }}>
        {style}{top}{menuSheet}
        <div className="relative flex-1 min-h-[180px]"><Media idx={bi} /></div>
        <div key={bi} className="wf-in shrink-0 flex flex-col gap-4 px-5 -mt-10 relative">
          <h1 className="nf-head" style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 52, lineHeight: 0.9, textTransform: 'uppercase' }}>
            {block.kind === 'warmup' ? 'Warm up first.' : 'Cool down.'}
          </h1>
          <ul className="flex flex-col gap-2 text-[17px] font-semibold" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {(block.lines || []).map((l, k) => <li key={k} className="flex gap-2.5"><span style={{ color: GOLD }}>•</span>{l}</li>)}
          </ul>
          <p className="text-[15px]" style={{ color: MUTE }}>{block.kind === 'warmup' ? 'Easy pace. Just get warm.' : 'Slow breaths. You earned this.'}</p>
        </div>
        <div className="px-5 pb-6 pt-4">
          <button onClick={done} className="rw-cta nf-press w-full h-16 rounded-full uppercase" style={{ ...pill, fontSize: 17, background: GOLD, color: BG }}>
            {block.kind === 'warmup' ? "I'm warm. Start" : 'Finish workout'}
          </button>
        </div>
      </div>
    )
  }

  // ---------- rest ----------
  if (phase === 'rest') {
    const finishedBlock = round >= block.rounds
    const upNext = finishedBlock ? blocks[bi + 1] : block
    const upName = upNext?.kind === 'exercise' ? upNext.moves.map((m) => m.name).join(' + ') : upNext?.kind === 'cooldown' ? 'Cool-down' : null
    return (
      <div className="wf-page relative flex flex-col px-5" style={{ color: INK, background: 'linear-gradient(170deg, #0B3B2B, #021F16 60%)' }}>
        {style}{top}{menuSheet}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center pt-16">
          <Circles total={block.rounds} done={round} active={false} />
          <span style={{ ...pill, fontSize: 12, color: MINT }}>{finishedBlock ? 'ALL SETS DONE' : `SET ${round} DONE`}</span>
          <span className="tabular-nums" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 104, lineHeight: 0.9, color: GOLD }}>{clock(rest)}</span>
          <span className="text-[16px]" style={{ color: MUTE }}>Breathe. {upName ? <>Next: <b style={{ color: INK }}>{upName}</b></> : 'Almost done.'}</span>
          {!asked ? (
            <div className="w-full flex flex-col gap-2.5 mt-2">
              <span className="text-[15px] font-semibold">How did that feel?</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={() => effort('easy')} className="nf-press h-16 rounded-2xl text-[18px] font-extrabold" style={{ background: 'rgba(30,227,138,.16)', border: `2px solid ${MINT}`, color: INK }}>Easy</button>
                <button onClick={() => effort('hard')} className="nf-press h-16 rounded-2xl text-[18px] font-extrabold" style={{ background: 'rgba(255,90,78,.14)', border: '2px solid #FF5A4E', color: INK }}>Hard</button>
              </div>
            </div>
          ) : (
            <span className="text-[14px]" style={{ color: MUTE }}>Got it. Rest set for you.</span>
          )}
        </div>
        <div className="pb-6 pt-4">
          <button onClick={() => { hapticTap(); afterRest.current() }} className="nf-press w-full h-14 rounded-full uppercase" style={{ ...pill, fontSize: 14, border: '2px solid rgba(237,231,218,.25)', color: INK }}>I&apos;m ready</button>
        </div>
      </div>
    )
  }

  // ---------- one exercise, or two back to back ----------
  return (
    <div className="wf-page relative flex flex-col" style={{ color: INK }}>
      {style}{top}{menuSheet}
      <div key={bi} className="wf-in flex-1 min-h-0 flex flex-col">
        {pair ? (
          <div className="flex flex-col flex-1 min-h-[240px]">
            {block.moves.map((m, k) => (
              <div key={k} className="relative flex-1 min-h-0" style={{ borderBottom: k < block.moves.length - 1 ? `2px solid ${BG}` : undefined }}>
                <Media m={m} idx={bi + k} />
                <div className="absolute left-4 right-4 bottom-2.5 flex items-end justify-between gap-3">
                  <span className="min-w-0" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: block.moves.length > 2 ? 22 : 28, lineHeight: 0.95, textTransform: 'uppercase' }}>
                    <span style={{ color: GOLD }}>{k + 1}.</span> {m.name}
                  </span>
                  <span className="shrink-0" style={{ ...pill, fontSize: 13, color: INK }}>{repText(m, round).toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative flex-1 min-h-[200px]"><Media m={single} idx={bi} /></div>
        )}

        <div className="shrink-0 flex flex-col gap-3.5 px-5 pt-4">
          {pair ? (
            <h1 className="nf-head" style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 40, lineHeight: 0.92, textTransform: 'uppercase' }}>Do these back to back.</h1>
          ) : (
            <h1 className="nf-head text-balance" style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: single.name.length > 24 ? 40 : 50, lineHeight: 0.9, textTransform: 'uppercase' }}>{single.name}</h1>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            <Circles total={block.rounds} done={round} active />
            <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 30, lineHeight: 1, color: GOLD, textTransform: 'uppercase' }}>
              {timed && timer != null ? clock(timer) : pair ? (block.rounds > 1 ? `Round ${round + 1} of ${block.rounds}` : 'One round') : repText(single, round)}
            </span>
          </div>
          {!pair && single.cue && <p className="text-[15px] leading-snug" style={{ color: MUTE, margin: 0 }}>{single.cue}</p>}
          {pair && <p className="text-[15px]" style={{ color: MUTE, margin: 0 }}>{block.restSec > 0 ? `Then rest ${block.restSec} seconds.` : 'Then you’re done.'}</p>}
        </div>

        <div className="px-5 pb-6 pt-4 flex flex-col gap-2">
          {timed && timer == null ? (
            <button onClick={() => { hapticTap(); setTimer(single.seconds!) }} className="rw-cta nf-press w-full rounded-full uppercase" style={{ ...pill, height: 76, fontSize: 19, background: GOLD, color: BG }}>Start</button>
          ) : (
            <button onClick={done} className="rw-cta nf-press w-full rounded-full uppercase" style={{ ...pill, height: 76, fontSize: 19, background: GOLD, color: BG }}>
              {lastRound && bi + 1 >= blocks.length ? 'Done. Finish' : 'Done'}
            </button>
          )}
          {/* Never the thing that finishes a workout (a skipped last step must not log "done"). */}
          {bi + 1 < blocks.length && (
            <button onClick={() => { hapticTap(); next() }} className="self-center text-[13px] underline underline-offset-4" style={{ color: 'rgba(237,231,218,.5)' }}>Skip this one</button>
          )}
        </div>
      </div>
    </div>
  )
}
