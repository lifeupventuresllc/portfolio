'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CountUp from '@/components/CountUp'
import { hapticTap } from '@/lib/haptics'
import { createClient } from '@/lib/supabase/client'

type Targets = { calories: number; protein_g: number; carbs_g: number; fats_g: number; bmr: number; tdee: number }

const INJURIES = [
  { v: 'knee', l: 'Knee' }, { v: 'lower_back', l: 'Lower back' }, { v: 'shoulder', l: 'Shoulder' },
  { v: 'wrist', l: 'Wrist' }, { v: 'elbow', l: 'Elbow' }, { v: 'hip', l: 'Hip' }, { v: 'ankle', l: 'Ankle' },
]

const FOCUS_AREAS = [
  { v: 'core', l: 'Core & waistline', d: 'Flatter stomach, defined middle' },
  { v: 'legs', l: 'Legs & glutes', d: 'Lift, shape, and strengthen' },
  { v: 'arms', l: 'Arms & back', d: 'Tone and define upper body' },
  { v: 'overall', l: 'All-over', d: 'Balanced, head to toe' },
]

// Simple illustrated body silhouette, highlighting the zone each option shapes.
// Not real photography (no assets exist for that yet) — but gives a real visual
// cue instead of just an emoji, matching the competitor pattern of showing her
// what she's choosing rather than just naming it.
function BodyFocusIcon({ zone }: { zone: 'core' | 'legs' | 'arms' | 'overall' }) {
  const on = (part: string) => (zone === 'overall' || zone === part ? '#C9A84C' : 'rgba(10,10,15,0.10)')
  return (
    <svg viewBox="0 0 100 160" width="56" height="90" aria-hidden="true">
      <circle cx="50" cy="16" r="13" fill="rgba(10,10,15,0.10)" />
      <rect x="14" y="34" width="15" height="50" rx="7" fill={on('arms')} />
      <rect x="71" y="34" width="15" height="50" rx="7" fill={on('arms')} />
      <rect x="32" y="32" width="36" height="52" rx="11" fill={on('core')} />
      <rect x="33" y="86" width="15" height="62" rx="7" fill={on('legs')} />
      <rect x="52" y="86" width="15" height="62" rx="7" fill={on('legs')} />
    </svg>
  )
}

// Required tier: the minimum to get her a real plan fast (name, goal, focus, body).
// Everything else is a second, optional pass she's invited into AFTER she's already
// seen her numbers — not a wall she has to clear before experiencing anything.
const REQUIRED_STEPS = ['name', 'goal', 'focus', 'body']
const OPTIONAL_STEPS = [
  'target', 'activity', 'experience', 'training_style', 'location', 'days', 'cook', 'injuries', 'other', 'postpartum', 'food',
]

// One warm question per screen. Same data as before — just effortless, and
// the deep questions come after her first win instead of before it.
export default function ConversationalIntake() {
  return (
    <Suspense fallback={null}>
      <ConversationalIntakeInner />
    </Suspense>
  )
}

function ConversationalIntakeInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const startInOptional = searchParams.get('tier') === 'optional'

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  const [tier, setTier] = useState<'required' | 'optional'>(startInOptional ? 'optional' : 'required')
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')
  const [f, setF] = useState({
    name: '', goal: '', focus_area: '', age: '', sex: 'female', heightFt: '5', heightIn: '4', weight_lbs: '',
    target_lbs: '', activity_level: '', experience_level: '', training_location: '',
    days_per_week: '', cook_days_per_week: '', weekly_food_budget: '', food_preferences: '', dislikes_allergies: '',
    postpartum: '', training_style: '', other_info: '',
  })
  const [injuries, setInjuries] = useState<string[]>([])
  const [phase, setPhase] = useState<'quiz' | 'building' | 'done'>('quiz')
  const [targets, setTargets] = useState<Targets | null>(null)
  const [error, setError] = useState('')
  const [carriedFromBlueprint, setCarriedFromBlueprint] = useState(false)

  // Seamless blueprint→app conversion — if she already did the free Calorie Blueprint,
  // pull her answers forward instead of making her retype her name/age/height/weight/goal.
  useEffect(() => {
    if (startInOptional) return // she already has a plan — nothing to prefill
    fetch('/api/plan/blueprint-lookup').then((r) => r.json()).then((d) => {
      if (!d?.found || !d.blueprint) return
      const b = d.blueprint
      const ACTIVITY_MAP: Record<string, string> = { none: 'sedentary', sedentary: 'sedentary', light: 'light', moderate: 'moderate', active: 'active', very_active: 'active' }
      setF((s) => ({
        ...s,
        name: b.name || s.name,
        age: b.age ? String(b.age) : s.age,
        sex: b.sex || s.sex,
        heightFt: b.height_in ? String(Math.floor(b.height_in / 12)) : s.heightFt,
        heightIn: b.height_in ? String(b.height_in % 12) : s.heightIn,
        weight_lbs: b.weight_lbs ? String(b.weight_lbs) : s.weight_lbs,
        target_lbs: b.goal_weight_lbs ? String(b.goal_weight_lbs) : s.target_lbs,
        goal: b.goal || s.goal,
        activity_level: ACTIVITY_MAP[b.activity] || s.activity_level,
        days_per_week: b.workout_days ? String(b.workout_days) : s.days_per_week,
      }))
      setCarriedFromBlueprint(true)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))

  // Each question fully remounts on step change (for the slide transition), which
  // kills focus and closes her keyboard — a bare `autoFocus` prop on a remounted
  // element isn't reliably honored by mobile browsers (they're stricter about
  // auto-popping the keyboard outside a direct tap), so she was having to manually
  // tap every single field, every step. Re-focusing explicitly after the transition
  // settles is the fix that actually works on real phones.
  const primaryInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const t = setTimeout(() => primaryInputRef.current?.focus(), 420) // just after the .38s slide-in animation
    return () => clearTimeout(t)
  }, [step, tier])

  const go = (n: number) => { setDir(n > step ? 'fwd' : 'back'); setError(''); setStep(n) }
  const next = () => go(step + 1)
  const back = () => go(Math.max(0, step - 1))
  const toggleInjury = (v: string) => setInjuries((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]))

  // choosing a single-select option auto-advances (that "texting a coach" feel)
  const pick = (k: string, v: string) => { hapticTap(); set(k, v); setTimeout(next, 160) }

  const firstName = f.name.trim().split(' ')[0] || 'you'

  const STEPS = tier === 'required' ? REQUIRED_STEPS : OPTIONAL_STEPS
  const total = STEPS.length
  const pct = Math.round(((step + 1) / total) * 100)

  async function build(refining: boolean) {
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
          goal: f.goal || 'lose', target_lbs: Number(f.target_lbs) || null, focus_area: f.focus_area || 'overall',
          activity_level: f.activity_level || 'moderate', experience_level: f.experience_level || 'beginner',
          training_location: f.training_location || 'gym', days_per_week: Number(f.days_per_week) || 3,
          cook_days_per_week: Number(f.cook_days_per_week) || 2, weekly_food_budget: Number(f.weekly_food_budget) || null,
          food_preferences: f.food_preferences, dislikes_allergies: f.dislikes_allergies,
          injuries, injuries_limitations: '', postpartum: f.postpartum === 'yes',
          training_style: f.training_style || 'none', other_info: f.other_info,
          refining,
        }),
      })
      const data = await res.json()
      // let the "building" moment breathe for at least ~2.2s (skip the pause on a quiet refine)
      const wait = refining ? 0 : Math.max(0, 2200 - (Date.now() - start))
      await new Promise((r) => setTimeout(r, wait))
      if (data.success) {
        setTargets(data.targets)
        if (refining) router.push('/plan')
        else setPhase('done')
      } else { setError(data.error || 'Something went wrong.'); setPhase('quiz') }
    } catch { setError('Something went wrong. Try again.'); setPhase('quiz') }
  }

  function startOptionalTier() {
    setTier('optional'); setDir('fwd'); setError(''); setStep(0); setPhase('quiz')
  }

  // ---------- shared UI (dark — used by the optional second-pass + building/done chrome it shares) ----------
  const Screen = ({ children }: { children: React.ReactNode }) => (
    <div key={step} className={dir === 'fwd' ? 'q-in-fwd' : 'q-in-back'}>{children}</div>
  )
  const Q = ({ children }: { children: React.ReactNode }) => <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-1">{children}</h2>
  const Hint = ({ children }: { children: React.ReactNode }) => <p className="text-ivory/60 text-sm mb-7">{children}</p>
  const opt = (active: boolean) => `w-full text-left px-5 py-4 rounded-2xl border font-semibold transition-all duration-200 ${active ? 'bg-charcoal bg-gradient-to-br from-gold/20 to-charcoal border-gold scale-[1.01] text-gold' : 'bg-charcoal border-smoke hover:border-gold/50 hover:bg-charcoal/70 text-white'}`
  const input = 'w-full px-4 py-3.5 bg-obsidian border border-smoke rounded-xl text-white focus:outline-none focus:border-gold transition-colors'
  const primaryBtn = 'w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-[1.02] disabled:opacity-40'

  // ---------- shared UI (light — the new required-tier, spacious/minimal, "one thing at a time") ----------
  const LQ = ({ children }: { children: React.ReactNode }) => <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-snug mb-2 text-balance">{children}</h2>
  const LHint = ({ children }: { children: React.ReactNode }) => <p className="text-ink/50 text-base mb-10">{children}</p>
  const lopt = (active: boolean) => `w-full text-left px-6 py-5 rounded-3xl border transition-all duration-200 ${active ? 'bg-white border-gold shadow-[0_8px_30px_rgba(201,168,76,0.14)] scale-[1.01] text-ink' : 'bg-white border-ink/10 hover:border-gold/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-ink'}`
  const linput = 'w-full px-5 py-4 bg-white border border-ink/15 rounded-2xl text-ink text-lg placeholder-ink/30 focus:outline-none focus:border-gold transition-colors'
  const lPrimaryBtn = 'w-full bg-gold text-obsidian px-8 py-5 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-40'

  // ---------- BUILDING moment ----------
  if (phase === 'building') {
    const light = tier === 'required'
    return (
      <div className={`min-h-[100dvh] flex items-center justify-center px-6 ${light ? 'bg-paper' : 'bg-obsidian'}`}>
        <div className="text-center q-in-fwd">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className={`absolute inset-0 rounded-full border-2 ${light ? 'border-gold/25' : 'border-gold/20'}`} />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" style={{ animationDuration: '0.9s' }} />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">💪🏽</div>
          </div>
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">One moment</p>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${light ? 'text-ink' : 'text-white'}`}>
            {tier === 'optional' ? 'Fine-tuning your plan…' : 'Coach Asa is building your plan…'}
          </h1>
          <p className={light ? 'text-ink/50 text-sm' : 'text-ivory/60 text-sm'}>Crunching your numbers, matching your workout, and setting up your meals for {firstName}.</p>
        </div>
      </div>
    )
  }

  // ---------- DONE / reveal (light — this is the reward moment, stays part of the same light experience) ----------
  if (phase === 'done' && targets) {
    return (
      <div className="min-h-[100dvh] bg-paper px-4 py-16">
        <div className="max-w-lg mx-auto text-center q-in-fwd">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">Your plan is ready</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-3">Let&apos;s do this, {firstName} 🎉</h1>
          <p className="text-ink/50 text-sm mb-8">I built your numbers, generated your workout, and set up your meal budget. Here&apos;s your daily target:</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { l: 'Daily calories', v: targets.calories, c: 'text-gold' },
              { l: 'Protein', v: targets.protein_g, s: 'g', c: 'text-emerald-600' },
              { l: 'Carbs', v: targets.carbs_g, s: 'g', c: 'text-ink' },
              { l: 'Fats', v: targets.fats_g, s: 'g', c: 'text-ink' },
            ].map((t) => (
              <div key={t.l} className="bg-white border border-ink/10 rounded-3xl p-5">
                <p className="text-ink/35 text-xs uppercase tracking-wider mb-1">{t.l}</p>
                <p className={`text-3xl font-bold ${t.c}`}><CountUp value={t.v} suffix={t.s || ''} /></p>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/plan')} className={lPrimaryBtn}>See my plan</button>
          <button onClick={startOptionalTier} className="w-full mt-3 text-ink/50 text-sm font-semibold hover:text-gold transition-colors">
            Fine-tune it for you — 60 seconds →
          </button>
          <p className="text-gold text-sm font-semibold mt-5">— Coach Asa</p>
        </div>
      </div>
    )
  }

  // ---------- REQUIRED TIER (light, spacious, one thing at a time) ----------
  if (tier === 'required') {
    const s = REQUIRED_STEPS[step]
    return (
      <div className="min-h-[100dvh] bg-paper px-4 py-10 flex flex-col">
        <div className="max-w-md w-full mx-auto mb-12">
          <div className="flex items-center gap-3">
            {step > 0 ? <button onClick={back} className="text-ink/40 hover:text-gold text-sm">←</button> : <span className="w-3" />}
            <div className="flex-1 h-1 bg-ink/8 rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-ink/30 text-xs tabular-nums">{step + 1}/{total}</span>
            <button onClick={handleSignOut} className="text-ink/30 hover:text-gold text-xs whitespace-nowrap">Sign out</button>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto flex-1">
          {carriedFromBlueprint && step === 0 && (
            <p className="text-emerald-600 text-xs font-semibold mb-4">🎉 Pulled in your info from your Calorie Blueprint — just confirm as you go.</p>
          )}
          <Screen>
            {s === 'name' && (<>
              <LQ>First — what should I call you?</LQ>
              <LHint>I coach you by name, not by number.</LHint>
              <input ref={primaryInputRef} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Your first name" className={linput}
                autoCorrect="off" autoCapitalize="words" spellCheck={false}
                onKeyDown={(e) => e.key === 'Enter' && f.name.trim() && next()} />
              <button onClick={next} disabled={!f.name.trim()} className={`${lPrimaryBtn} mt-8`}>Let&apos;s go →</button>
            </>)}

            {s === 'goal' && (<>
              <LQ>What are we doing together, {firstName}?</LQ>
              <LHint>Pick the one that&apos;s calling your name.</LHint>
              <div className="space-y-3">
                {[{ v: 'lose', l: '🔥 Lose fat', d: 'Lean out, keep your curves' }, { v: 'gain', l: '💪🏽 Build & tone', d: 'Add shape and strength' }, { v: 'maintain', l: '⚖️ Maintain', d: 'Hold steady, feel great' }].map((o) => (
                  <button key={o.v} onClick={() => pick('goal', o.v)} className={lopt(f.goal === o.v)}>
                    <span className="block text-lg">{o.l}</span><span className="block text-sm font-normal mt-0.5 text-ink/40">{o.d}</span>
                  </button>
                ))}
              </div>
            </>)}

            {s === 'focus' && (<>
              <LQ>What do you want to feel proudest of?</LQ>
              <LHint>This shapes how I weight your workout — no wrong answer.</LHint>
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_AREAS.map((o) => (
                  <button key={o.v} onClick={() => pick('focus_area', o.v)} className={`${lopt(f.focus_area === o.v)} !text-center flex flex-col items-center`}>
                    <BodyFocusIcon zone={o.v as 'core' | 'legs' | 'arms' | 'overall'} />
                    <span className="block text-base font-semibold mt-2">{o.l}</span><span className="block text-xs font-normal mt-1 text-ink/40">{o.d}</span>
                  </button>
                ))}
              </div>
            </>)}

            {s === 'body' && (<>
              <LQ>Tell me about your body.</LQ>
              <LHint>This dials in your exact calories — no guessing.</LHint>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="text-ink/40 text-xs uppercase tracking-wider mb-1 block">Age</label><input ref={primaryInputRef} type="number" inputMode="numeric" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={f.age} onChange={(e) => set('age', e.target.value)} className={linput} /></div>
                <div><label className="text-ink/40 text-xs uppercase tracking-wider mb-1 block">Weight (lbs)</label><input type="number" inputMode="numeric" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={f.weight_lbs} onChange={(e) => set('weight_lbs', e.target.value)} className={linput} /></div>
              </div>
              <label className="text-ink/40 text-xs uppercase tracking-wider mb-1 block">Height</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select value={f.heightFt} onChange={(e) => set('heightFt', e.target.value)} className={linput}>{[4, 5, 6].map((n) => <option key={n} value={n}>{n} ft</option>)}</select>
                <select value={f.heightIn} onChange={(e) => set('heightIn', e.target.value)} className={linput}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i} in</option>)}</select>
              </div>
              <label className="text-ink/40 text-xs uppercase tracking-wider mb-1 block">Gender (for your metabolism math)</label>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {[{ v: 'female', l: 'Female' }, { v: 'male', l: 'Male' }].map((o) => <button key={o.v} onClick={() => { hapticTap(); set('sex', o.v) }} className={`py-3.5 rounded-2xl text-sm font-semibold border transition-colors ${f.sex === o.v ? 'bg-white border-gold text-ink' : 'bg-white border-ink/10 text-ink/50'}`}>{o.l}</button>)}
              </div>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <button onClick={() => { if (!f.age || !f.weight_lbs) { setError('Add your age and weight so I can nail your numbers.'); return } build(false) }} className={lPrimaryBtn}>✨ Build my plan</button>
            </>)}
          </Screen>
        </div>
      </div>
    )
  }

  // ---------- OPTIONAL TIER (dark — back into the regular app experience) ----------
  const s = OPTIONAL_STEPS[step]
  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-8 flex flex-col">
      {/* progress */}
      <div className="max-w-lg w-full mx-auto mb-8">
        <div className="flex items-center gap-3">
          {step > 0 ? <button onClick={back} className="text-ivory/50 hover:text-gold text-sm">←</button> : <span className="w-3" />}
          <div className="flex-1 h-1.5 bg-charcoal rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-ivory/50 text-xs tabular-nums">{step + 1}/{total}</span>
          <button onClick={handleSignOut} className="text-ivory/40 hover:text-gold text-xs whitespace-nowrap">Sign out</button>
        </div>
      </div>

      <div className="max-w-lg w-full mx-auto flex-1">
        <Screen>
          {s === 'target' && (() => {
            const delta = f.target_lbs ? Number(f.target_lbs) : 10
            const startW = Number(f.weight_lbs) || 0
            const goalW = f.goal === 'gain' ? startW + delta : startW - delta
            return (<>
              <Q>How much are we {f.goal === 'gain' ? 'building' : 'shifting'}?</Q>
              <Hint>Drag to your number — ballpark is perfect, we adjust as you go.</Hint>
              <div className="flex items-center justify-between mb-5">
                <div className="text-center">
                  <p className="text-ivory/40 text-[10px] uppercase tracking-wider mb-1">Now</p>
                  <p className="text-white text-2xl font-bold tabular-nums">{startW || '—'}</p>
                </div>
                <div className="flex-1 mx-4 h-1.5 bg-charcoal rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full transition-all duration-150" style={{ width: `${Math.min(100, (delta / 40) * 100)}%` }} />
                </div>
                <div className="text-center">
                  <p className="text-gold text-[10px] uppercase tracking-wider mb-1">Goal</p>
                  <p className="text-gold text-2xl font-bold tabular-nums">{startW ? goalW : '—'}</p>
                </div>
              </div>
              <input
                type="range" min={5} max={40} step={1} value={delta}
                onChange={(e) => { hapticTap(6); set('target_lbs', e.target.value) }}
                className="w-full accent-gold mb-2"
              />
              <p className="text-center text-ivory/50 text-sm mb-8">{delta} lbs {f.goal === 'gain' ? 'to build' : 'to lose'}</p>
              <button onClick={next} className={primaryBtn}>Continue →</button>
              <button onClick={() => { set('target_lbs', ''); next() }} className="w-full text-center text-ivory/40 text-xs mt-4 hover:text-gold transition-colors">Not sure — you tell me →</button>
            </>)
          })()}

          {s === 'activity' && (<>
            <Q>How active is your day, outside workouts?</Q>
            <Hint>Desk job vs. always-on-your-feet changes your calories.</Hint>
            <div className="space-y-3">
              {[{ v: 'sedentary', l: 'Mostly sitting', d: 'Desk job, little movement' }, { v: 'light', l: 'Lightly active', d: 'Some walking day to day' }, { v: 'moderate', l: 'On my feet a lot', d: 'Moving most of the day' }, { v: 'active', l: 'Very active', d: 'Physical job / lots of steps' }].map((o) => (
                <button key={o.v} onClick={() => pick('activity_level', o.v)} className={opt(f.activity_level === o.v)}>
                  <span className="block">{o.l}</span><span className={`block text-xs font-normal mt-0.5 ${f.activity_level === o.v ? 'text-gold/70' : 'text-ivory/40'}`}>{o.d}</span>
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
                  <span className="block">{o.l}</span><span className={`block text-xs font-normal mt-0.5 ${f.experience_level === o.v ? 'text-gold/70' : 'text-ivory/40'}`}>{o.d}</span>
                </button>
              ))}
            </div>
          </>)}

          {s === 'training_style' && (<>
            <Q>What&apos;s your training style?</Q>
            <Hint>This shapes how I build your finisher — no wrong answer.</Hint>
            <div className="space-y-3">
              {[
                { v: 'compound', l: '🔗 Full body / compound movements', d: 'Moves that work multiple muscles each rep' },
                { v: 'split', l: '🎯 Split / one muscle group at a time', d: 'Focused, isolated work per day' },
                { v: 'cardio', l: '🏃🏽 Cardio-first', d: 'Heart rate up, calorie burn' },
                { v: 'none', l: '🤷🏽 No strong preference', d: "I'll trust your programming" },
              ].map((o) => (
                <button key={o.v} onClick={() => pick('training_style', o.v)} className={opt(f.training_style === o.v)}>
                  <span className="block">{o.l}</span><span className={`block text-xs font-normal mt-0.5 ${f.training_style === o.v ? 'text-gold/70' : 'text-ivory/40'}`}>{o.d}</span>
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
                <button key={d} onClick={() => pick('days_per_week', d)} className={`py-6 rounded-2xl border text-2xl font-bold ${f.days_per_week === d ? 'bg-charcoal bg-gradient-to-br from-gold/20 to-charcoal text-gold border-gold' : 'bg-charcoal border-smoke text-white hover:border-gold/50'}`}>{d}</button>
              ))}
            </div>
          </>)}

          {s === 'cook' && (<>
            <Q>How many days do you want to cook?</Q>
            <Hint>Cook once and I&apos;ll stretch it, or cook fresh more often — your call.</Hint>
            <div className="space-y-3">
              {[{ v: '1', l: '1 day', d: 'Cook once, eat all week' }, { v: '2', l: '2 days', d: 'The sweet spot — always fresh' }, { v: '3', l: '3 days', d: 'Max variety' }].map((o) => (
                <button key={o.v} onClick={() => pick('cook_days_per_week', o.v)} className={opt(f.cook_days_per_week === o.v)}>
                  <span className="block">{o.l}</span><span className={`block text-xs font-normal mt-0.5 ${f.cook_days_per_week === o.v ? 'text-gold/70' : 'text-ivory/40'}`}>{o.d}</span>
                </button>
              ))}
            </div>
          </>)}

          {s === 'injuries' && (<>
            <Q>Anything I should train around?</Q>
            <Hint>Tap any that apply — I&apos;ll route your workout around them. (None is totally fine.)</Hint>
            <div className="flex flex-wrap gap-2 mb-7">
              {INJURIES.map((i) => (
                <button key={i.v} onClick={() => toggleInjury(i.v)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${injuries.includes(i.v) ? 'bg-charcoal bg-gradient-to-br from-gold/20 to-charcoal text-gold border border-gold/40' : 'bg-charcoal border border-smoke text-ivory/60'}`}>{i.l}</button>
              ))}
            </div>
            <button onClick={next} className={primaryBtn}>{injuries.length ? 'Continue →' : 'None — continue →'}</button>
          </>)}

          {s === 'other' && (<>
            <Q>Anything else I should know?</Q>
            <Hint>Totally optional — schedule quirks, past experience, whatever&apos;s on your mind.</Hint>
            <textarea
              value={f.other_info} onChange={(e) => set('other_info', e.target.value)}
              placeholder="e.g. I travel for work every other week, I've done this before and it didn't stick because..."
              rows={4} className={`${input} resize-none mb-6`}
            />
            <button onClick={next} className={primaryBtn}>{f.other_info.trim() ? 'Continue →' : 'Nothing — continue →'}</button>
          </>)}

          {s === 'postpartum' && (<>
            <Q>Are you currently postpartum?</Q>
            <Hint>If you are, I&apos;ll prioritize gentler, postpartum-friendly core work in your plan.</Hint>
            <div className="space-y-3">
              <button onClick={() => pick('postpartum', 'yes')} className={opt(f.postpartum === 'yes')}>Yes</button>
              <button onClick={() => pick('postpartum', 'no')} className={opt(f.postpartum === 'no')}>No</button>
            </div>
          </>)}

          {s === 'food' && (<>
            <Q>Last thing — let&apos;s make the food *yours*.</Q>
            <Hint>Optional, but it&apos;s how I build meals you actually crave.</Hint>
            <label className="text-ivory/50 text-xs uppercase tracking-wider mb-1 block">Foods you love</label>
            <input ref={primaryInputRef} value={f.food_preferences} onChange={(e) => set('food_preferences', e.target.value)} placeholder="e.g. chicken, rice bowls, tacos" className={`${input} mb-3`} autoCorrect="off" spellCheck={false} />
            <label className="text-ivory/50 text-xs uppercase tracking-wider mb-1 block">Dislikes / allergies</label>
            <input value={f.dislikes_allergies} onChange={(e) => set('dislikes_allergies', e.target.value)} placeholder="e.g. no mushrooms, dairy-free" className={`${input} mb-3`} autoCorrect="off" spellCheck={false} />
            <label className="text-ivory/50 text-xs uppercase tracking-wider mb-1 block">Weekly food budget ($)</label>
            <input type="number" inputMode="numeric" value={f.weekly_food_budget} onChange={(e) => set('weekly_food_budget', e.target.value)} placeholder="e.g. 90" className={`${input} mb-6`} autoCorrect="off" autoCapitalize="off" spellCheck={false} />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button onClick={() => build(true)} className={primaryBtn}>✨ Update my plan</button>
          </>)}
        </Screen>
      </div>
    </div>
  )
}
