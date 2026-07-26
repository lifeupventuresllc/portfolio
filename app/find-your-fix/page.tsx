'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Blocker, Confidence, MovementDays, ScheduleType } from '@/lib/blocker-quiz'
import { SCHEDULE_LABEL } from '@/lib/blocker-quiz'

type Result = { blocker: Blocker; diagnosticSentence: string; priorityFirst?: Blocker }

// Reordered per Asa's own testing feedback: lead with the relatable/human
// questions (lifestyle, yo-yo dieting) before the more clinical ones — and
// "equipment" got cut entirely since it never fed the diagnosis or any
// copy, it was pure click friction with no payoff.
const STEPS = ['goal', 'weight', 'schedule', 'crashdiet', 'confidence', 'movement', 'plateau', 'contact']

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
  const [phase, setPhase] = useState<'quiz' | 'building' | 'done'>('quiz')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const go = (n: number) => { setDir(n > step ? 'fwd' : 'back'); setError(''); setStep(n) }
  const next = () => go(step + 1)
  const back = () => go(Math.max(0, step - 1))
  const pick = (k: string, v: string) => { set(k, v); setTimeout(next, 160) }

  const total = STEPS.length
  const pct = Math.round(((step + 1) / total) * 100)
  const firstName = f.name.trim().split(' ')[0]

  async function submit() {
    if (!f.email || !f.weightLbs) { setError("I just need your weight and email to find your fix."); return }
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
      if (data.success) { setResult(data); setPhase('done') }
      else { setError(data.error || 'Something went wrong.'); setPhase('quiz') }
    } catch { setError('Something went wrong. Try again.'); setPhase('quiz') }
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
  const secondaryBtn = 'w-full bg-charcoal border border-gold/40 text-gold px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-300 hover:bg-gold/10'

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

  if (phase === 'done' && result) {
    return (
      <div className="min-h-screen bg-obsidian px-4 py-16">
        <div className="max-w-lg mx-auto text-center q-in-fwd">
          <p className="luf-pop text-4xl mb-3">🎉</p>
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">
            {firstName ? `Nice work, ${firstName}` : 'Nice work'} — your fix is found
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {result.blocker === 'nutrition' && "It's nutrition."}
            {result.blocker === 'movement' && "It's movement."}
            {result.blocker === 'both' && "It's both — and that's okay."}
          </h1>
          <p className="text-ivory/50 text-sm mb-6">
            Most women never figure this part out — you just did, in under a minute. That&apos;s the hard part done.
          </p>
          <div className="bg-charcoal border border-gold/30 rounded-2xl p-6 mb-6 text-left">
            <p className="text-ivory/80 text-sm leading-relaxed">{result.diagnosticSentence}</p>
          </div>

          {result.blocker === 'movement' && (
            <>
              <p className="text-ivory/60 text-sm mb-5">Matched for {SCHEDULE_LABEL[f.schedule as ScheduleType] || 'your schedule'} — no gym guesswork. It&apos;s yours right now, no more waiting.</p>
              <a href="/downloads/lifestyle-workout-guide.pdf" download
                className={`${primaryBtn} inline-block text-center`}>⬇ Download My Lifestyle-Fit Workout Guide</a>
            </>
          )}

          {result.blocker === 'nutrition' && (
            <>
              <p className="text-ivory/60 text-sm mb-5">Your Craving Swap Guide is waiting — you&apos;ll get it the moment you get your numbers.</p>
              <button onClick={() => goToBlueprint(['craving-swap'])} className={primaryBtn}>Get My Exact Numbers →</button>
            </>
          )}

          {result.blocker === 'both' && (
            <div className="space-y-3 mb-2">
              <p className="text-ivory/60 text-sm mb-2">No waiting on this one — matched for {SCHEDULE_LABEL[f.schedule as ScheduleType] || 'your schedule'}, yours right now:</p>
              <a href="/downloads/lifestyle-workout-guide.pdf" download
                className={`${primaryBtn} inline-block text-center`}>⬇ Download My Lifestyle-Fit Workout Guide</a>
              <p className="text-ivory/40 text-xs pt-2">Then, whenever you&apos;re ready — your exact calorie numbers + Craving Swap Guide:</p>
              <button onClick={() => goToBlueprint(['craving-swap'])} className={secondaryBtn}>Get My Exact Numbers →</button>
            </div>
          )}

          <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1608] to-charcoal border border-gold/30 rounded-3xl p-8 mt-8 text-center">
            <span className="inline-block text-gold text-[10px] font-bold tracking-[0.25em] uppercase mb-4 border border-gold/40 rounded-full px-3 py-1 bg-gold/5">Free For 14 Days</span>
            <h3 className="text-white text-2xl font-black uppercase tracking-tight mb-2 text-balance">You now know your fix.</h3>
            <p className="text-ivory/60 text-sm mb-5 leading-relaxed">The Life-Up Fitness app builds your whole plan around it — meals, workouts, daily check-ins, all the decisions made for you.</p>
            <a href="/challenge" className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:-translate-y-1">
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

          {s === 'weight' && (<>
            <Q>What&apos;s your current weight?</Q>
            <Hint>Just a ballpark — this stays private.</Hint>
            <input autoFocus type="number" value={f.weightLbs} onChange={(e) => set('weightLbs', e.target.value)} placeholder="150" className={`${input} mb-6`}
              onKeyDown={(e) => e.key === 'Enter' && f.weightLbs && next()} />
            <button onClick={next} disabled={!f.weightLbs} className={primaryBtn}>Continue →</button>
          </>)}

          {s === 'schedule' && (<>
            <Q>What&apos;s your daily life like?</Q>
            <Hint>Pick whichever fits closest — this is the fun part.</Hint>
            <div className="space-y-3">
              {[
                { v: 'single_mom', l: '👩🏽‍👧 Single mom, always on' },
                { v: 'desk_job', l: '💻 Desk job' },
                { v: 'shift_work', l: '🛍️ Retail/service, shift work' },
                { v: 'nurse_teacher', l: '🩺 Nursing or teaching schedule' },
                { v: 'other', l: '📅 Something else' },
              ].map((o) => (
                <button key={o.v} onClick={() => pick('schedule', o.v)} className={opt(f.schedule === o.v)}>{o.l}</button>
              ))}
            </div>
          </>)}

          {s === 'crashdiet' && (<>
            <Q>Real talk — you ever crash-dieted or yo-yo dieted before?</Q>
            <Hint>Be honest. Almost everyone has — this just changes what your body actually needs right now.</Hint>
            <div className="space-y-3">
              <button onClick={() => pick('crashDietHistory', 'yes')} className={opt(f.crashDietHistory === 'yes')}>Yes, more than once</button>
              <button onClick={() => pick('crashDietHistory', 'no')} className={opt(f.crashDietHistory === 'no')}>No, not really</button>
            </div>
          </>)}

          {s === 'confidence' && (<>
            <Q>Do you feel confident in what and how much to eat?</Q>
            <Hint>Be honest — there&apos;s no wrong answer here.</Hint>
            <div className="space-y-3">
              {[{ v: 'confident', l: '✅ Yes, I have that handled' }, { v: 'unsure', l: '🤔 Somewhat, but I\'m not sure' }, { v: 'confusing', l: '😩 No, it\'s genuinely confusing' }].map((o) => (
                <button key={o.v} onClick={() => pick('confidence', o.v)} className={opt(f.confidence === o.v)}>{o.l}</button>
              ))}
            </div>
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

          {s === 'plateau' && (<>
            <Q>Have you changed your eating but not seen the scale move?</Q>
            <Hint>A real plateau, not just a rough week.</Hint>
            <div className="space-y-3">
              <button onClick={() => pick('plateau', 'yes')} className={opt(f.plateau === 'yes')}>Yes</button>
              <button onClick={() => pick('plateau', 'no')} className={opt(f.plateau === 'no')}>No</button>
            </div>
          </>)}

          {s === 'contact' && (<>
            <Q>Last thing — where should I send your fix?</Q>
            <Hint>Your result + matched guide land here too.</Hint>
            <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Your first name" className={`${input} mb-3`} />
            <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="Your email" className={`${input} mb-3`} />
            <input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone (optional)" className={`${input} mb-6`} />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button onClick={submit} className={primaryBtn}>🎯 Find My Fix</button>
          </>)}
        </div>
      </div>
    </div>
  )
}
