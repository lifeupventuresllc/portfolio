'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Blocker, Confidence, Diagnosis, MovementDays, ScheduleType } from '@/lib/blocker-quiz'
import { SCHEDULE_LABEL, diagnose } from '@/lib/blocker-quiz'
import { trackQuizEvent } from '@/lib/quiz-track'
import EmojiConfetti from '@/components/EmojiConfetti'

type Result = { blocker: Blocker; diagnosticSentence: string; priorityFirst?: Blocker }

// Cut from 8 screens to 4 + a contact screen, per DM-funnel drop-off analysis:
// the "60 second" promise in outreach copy didn't match an 8-tap quiz.
// - 'goal' and 'movement' stay standalone (single, fast taps, each a real signal).
// - 'weight' + 'schedule' merged into 'stats' — schedule never feeds diagnose(),
//   it's only cosmetic copy on the result, so it doesn't need its own screen.
// - 'confidence' + 'crashdiet' + 'plateau' merged into 'eating' — all three feed
//   the nutrition-blocker signal together, so answering them as one cluster
//   ("your relationship with food") reads more natural than 3 separate taps.
// - 'equipment' stayed cut (never fed the diagnosis, pure friction).
// - 'contact' is no longer a quiz step at all — see the 'teaser' phase below.
const STEPS = ['goal', 'stats', 'eating', 'movement']

// Module-level, NOT defined inside the component — a component defined inside a
// render function gets a new identity every render, which makes React unmount +
// remount its whole subtree on every keystroke (any input inside loses focus the
// instant it isn't the one field with autoFocus). Real bug found via live testing:
// the contact step's name/email fields silently truncated to one character because
// of exactly this.
const Q = ({ children }: { children: React.ReactNode }) => <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-1">{children}</h2>
const Hint = ({ children }: { children: React.ReactNode }) => <p className="text-ivory/60 text-sm mb-7">{children}</p>

// Handed off via sessionStorage, NEVER a URL param — her name/email/phone are
// personal data and don't belong in a query string (browser history, referrer
// headers, etc). Read once by /blueprint on mount, then cleared.
const HANDOFF_KEY = 'luf_quiz_handoff'

