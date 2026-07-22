'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CountUp from '@/components/CountUp'

type Targets = { calories: number; protein_g: number; carbs_g: number; fats_g: number; bmr: number; tdee: number }

const INJURIES = [
  { v: 'knee', l: 'Knee' }, { v: 'lower_back', l: 'Lower back' }, { v: 'shoulder', l: 'Shoulder' },
  { v: 'wrist', l: 'Wrist' }, { v: 'elbow', l: 'Elbow' }, { v: 'hip', l: 'Hip' }, { v: 'ankle', l: 'Ankle' },
]

// One warm question per screen. Same data as before — just effortless.
export default function ConversationalIntake() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')
  const [f, setF] = useState({
    name: '', goal: '', age: '', sex: 'female', heightFt: '5', heightIn: '4', weight_lbs: '',
    target_lbs: '', activity_level: '', experience_level: '', training_location: '',
    days_per_week: '', cook_days_per_week: '', weekly_food_budget: '', food_preferences: '', dislikes_allergies: '',
  })
  const [injuries, setInjuries] = useState<string[]>([])
  const [phase, setPhase] = useState<'quiz' | 'building' | 'done'>('quiz')
  const [targets, setTargets] = useState<Targets | null>(null)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const go = (n: number) => { setDir(n > step ? 'fwd' : 'back'); setError(''); setStep(n) }
  const next = () => go(step + 1)
  const back = () => go(Math.max(0, step - 1))
  const toggleInjury = (v: string) => setInjuries((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]))

  // choosing a single-select option auto-advances (that "texting a coach" feel)
  const pick = (k: string, v: string) => { set(k, v); setTimeout(next, 160) }

  const firstName = f.name.trim().split(' ')[0] || 'you'

  const STEPS = [
    'name', 'goal', 'body', 'target', 'activity', 'experience', 'location', 'days', 'cook', 'injuries', 'food',
  ]
  const total = STEPS.length
  const pct = Math.round(((step + 1) / total) * 100)

  async function build() {
    if (!f.age || !f.weight_lbs) { setError('I just need your age and weight to get your numbers right.'); return }
    setPhase('building')
    setError('')
    try {
      const height_in = Number(f.heightFt) * 12 + Number(f.heightIn)
      const start = Date.now()
      const res = await fetch('/api/challenge/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, age: Number(f.age), sex: f.sex, height_in, weight_lbs: Number(f.weight_lbs),
          goal: f.goal || 'lose', target_lbs: Number(f.target_lbs) || null,
          activity_level: f.activity_level || 'moderate', experience_level: f.experience_level || 'beginner',
          training_location: f.training_location || 'gym', days_per_week: Number(f.days_per_week) || 3,
          cook_days_per_week: Number(f.cook_days_per_week) || 2, weekly_food_budget: Number(f.weekly_food_budget) || null,
          food_preferences: f.food_preferences, dislikes_allergies: f.dislikes_allergies,
          injuries, injuries_limitations: '',
        }),
      })
      const data = await res.json()
      // let the "building" moment breathe for at least ~2.2s
      const wait = Math.max(0, 2200 - (Date.now() - start))
      await new Promise((r) => setTimeout(r, wait))
      if (data.success) { setTargets(data.targets); setPhase('done') }
      else { setError(data.error || 'Something went wrong.'); setPhase('quiz') }
    } catch { setError('Something went wrong. Try again.'); setPhase('quiz') }
  }

  // ---------- shared UI ----------
  const Screen = ({ children }: { children: React.ReactNode }) => (
    <div key={step} className={dir === 'fwd' ? 'q-in-fwd' : 'q-in-back'}>{children}</div>
  )
  const Q = ({ children }: { children: React.ReactNode }) => <h2 className="text-2xl sm:text-3xl font-bold text-ink leading-snug mb-1">{children}</h2>
  const Hint = ({ children }: { children: React.ReactNode }) => <p className="text-ink/60 text-sm mb-7">{children}</p>
  const opt = (active: boolean) => `w-full text-left px-5 py-4 rounded-2xl border font-semibold transition-all duration-200 ${active ? 'bg-gold/15 border-gold scale-[1.01] text-ink' : 'bg-charcoal border-smoke hover:border-gold/50 hover:bg-charcoal/70 text-white'}`
  const input = 'w-full px-4 py-3.5 bg-obsidian border border-smoke rounded-xl text-white focus:outline-none focus:border-gold transition-colors'
  const primaryBtn = 'w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-[1.02] disabled:opacity-40'

  // ---------- BUILDING moment ----------
  if (phase === 'building') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="text-center q-in-fwd">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" style={{ animationDuration: '0.9s' }} />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">💪🏽</div>
          </div>
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">One moment</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-2">Coach Asa is building your plan…</h1>
          <p className="text-ink/60 text-sm">Crunching your numbers, matching your workout, and setting up your meals for {firstName}.</p>
        </div>
      </div>
    )
  }

  // ---------- DONE / reveal ----------
  if (phase === 'done' && targets) {
    return (
      <div className="min-h-screen bg-paper px-4 py-16">
        <div className="max-w-lg mx-auto text-center q-in-fwd">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">Your plan is ready</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-3">Let&apos;s do this, {firstName} 🎉</h1>
          <p className="text-ink/60 text-sm mb-8">I built your numbers, generated your workout, and set up your meal budget. Here&apos;s your daily target:</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { l: 'Daily calories', v: targets.calories, c: 'text-gold' },
              { l: 'Protein', v: targets.protein_g, s: 'g', c: 'text-green-400' },
              { l: 'Carbs', v: targets.carbs_g, s: 'g', c: 'text-white' },
              { l: 'Fats', v: targets.fats_g, s: 'g', c: 'text-white' },
            ].map((t) => (
              <div key={t.l} className="bg-charcoal border border-smoke rounded-2xl p-5">
                <p className="text-ivory/40 text-xs uppercase tracking-wider mb-1">{t.l}</p>
                <p className={`text-3xl font-bold ${t.c}`}><CountUp value={t.v} suffix={t.s || ''} /></p>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/plan')} className={primaryBtn}>See my plan</button>
          <p className="text-gold text-sm font-semibold mt-4">— Coach Asa</p>
        </div>
      </div>
    )
  }

  // ---------- QUIZ ----------
  const s = STEPS[step]
  return (
    <div className="min-h-screen bg-paper px-4 py-8 flex flex-col">
      {/* progress */}
      <div className="max-w-lg w-full mx-auto mb-8">
        <div className="flex items-center gap-3">
          {step > 0 ? <button onClick={back} className="text-ink/50 hover:text-gold text-sm">←</button> : <span className="w-3" />}
          <div className="flex-1 h-1.5 bg-charcoal rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-ink/50 text-xs tabular-nums">{step + 1}/{total}</span>
        </div>
      </div>

      <div className="max-w-lg w-full mx-auto flex-1">
        <Screen>
          {s === 'name' && (<>
            <Q>First — what should I call you?</Q>
            <Hint>I coach you by name, not by number.</Hint>
            <input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Your first name" className={input}
              onKeyDown={(e) => e.key === 'Enter' && f.name.trim() && next()} />
            <button onClick={next} disabled={!f.name.trim()} className={`${primaryBtn} mt-6`}>Let&apos;s go →</button>
          </>)}

          {s === 'goal' && (<>
            <Q>What are we doing together, {firstName}?</Q>
            <Hint>Pick the one that&apos;s calling your name.</Hint>
            <div className="space-y-3">
              {[{ v: 'lose', l: '🔥 Lose fat', d: 'Lean out, keep your curves' }, { v: 'gain', l: '💪🏽 Build & tone', d: 'Add shape and strength' }, { v: 'maintain', l: '⚖️ Maintain', d: 'Hold steady, feel great' }].map((o) => (
                <button key={o.v} onClick={() => pick('goal', o.v)} className={opt(f.goal === o.v)}>
                  <span className="block">{o.l}</span><span className={`block text-xs font-normal mt-0.5 ${f.goal === o.v ? 'text-ink/60' : 'text-ivory/40'}`}>{o.d}</span>
                </button>
              ))}
            </div>
          </>)}

          {s === 'body' && (<>
            <Q>Tell me about your body.</Q>
            <Hint>This dials in your exact calories — no guessing.</Hint>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="text-ink/50 text-xs uppercase tracking-wider mb-1 block">Age</label><input type="number" value={f.age} onChange={(e) => set('age', e.target.value)} className={input} /></div>
              <div><label className="text-ink/50 text-xs uppercase tracking-wider mb-1 block">Weight (lbs)</label><input type="number" value={f.weight_lbs} onChange={(e) => set('weight_lbs', e.target.value)} className={input} /></div>
            </div>
            <label className="text-ink/50 text-xs uppercase tracking-wider mb-1 block">Height</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select value={f.heightFt} onChange={(e) => set('heightFt', e.target.value)} className={input}>{[4, 5, 6].map((n) => <option key={n} value={n}>{n} ft</option>)}</select>
              <select value={f.heightIn} onChange={(e) => set('heightIn', e.target.value)} className={input}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i} in</option>)}</select>
            </div>
            <label className="text-ink/50 text-xs uppercase tracking-wider mb-1 block">Sex (for your metabolism math)</label>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[{ v: 'female', l: 'Female' }, { v: 'male', l: 'Male' }].map((o) => <button key={o.v} onClick={() => set('sex', o.v)} className={`py-3 rounded-xl text-sm font-semibold ${f.sex === o.v ? 'bg-gold/15 text-ink border border-gold/40' : 'bg-charcoal border border-smoke text-ivory/60'}`}>{o.l}</button>)}
            </div>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button onClick={() => { if (!f.age || !f.weight_lbs) { setError('Add your age and weight so I can nail your numbers.'); return } next() }} className={primaryBtn}>Continue →</button>
          </>)}

          {s === 'target' && (<>
            <Q>How much are we {f.goal === 'gain' ? 'building' : 'shifting'}?</Q>
            <Hint>Ballpark is perfect — we adjust as you go.</Hint>
            <div className="space-y-3">
              {[{ v: '10', l: '5–10 lbs' }, { v: '15', l: '10–15 lbs' }, { v: '20', l: '15+ lbs' }, { v: '', l: "Not sure — you tell me" }].map((o) => (
                <button key={o.l} onClick={() => pick('target_lbs', o.v)} className={opt(f.target_lbs === o.v)}>{o.l}</button>
              ))}
            </div>
          </>)}

          {s === 'activity' && (<>
            <Q>How active is your day, outside workouts?</Q>
            <Hint>Desk job vs. always-on-your-feet changes your calories.</Hint>
            <div className="space-y-3">
              {[{ v: 'sedentary', l: 'Mostly sitting', d: 'Desk job, little movement' }, { v: 'light', l: 'Lightly active', d: 'Some walking day to day' }, { v: 'moderate', l: 'On my feet a lot', d: 'Moving most of the day' }, { v: 'active', l: 'Very active', d: 'Physical job / lots of steps' }].map((o) => (
                <button key={o.v} onClick={() => pick('activity_level', o.v)} className={opt(f.activity_level === o.v)}>
                  <span className="block">{o.l}</span><span className={`block text-xs font-normal mt-0.5 ${f.activity_level === o.v ? 'text-ink/60' : 'text-ivory/40'}`}>{o.d}</span>
                </button>
              ))}
            </div>
          </>)}

          {s === 'experience' && (<>
            <Q>Where are you at with training?</Q>
            <Hint>No wrong answer — I meet you exactly where you are.</Hint>
            <div className="space-y-3">
              {[{ v: 'beginner', l: '🌱 Beginner', d: 'New or getting back into it' }, { v: 'intermediate', l: '💫 Intermediate', d: "I know my way around" }, { v: 'advanced', l: '🔥 Advanced', d: 'Been training a while' }].map((o) => (
                <button key={o.v} onClick={() => pick('experience_level', o.v)} className={opt(f.experience_level === o.v)}>
                  <span className="block">{o.l}</span><span className={`block text-xs font-normal mt-0.5 ${f.experience_level === o.v ? 'text-ink/60' : 'text-ivory/40'}`}>{o.d}</span>
                </button>
              ))}
            </div>
          </>)}

          {s === 'location' && (<>
            <Q>Where will you train?</Q>
            <Hint>I&apos;ll build your workouts to fit your setup.</Hint>
            <div className="space-y-3">
              {[{ v: 'gym', l: '🏋🏽 Gym' }, { v: 'home', l: '🏠 Home' }, { v: 'both', l: '🔀 Both' }].map((o) => (
                <button key={o.v} onClick={() => pick('training_location', o.v)} className={opt(f.training_location === o.v)}>{o.l}</button>
              ))}
            </div>
          </>)}

          {s === 'days' && (<>
            <Q>How many days a week can you train?</Q>
            <Hint>Be honest — consistency beats intensity.</Hint>
            <div className="grid grid-cols-3 gap-3">
              {['3', '4', '5', '6'].map((d) => (
                <button key={d} onClick={() => pick('days_per_week', d)} className={`py-6 rounded-2xl border text-2xl font-bold ${f.days_per_week === d ? 'bg-gold/15 text-ink border-gold' : 'bg-charcoal border-smoke text-white hover:border-gold/50'}`}>{d}</button>
              ))}
            </div>
          </>)}

          {s === 'cook' && (<>
            <Q>How many days do you want to cook?</Q>
            <Hint>Cook once and I&apos;ll stretch it, or cook fresh more often — your call.</Hint>
            <div className="space-y-3">
              {[{ v: '1', l: '1 day', d: 'Cook once, eat all week' }, { v: '2', l: '2 days', d: 'The sweet spot — always fresh' }, { v: '3', l: '3 days', d: 'Max variety' }].map((o) => (
                <button key={o.v} onClick={() => pick('cook_days_per_week', o.v)} className={opt(f.cook_days_per_week === o.v)}>
                  <span className="block">{o.l}</span><span className={`block text-xs font-normal mt-0.5 ${f.cook_days_per_week === o.v ? 'text-ink/60' : 'text-ivory/40'}`}>{o.d}</span>
                </button>
              ))}
            </div>
          </>)}

          {s === 'injuries' && (<>
            <Q>Anything I should train around?</Q>
            <Hint>Tap any that apply — I&apos;ll route your workout around them. (None is totally fine.)</Hint>
            <div className="flex flex-wrap gap-2 mb-7">
              {INJURIES.map((i) => (
                <button key={i.v} onClick={() => toggleInjury(i.v)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${injuries.includes(i.v) ? 'bg-gold/15 text-ink border border-gold/40' : 'bg-charcoal border border-smoke text-ivory/60'}`}>{i.l}</button>
              ))}
            </div>
            <button onClick={next} className={primaryBtn}>{injuries.length ? 'Continue →' : 'None — continue →'}</button>
          </>)}

          {s === 'food' && (<>
            <Q>Last thing — let&apos;s make the food *yours*.</Q>
            <Hint>Optional, but it&apos;s how I build meals you actually crave.</Hint>
            <label className="text-ink/50 text-xs uppercase tracking-wider mb-1 block">Foods you love</label>
            <input value={f.food_preferences} onChange={(e) => set('food_preferences', e.target.value)} placeholder="e.g. chicken, rice bowls, tacos" className={`${input} mb-3`} />
            <label className="text-ink/50 text-xs uppercase tracking-wider mb-1 block">Dislikes / allergies</label>
            <input value={f.dislikes_allergies} onChange={(e) => set('dislikes_allergies', e.target.value)} placeholder="e.g. no mushrooms, dairy-free" className={`${input} mb-3`} />
            <label className="text-ink/50 text-xs uppercase tracking-wider mb-1 block">Weekly food budget ($)</label>
            <input type="number" value={f.weekly_food_budget} onChange={(e) => set('weekly_food_budget', e.target.value)} placeholder="e.g. 90" className={`${input} mb-6`} />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button onClick={build} className={primaryBtn}>✨ Build my plan</button>
          </>)}
        </Screen>
      </div>
    </div>
  )
}