export default function FindYourFix() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')
  const [f, setF] = useState({
    goal: 'lose' as 'lose' | 'gain',
    weightLbs: '',
    confidence: '' as Confidence | '',
    movementDays: '' as MovementDays | '',
    schedule: '' as ScheduleType | '',
    plateau: '' as 'yes' | 'no' | '',
    crashDietHistory: '' as 'yes' | 'no' | '',
    name: '', email: '', phone: '',
  })
  // 'teaser' = instant directional result shown right after the last question,
  // computed client-side from diagnose() (pure fn, no backend needed) — BEFORE
  // any contact info is asked for. 'contact' = the actual email/phone ask,
  // framed as unlocking the full plan. Backend delivery (submit(), below) is
  // unchanged — only its position in the flow moved.
  const [phase, setPhase] = useState<'quiz' | 'teaser' | 'contact' | 'building' | 'done'>('quiz')
  const [teaserDiagnosis, setTeaserDiagnosis] = useState<Diagnosis | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    if (phase === 'done') setCelebrate(true)
  }, [phase])

  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    trackQuizEvent('quiz_started')
  }, [])

  useEffect(() => {
    if (phase === 'quiz') trackQuizEvent('step_reached', { step, stepName: STEPS[step] })
    if (phase === 'teaser') trackQuizEvent('teaser_shown')
  }, [phase, step])

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const go = (n: number) => { setDir(n > step ? 'fwd' : 'back'); setError(''); setStep(n) }
  const next = () => {
    if (step + 1 >= STEPS.length) {
      const d = diagnose({
        goal: f.goal, weightLbs: Number(f.weightLbs), confidence: f.confidence as Confidence,
        movementDays: f.movementDays as MovementDays, schedule: f.schedule as ScheduleType,
        plateau: f.plateau === 'yes', crashDietHistory: f.crashDietHistory === 'yes',
      })
      setTeaserDiagnosis(d)
      setPhase('teaser')
      return
    }
    go(step + 1)
  }
  const back = () => go(Math.max(0, step - 1))
  const pick = (k: string, v: string) => { set(k, v); setTimeout(next, 160) }

  const total = STEPS.length
  const pct = Math.round(((step + 1) / total) * 100)
  const firstName = f.name.trim().split(' ')[0]
  const blockerWord = teaserDiagnosis?.blocker === 'nutrition' ? 'nutrition'
    : teaserDiagnosis?.blocker === 'movement' ? 'movement' : 'nutrition + movement'

  async function submit() {
    if (!f.email || !f.weightLbs) { setError("I just need your email to send your fix."); return }
    trackQuizEvent('contact_submitted', { metadata: { email: f.email, hasPhone: !!f.phone } })
    setPhase('building')
    setError('')
    try {
      const res = await fetch('/api/find-your-fix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, email: f.email, phone: f.phone, goal: f.goal, weightLbs: Number(f.weightLbs),
          confidence: f.confidence, movementDays: f.movementDays,
          schedule: f.schedule, plateau: f.plateau === 'yes', crashDietHistory: f.crashDietHistory === 'yes',
        }),
      })
      const data = await res.json()
      const wait = 1400
      await new Promise((r) => setTimeout(r, wait))
      if (data.success) {
        trackQuizEvent('quiz_completed', { metadata: { email: f.email, blocker: data.blocker } })
        setResult(data); setPhase('done')
      } else { setError(data.error || 'Something went wrong.'); setPhase('contact') }
    } catch { setError('Something went wrong. Try again.'); setPhase('contact') }
  }

  // She already told us her name/email/phone/weight/goal here — the Blueprint
  // form should never make her retype any of it. Bundle is craving-swap only
  // now for the "both" case, since the workout guide is already handed to her
  // immediately on this page, no need to gate it behind the blueprint too.
  function goToBlueprint(bundle: string[]) {
    try {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({
        name: f.name, email: f.email, phone: f.phone, weightLbs: f.weightLbs, goal: f.goal, bundle,
      }))
    } catch { /* noop — worst case she retypes on the blueprint form */ }
    router.push('/blueprint?fromQuiz=1')
  }

  const opt = (active: boolean) => `w-full text-left px-5 py-4 rounded-2xl border font-semibold transition-all duration-200 ${active ? 'bg-charcoal bg-gradient-to-br from-gold/20 to-charcoal border-gold scale-[1.01] text-gold' : 'bg-charcoal border-smoke hover:border-gold/50 hover:bg-charcoal/70 text-white'}`
  const input = 'w-full px-4 py-3.5 bg-obsidian border border-smoke rounded-xl text-white focus:outline-none focus:border-gold transition-colors'
  const primaryBtn = 'w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-[1.02] disabled:opacity-40'

  if (phase === 'building') {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center px-6">
        <div className="text-center q-in-fwd">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" style={{ animationDuration: '0.9s' }} />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🎯</div>
          </div>
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">One moment</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Finding your fix…</h1>
          <p className="text-ivory/60 text-sm">Figuring out exactly what&apos;s been stalling you.</p>
        </div>
      </div>
    )
  }

  if (phase === 'teaser' && teaserDiagnosis) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full mx-auto text-center q-in-fwd">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">Your Fix, Found</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-[1.05]">
            {teaserDiagnosis.blocker === 'nutrition' && "It's likely nutrition."}
            {teaserDiagnosis.blocker === 'movement' && "It's likely movement."}
            {teaserDiagnosis.blocker === 'both' && "It's likely both."}
          </h1>
          <div className="bg-charcoal border border-gold/30 rounded-2xl p-7 mb-8 text-left">
            <p className="text-ivory/90 text-base leading-relaxed">{teaserDiagnosis.diagnosticSentence}</p>
          </div>
          <button onClick={() => setPhase('contact')} className={primaryBtn}>Unlock My Full Plan + Free Guide →</button>
        </div>
      </div>
    )
  }

  if (phase === 'contact') {
    return (
      <div className="min-h-screen bg-obsidian px-4 py-16 flex flex-col justify-center">
        <div className="max-w-lg w-full mx-auto q-in-fwd">
          <Q>Last thing — where should I send it?</Q>
          <Hint>Enter your email + number so I can send your full {blockerWord} plan, plus your free guide.</Hint>
          <input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Your first name" className={`${input} mb-3`} />
          <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="Your email" className={`${input} mb-3`} />
          <input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone (optional)" className={`${input} mb-6`} />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button onClick={submit} disabled={!f.email} className={primaryBtn}>🎯 Unlock My Full Plan</button>
        </div>
      </div>
    )
  }

  if (phase === 'done' && result) {
    const bigDownloadBtn = 'w-full bg-gold text-obsidian px-8 py-6 font-black text-lg uppercase tracking-wide rounded-3xl transition-all duration-300 hover:scale-[1.03] shadow-[0_0_50px_-10px_rgba(201,168,76,0.5)]'
    return (
      <div className="min-h-screen bg-obsidian px-4 py-16">
        <EmojiConfetti fire={celebrate} onDone={() => setCelebrate(false)} />
        <div className="max-w-lg mx-auto text-center q-in-fwd">
          <p className="luf-pop text-6xl mb-4">🎉</p>
          <p className="text-gold text-sm font-bold tracking-[0.25em] uppercase mb-4">
            {firstName ? `Nice work, ${firstName}` : 'Nice work'} — your fix is found
          </p>
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-5 leading-[1.05]">
            {result.blocker === 'nutrition' && "It's nutrition."}
            {result.blocker === 'movement' && "It's movement."}
            {result.blocker === 'both' && "It's both — and that's okay."}
          </h1>
          <p className="text-ivory/60 text-base mb-7">
            Most women never figure this part out — you just did, in under a minute. That&apos;s the hard part done.
          </p>
          <div className="bg-charcoal border border-gold/30 rounded-2xl p-7 mb-7 text-left">
            <p className="text-ivory/90 text-base leading-relaxed">{result.diagnosticSentence}</p>
          </div>

          {result.blocker === 'movement' && (
            <>
              <p className="text-gold text-2xl font-black mb-1">🎁 Yours, Free.</p>
              <p className="text-ivory/60 text-base mb-5">Matched for {SCHEDULE_LABEL[f.schedule as ScheduleType] || 'your schedule'} — no gym guesswork.</p>
              <a href="/downloads/lifestyle-workout-guide.pdf" download
                className={`${bigDownloadBtn} inline-block text-center`}>⬇ Download My Lifestyle-Fit Workout Guide</a>
            </>
          )}

          {result.blocker === 'nutrition' && (
            <>
              <p className="text-gold text-2xl font-black mb-1">🎁 Yours, Free.</p>
              <p className="text-ivory/60 text-base mb-5">Your cravings guide, matched to what&apos;s actually been stalling you:</p>
              <a href="/downloads/craving-swap-guide.pdf" download
                className={`${bigDownloadBtn} inline-block text-center`}>⬇ Download My Craving Swap Guide</a>
              <div className="pt-4">
                <button onClick={() => goToBlueprint([])} className={bigDownloadBtn}>🚨 Breaking: Your Body&apos;s Blueprint →</button>
                <p className="text-gold text-base font-bold mt-3">👉 Click here to get your free calorie tracker — built just for you. Don&apos;t skip this part, it&apos;s what finally tells you exactly what to eat, every day.</p>
              </div>
            </>
          )}

          {result.blocker === 'both' && (
            <div className="space-y-4 mb-2">
              <p className="text-gold text-2xl font-black mb-1">🎁 Both, Yours, Free.</p>
              <p className="text-ivory/60 text-base mb-2">Matched for {SCHEDULE_LABEL[f.schedule as ScheduleType] || 'your schedule'}:</p>
              <a href="/downloads/lifestyle-workout-guide.pdf" download
                className={`${bigDownloadBtn} inline-block text-center`}>⬇ Download My Lifestyle-Fit Workout Guide</a>
              <a href="/downloads/craving-swap-guide.pdf" download
                className={`${bigDownloadBtn} inline-block text-center`}>⬇ Download My Craving Swap Guide</a>
              <div className="pt-4">
                <button onClick={() => goToBlueprint([])} className={bigDownloadBtn}>🚨 Breaking: Your Body&apos;s Blueprint →</button>
                <p className="text-gold text-base font-bold mt-3">👉 Click here to get your free calorie tracker — built just for you. Don&apos;t skip this part, it&apos;s what finally tells you exactly what to eat, every day.</p>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1608] to-charcoal border border-gold/20 rounded-2xl p-5 mt-8 text-center">
            <span className="inline-block text-gold text-[9px] font-bold tracking-[0.2em] uppercase mb-2 border border-gold/40 rounded-full px-2.5 py-0.5 bg-gold/5">Free For 14 Days</span>
            <h3 className="text-white text-base font-bold mb-1 text-balance">You now know your fix.</h3>
            <p className="text-ivory/50 text-xs mb-3 leading-relaxed">The Life-Up Fitness app builds your whole plan around it — meals, workouts, daily check-ins, all decided for you.</p>
            <a href="/challenge" className="inline-block bg-gold text-obsidian px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105">
              Start free for 14 days →
            </a>
          </div>
        </div>
      </div>
    )
  }

  const s = STEPS[step]
  return (
    <div className="min-h-screen bg-obsidian px-4 py-8 flex flex-col">
      <div className="max-w-lg w-full mx-auto mb-8">
        <div className="flex items-center gap-3">
          {step > 0 ? <button onClick={back} className="text-ivory/50 hover:text-gold text-sm">←</button> : <span className="w-3" />}
          <div className="flex-1 h-1.5 bg-charcoal rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-ivory/50 text-xs tabular-nums">{step + 1}/{total}</span>
        </div>
      </div>

      <div className="max-w-lg w-full mx-auto flex-1">
        <div key={step} className={dir === 'fwd' ? 'q-in-fwd' : 'q-in-back'}>
          {s === 'goal' && (<>
            <Q>What&apos;s the goal?</Q>
            <Hint>Find Your Fix — 60 seconds to know exactly what&apos;s stalling you.</Hint>
            <div className="space-y-3">
              {[{ v: 'lose', l: '🔥 Lose 10-15 lbs' }, { v: 'gain', l: '💪🏽 Gain 10-15 lbs' }].map((o) => (
                <button key={o.v} onClick={() => pick('goal', o.v)} className={opt(f.goal === o.v)}>{o.l}</button>
              ))}
            </div>
          </>)}

          {s === 'stats' && (<>
            <Q>Just a couple quick facts</Q>
            <Hint>This shapes your exact plan.</Hint>
            <input autoFocus type="number" value={f.weightLbs} onChange={(e) => set('weightLbs', e.target.value)} placeholder="Current weight (lbs)" className={`${input} mb-5`} />
            <p className="text-ivory/70 text-xs font-bold uppercase tracking-wider mb-3">What&apos;s your daily life like?</p>
            <div className="space-y-2 mb-6">
              {[
                { v: 'single_mom', l: '👩🏽‍👧 Single mom, always on' },
                { v: 'desk_job', l: '💻 Desk job' },
                { v: 'shift_work', l: '🛍️ Retail/service, shift work' },
                { v: 'nurse_teacher', l: '🩺 Nursing or teaching schedule' },
                { v: 'other', l: '📅 Something else' },
              ].map((o) => (
                <button key={o.v} onClick={() => set('schedule', o.v)} className={opt(f.schedule === o.v)}>{o.l}</button>
              ))}
            </div>
            <button onClick={next} disabled={!f.weightLbs || !f.schedule} className={primaryBtn}>Continue →</button>
          </>)}

          {s === 'eating' && (<>
            <Q>Your relationship with food</Q>
            <Hint>Be honest — there&apos;s no wrong answer, it just shapes your plan.</Hint>

            <p className="text-ivory/70 text-xs font-bold uppercase tracking-wider mb-2">Confident in what &amp; how much to eat?</p>
            <div className="space-y-2 mb-5">
              {[{ v: 'confident', l: '✅ Yes, I have that handled' }, { v: 'unsure', l: '🤔 Somewhat, but I\'m not sure' }, { v: 'confusing', l: '😩 No, it\'s genuinely confusing' }].map((o) => (
                <button key={o.v} onClick={() => set('confidence', o.v)} className={opt(f.confidence === o.v)}>{o.l}</button>
              ))}
            </div>

            <p className="text-ivory/70 text-xs font-bold uppercase tracking-wider mb-2">Ever crash- or yo-yo dieted?</p>
            <div className="flex gap-2 mb-5">
              <button onClick={() => set('crashDietHistory', 'yes')} className={`${opt(f.crashDietHistory === 'yes')} flex-1 text-center`}>Yes</button>
              <button onClick={() => set('crashDietHistory', 'no')} className={`${opt(f.crashDietHistory === 'no')} flex-1 text-center`}>No</button>
            </div>

            <p className="text-ivory/70 text-xs font-bold uppercase tracking-wider mb-2">Changed your eating but the scale hasn&apos;t moved?</p>
            <div className="flex gap-2 mb-6">
              <button onClick={() => set('plateau', 'yes')} className={`${opt(f.plateau === 'yes')} flex-1 text-center`}>Yes</button>
              <button onClick={() => set('plateau', 'no')} className={`${opt(f.plateau === 'no')} flex-1 text-center`}>No</button>
            </div>

            <button onClick={next} disabled={!f.confidence || !f.crashDietHistory || !f.plateau} className={primaryBtn}>Continue →</button>
          </>)}

          {s === 'movement' && (<>
            <Q>How many days a week do you intentionally move your body?</Q>
            <Hint>Walks, workouts, anything intentional.</Hint>
            <div className="space-y-3">
              {[{ v: 'low', l: '0-2 days' }, { v: 'mid', l: '3-4 days' }, { v: 'high', l: '5+ days' }].map((o) => (
                <button key={o.v} onClick={() => pick('movementDays', o.v)} className={opt(f.movementDays === o.v)}>{o.l}</button>
              ))}
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}
