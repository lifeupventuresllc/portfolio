'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { weekTemplate, DAY_SHORT, type TrainStyle } from '@/lib/week-template'
import { hapticTap } from '@/lib/haptics'
import LiveMap from '@/components/LiveMap'
import { buildBlueprint, averageDayTargets, type Activity } from '@/lib/nutrition'
import { effectiveGoal } from '@/lib/goals'

// New intake (2026-10-25, Asa's pick after the INTVL-style mockup:
// claude.ai/artifact/8nWTw2aTT3UH44q6cwddDp). Dark, one thing per screen,
// big slanted headlines, slide-or-tap answers, her calorie number building
// live at the top. Women only, 18+. Only what her plan truly needs:
// name + why → goal → body (+ pregnant/nursing) → her days → where/how often
// → anything hurt → food intro (6s) → never foods → how she eats + weekly
// money → location → build → reveal.

export type LifeStage = 'none' | 'pregnant' | 'nursing'
type Form = Record<string, string>

export const C = { bg: '#021F16', card: 'rgba(237,231,218,.06)', line: 'rgba(237,231,218,.16)', ink: '#EDE7DA', mute: 'rgba(237,231,218,.72)', gold: '#E5A93C' }
export const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
export const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
export const BODY = "var(--font-inter), Inter, system-ui, sans-serif"
// The raw photos are 1–2.6 MB — serve them through Next's image optimizer
// (resized + compressed) so they show instantly as backgrounds.
const img = (src: string) => `url(/_next/image?url=${encodeURIComponent(src)}&w=1080&q=70)`
const PHOTOS = ['/images/onboarding/name-step.jpg', '/images/onboarding/goal-lose.jpg', '/images/onboarding/goal-gain.jpg', '/images/onboarding/goal-maintain.jpg', '/images/meals/food/bowl.jpg']
// The plan layout pads every page for the tab bar, which the intake hides —
// pull that space back so the dark screen runs to the bottom edge.
const FULL = { marginBottom: 'calc(-4.5rem - env(safe-area-inset-bottom))' }

const STEPS = ['name', 'goal', 'body', 'days', 'train', 'hurts', 'foodintro', 'never', 'eat', 'location'] as const
type Step = typeof STEPS[number]
// Questions left after this one, shown top right ("9 LEFT").
const LEFT: Partial<Record<Step, number>> = { name: 9, goal: 8, body: 7, days: 6, train: 5, hurts: 4, never: 3, eat: 2, location: 1 }

const WHYS = [
  { v: 'energy', l: 'My energy' }, { v: 'kids', l: 'My kids' }, { v: 'mood', l: 'My mood' },
  { v: 'health', l: 'My health' }, { v: 'look', l: 'How I look' }, { v: 'confidence', l: 'Confidence' },
]
const GOALS = [
  { v: 'lose', l: 'Lose fat', d: 'Lean out, keep your curves', img: '/images/onboarding/goal-lose.jpg', pos: 'center 25%' },
  { v: 'gain', l: 'Build & tone', d: 'Shape and strength', img: '/images/onboarding/goal-gain.jpg', pos: 'center 20%' },
  { v: 'maintain', l: 'Maintain', d: 'Hold steady, feel great', img: '/images/onboarding/goal-maintain.jpg', pos: 'center 45%' },
]
const DAYS = [
  { v: 'sedentary', l: 'Mostly sitting', d: 'Desk, car, couch', icon: 'desk' },
  { v: 'light', l: 'Lightly active', d: 'Some walking', icon: 'walk' },
  { v: 'moderate', l: 'On my feet', d: 'Kids, retail, nursing', icon: 'shoe' },
  { v: 'active', l: 'Very active', d: 'Hard, physical work', icon: 'bolt' },
]
const SPOTS = [{ v: 'home', l: 'Home' }, { v: 'both', l: 'Both' }, { v: 'gym', l: 'Gym' }]
// How she likes to train (2026-10-30) — sets her whole week (lib/week-template.ts).
const STYLES: { v: string; l: string; d: string; t: TrainStyle }[] = [
  { v: 'compound', l: 'Full body', d: 'Big moves, every day', t: 'full' },
  { v: 'split', l: 'One area', d: 'Legs day, arms day', t: 'split' },
  { v: 'none', l: 'You pick', d: 'Best for my days', t: 'auto' },
]
const HURTS = [
  { v: 'knee', l: 'Knee' }, { v: 'lower_back', l: 'Lower back' }, { v: 'shoulder', l: 'Shoulder' }, { v: 'hip', l: 'Hip' },
  { v: 'wrist', l: 'Wrist' }, { v: 'elbow', l: 'Elbow' }, { v: 'ankle', l: 'Ankle' },
]
// Each chip's word is what the meal picker matches on (lib/escape-plan.ts
// parseDietaryRestrictions + lib/meal-pick.ts dislike words).
export const NEVER = ['Pork', 'Beef', 'Chicken', 'Fish', 'Shellfish', 'Dairy', 'Eggs', 'Gluten', 'Nuts', 'Peanuts', 'Soy', 'Mushrooms', 'Spicy', 'Onions']
const EATS = [
  { v: 'cook', l: 'I cook', d: 'We pick the recipe. You just cook.' },
  { v: 'mix', l: 'A mix', d: 'Home or out, we pick either way.' },
  { v: 'out', l: 'I eat out', d: 'We pick from spots near you.' },
]

/** The two weekly-money numbers she sees under the slider — and the per-meal
 * amount saved as meal_budget (her money for one eat-out meal, or one home
 * meal when she only cooks). */
export function perMeal(style: string, weekly: number): { text: string; mealBudget: number } {
  if (style === 'cook') { const m = Math.max(3, Math.round(weekly / 21)); return { text: `About $${m} a meal`, mealBudget: m } }
  if (style === 'mix') { const m = Math.max(6, Math.round((weekly - 56) / 7)); return { text: `Home meals about $4 · eat-out meals about $${m}`, mealBudget: m } }
  const m = Math.max(6, Math.round((weekly - 35) / 14))
  return { text: `About $${m} a meal out · breakfast about $5`, mealBudget: m }
}

export default function NewFlow(p: {
  f: Form
  setF: (fn: (s: Form) => Form) => void
  goals: string[]; setGoals: (g: string[]) => void
  payoffs: string[]; setPayoffs: (p: string[]) => void
  injuries: string[]; setInjuries: (i: string[]) => void
  lifeStage: LifeStage; setLifeStage: (l: LifeStage) => void
  whyOwn: string; setWhyOwn: (s: string) => void
  never: string[]; setNever: (n: string[]) => void
  neverOther: string; setNeverOther: (s: string) => void
  trainingStyles: string[]; setTrainingStyles: (s: string[]) => void
  error: string
  editMode: boolean
  onBuild: () => void
  onEditDone: () => void
  onExit: () => void
}) {
  const { f, setF, goals, setGoals, injuries, setInjuries, lifeStage, setLifeStage } = p
  const [i, setI] = useState(0)
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')
  const step = STEPS[i]
  // Warm every photo up front so no screen ever waits on one.
  useEffect(() => { PHOTOS.forEach((src) => { const im = new Image(); im.src = img(src).slice(4, -1) }) }, [])
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const go = (n: number) => { setDir(n > i ? 'fwd' : 'back'); setI(Math.max(0, Math.min(STEPS.length - 1, n))); if (typeof window !== 'undefined') window.scrollTo(0, 0) }
  const next = () => { hapticTap(); go(i + 1) }
  const back = () => (i === 0 ? p.onExit() : go(i - 1))

  // Body sliders always hold a value — these are the starting points until
  // she slides (or what we already have on file).
  const age = Number(f.age) || 30
  // 2026-10-26 (Asa: slider "skipped from 5'11 all the way to 6"): 0 inches is
  // a real answer — `|| 4` turned 6′0″ into 6′4″. Default only when blank.
  const inches = f.heightIn === '' || f.heightIn == null ? 4 : Number(f.heightIn)
  const heightIn = (Number(f.heightFt) || 5) * 12 + (Number.isFinite(inches) ? inches : 4)
  const weight = Number(f.weight_lbs) || 165
  const weekly = Number(f.weekly_food_budget) || 150

  // Her live calorie number — the exact same math the server runs
  // (lib/plan-builder.ts), so the number at the top is the number she gets.
  const cal = useMemo(() => {
    const goal = lifeStage !== 'none' ? 'maintain' : effectiveGoal(goals.length ? goals : ['lose'])
    const t = Number(f.target_lbs) || 10
    const bp = buildBlueprint({
      age, sex: 'female', height_in: heightIn, weight_lbs: weight, goal,
      activity: (f.activity_level || 'light') as Activity, workout_days_per_week: 4, workout_length: '45_60_both',
      goal_weight_lbs: goal === 'gain' ? weight + t : weight - t,
    })
    return averageDayTargets(bp).calories + (lifeStage === 'nursing' ? 300 : 0)
  }, [age, heightIn, weight, goals, lifeStage, f.activity_level, f.target_lbs])

  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: C.bg, color: C.ink, fontFamily: BODY, ...FULL }}>
      <style>{CSS}</style>
      <div key={step} className={dir === 'fwd' ? 'nf-in' : 'nf-in-back'}>
        {step === 'name' && <NameWhy {...p} next={next} />}
        {step === 'goal' && (
          <Shell left={LEFT.goal} cal={null} onBack={back}>
            <H1>What&apos;s the mission?</H1>
            <Sub>Pick one, or both of the top two.</Sub>
            <div className="flex flex-col gap-3 mt-4">
              {GOALS.map((g) => {
                const on = goals.includes(g.v)
                return (
                  <button key={g.v} onClick={() => {
                    hapticTap()
                    if (g.v === 'maintain') setGoals(on ? [] : ['maintain'])
                    else { const base = goals.filter((x) => x !== 'maintain'); setGoals(base.includes(g.v) ? base.filter((x) => x !== g.v) : [...base, g.v]) }
                  }} className="nf-press relative h-[150px] rounded-[22px] overflow-hidden text-left"
                    style={{ border: `3px solid ${on ? C.gold : 'transparent'}`, backgroundImage: img(g.img), backgroundSize: 'cover', backgroundPosition: g.pos }}>
                    <span className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(2,31,22,.92) 0%, rgba(2,31,22,.55) 55%, rgba(2,31,22,${on ? '.05' : '.35'}) 100%)` }} />
                    <span className="absolute left-5 bottom-4 flex flex-col gap-1">
                      <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 36, lineHeight: 1, textTransform: 'uppercase' }}>{g.l}</span>
                      <span className="text-sm" style={{ color: 'rgba(237,231,218,.85)' }}>{g.d}</span>
                    </span>
                    {on && <Check />}
                  </button>
                )
              })}
            </div>
            <Spacer />
            <Btn onClick={next} disabled={!goals.length}>Next</Btn>
          </Shell>
        )}
        {step === 'body' && (
          <Shell left={LEFT.body} cal={cal} onBack={back}>
            <H1>Your body</H1>
            <Sub>Slide. Watch your plan change up top.</Sub>
            <div className="flex flex-col gap-3 mt-4">
              <Dial id="age" label="AGE" show={String(age)} min={18} max={80} value={age} onChange={(v) => set('age', String(v))} />
              <Dial id="ht" label="HEIGHT" show={`${Math.floor(heightIn / 12)}′${heightIn % 12}″`} min={56} max={76} value={heightIn}
                onChange={(v) => setF((s) => ({ ...s, heightFt: String(Math.floor(v / 12)), heightIn: String(v % 12) }))} />
              <Dial id="wt" label="WEIGHT" show={`${weight} lb`} min={90} max={350} value={weight} onChange={(v) => set('weight_lbs', String(v))} />
            </div>
            <Label className="mt-5 mb-2">RIGHT NOW I&apos;M</Label>
            <div className="grid grid-cols-3 gap-2">
              {([['none', 'Neither'], ['pregnant', 'Pregnant'], ['nursing', 'Nursing']] as [LifeStage, string][]).map(([v, l]) => (
                <Choice key={v} on={lifeStage === v} onClick={() => { hapticTap(); setLifeStage(v) }} className="h-12 text-sm">{l}</Choice>
              ))}
            </div>
            {lifeStage === 'pregnant' && <Note>No calorie cut while pregnant. Safe workouts only. Check with your doctor.</Note>}
            {lifeStage === 'nursing' && <Note>Extra calories added for nursing. No calorie cut.</Note>}
            <Spacer />
            {/* Writes the slider values she's looking at, even untouched ones. */}
            <Btn onClick={() => { setF((s) => ({ ...s, sex: 'female', age: String(age), weight_lbs: String(weight), heightFt: String(Math.floor(heightIn / 12)), heightIn: String(heightIn % 12) })); next() }}>Next</Btn>
          </Shell>
        )}
        {step === 'days' && (
          <Shell left={LEFT.days} cal={cal} onBack={back}>
            <H1>How do your days look?</H1>
            <Sub>Not counting workouts.</Sub>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {DAYS.map((d) => {
                const on = f.activity_level === d.v
                return (
                  <button key={d.v} onClick={() => { hapticTap(); set('activity_level', d.v) }} className="nf-press h-[170px] rounded-[22px] p-4 flex flex-col justify-between items-start text-left"
                    style={{ border: `3px solid ${on ? C.gold : C.line}`, background: on ? C.gold : C.card, color: on ? C.bg : C.ink }}>
                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: on ? 'rgba(2,31,22,.12)' : 'rgba(237,231,218,.08)' }}><DayIcon k={d.icon} /></span>
                    <span className="flex flex-col gap-1">
                      <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 26, lineHeight: 1, textTransform: 'uppercase' }}>{d.l}</span>
                      <span className="text-[13px]" style={{ opacity: 0.85 }}>{d.d}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <Spacer />
            <Btn onClick={next} disabled={!f.activity_level}>Next</Btn>
          </Shell>
        )}
        {step === 'train' && (() => {
          const spot = Math.max(0, SPOTS.findIndex((s) => s.v === (f.training_location || 'both')))
          const days = f.days_per_week || '3'
          const style = STYLES.find((o) => p.trainingStyles.includes(o.v)) || STYLES[2]
          const week = weekTemplate(Number(days), style.t)
          return (
            <div className="min-h-[100dvh] relative flex flex-col">
              <div className="absolute inset-x-0 top-0 h-[54vh]" style={{ backgroundImage: img('/images/onboarding/goal-gain.jpg'), backgroundSize: 'cover', backgroundPosition: 'center 15%' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,.35) 0%, rgba(2,31,22,0) 18%, rgba(2,31,22,.75) 40%, #021F16 54%)' }} />
              <div className="relative max-w-md w-full mx-auto px-4 flex-1 flex flex-col" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
                <TopBar left={LEFT.train} cal={cal} onBack={back} onPhoto />
                <div className="flex-1 min-h-[16vh]" />
                <H1>Where do you train?</H1>
                <div className="relative h-[72px] rounded-full mt-4" style={{ border: '2px solid rgba(237,231,218,.5)' }}>
                  <span className="absolute top-[5px] rounded-full transition-all duration-300" style={{ left: `calc(${spot} * (100% - 8px) / 3 + 4px)`, width: 'calc((100% - 8px) / 3)', height: 58, background: C.gold, transitionTimingFunction: 'cubic-bezier(.3,1.4,.5,1)' }} />
                  <div className="absolute inset-0 grid grid-cols-3">
                    {SPOTS.map((s, k) => (
                      <button key={s.v} onClick={() => { hapticTap(); set('training_location', s.v) }} className="relative"
                        style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 26, textTransform: 'uppercase', color: k === spot ? C.bg : C.ink }}>{s.l}</button>
                    ))}
                  </div>
                </div>
                <Label className="mt-5 mb-2">DAYS A WEEK YOU CAN DO</Label>
                <div className="grid grid-cols-5 gap-2">
                  {['2', '3', '4', '5', '6'].map((d) => (
                    <Choice key={d} on={days === d} onClick={() => { hapticTap(); set('days_per_week', d) }} className="h-16" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 32 }}>{d}</Choice>
                  ))}
                </div>
                <Label className="mt-5 mb-2">HOW YOU LIKE TO TRAIN</Label>
                <div className="grid grid-cols-3 gap-2">
                  {STYLES.map((o) => (
                    <Choice key={o.v} on={style.v === o.v} onClick={() => { hapticTap(); p.setTrainingStyles([o.v]) }} className="h-[84px] flex flex-col items-start justify-center gap-1 px-3 text-left">
                      <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 22, lineHeight: 1, textTransform: 'uppercase' }}>{o.l}</span>
                      <span className="text-[12px] leading-tight" style={{ opacity: 0.8 }}>{o.d}</span>
                    </Choice>
                  ))}
                </div>
                {/* Her week, live: changes as she taps days or style. */}
                <div className="flex flex-wrap gap-1.5 mt-3" aria-label="Your week">
                  {week.map((k, n) => (
                    <span key={`${days}-${style.v}-${n}`} className="nf-pop-in rounded-full px-2.5 py-1.5" style={{ background: 'rgba(229,169,60,.14)', border: '1px solid rgba(229,169,60,.45)', color: C.gold, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', animationDelay: `${n * 40}ms` }}>
                      DAY {n + 1} · {DAY_SHORT[k]}
                    </span>
                  ))}
                </div>
                <div className="h-5" />
                <Btn onClick={() => { setF((s) => ({ ...s, training_location: s.training_location || 'both', days_per_week: s.days_per_week || '3' })); if (!p.trainingStyles.length) p.setTrainingStyles(['none']); next() }}>Next</Btn>
              </div>
            </div>
          )
        })()}
        {step === 'hurts' && (
          <Shell left={LEFT.hurts} cal={cal} onBack={back}>
            <H1>Anything hurt?</H1>
            <Sub>Tap it. Your workouts go around it.</Sub>
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {HURTS.map((h) => {
                const on = injuries.includes(h.v)
                return (
                  <button key={h.v} onClick={() => { hapticTap(); setInjuries(on ? injuries.filter((x) => x !== h.v) : [...injuries, h.v]) }}
                    className="nf-press h-16 rounded-[18px] px-4 flex items-center justify-between"
                    style={{ border: `2px solid ${on ? '#FF7A59' : C.line}`, background: on ? 'rgba(255,122,89,.16)' : 'rgba(237,231,218,.05)', fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 25, textTransform: 'uppercase' }}>
                    <span>{h.l}</span>
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: on ? '#FF7A59' : 'rgba(237,231,218,.18)', boxShadow: on ? '0 0 12px #FF7A59' : 'none' }} />
                  </button>
                )
              })}
            </div>
            {injuries.length > 0 && <Note>Got it. No moves that load your {injuries.map((v) => HURTS.find((h) => h.v === v)?.l.toLowerCase()).join(', ')}.</Note>}
            <Spacer />
            <Btn onClick={next}>{injuries.length ? 'Next' : 'Nothing hurts'}</Btn>
          </Shell>
        )}
        {step === 'foodintro' && <FoodIntro onDone={() => go(i + 1)} />}
        {step === 'never' && (
          <Shell left={LEFT.never} cal={cal} onBack={() => go(STEPS.indexOf('hurts'))}>
            <H1 size={46}>Any food you never eat?</H1>
            <Sub>Tap it. We flick it off your plate for good.</Sub>
            <NeverPlate never={p.never} />
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {NEVER.map((n) => {
                const on = p.never.includes(n)
                return (
                  <button key={n} onClick={() => { hapticTap(on ? 8 : 18); p.setNever(on ? p.never.filter((x) => x !== n) : [...p.never, n]) }}
                    className="nf-press h-10 rounded-full px-3 text-[14px] font-semibold flex items-center gap-1.5"
                    style={{ border: `2px solid ${on ? '#C8452D' : 'rgba(237,231,218,.22)'}`, background: on ? 'rgba(200,69,45,.18)' : 'transparent', color: on ? '#F0B3A6' : C.ink }}>
                    <span className="text-[17px] leading-none" aria-hidden>{FOOD_ICON[n]}</span>
                    {n}
                  </button>
                )
              })}
            </div>
            <label htmlFor="never-other" className="sr-only">Anything else you never eat</label>
            <input id="never-other" value={p.neverOther} onChange={(e) => p.setNeverOther(e.target.value)} placeholder="Anything else? (optional)"
              className="mt-4 h-12 rounded-2xl px-4 text-[16px] outline-none w-full" autoCorrect="off" spellCheck={false}
              style={{ border: `2px solid ${p.neverOther ? C.gold : 'rgba(237,231,218,.2)'}`, background: 'rgba(237,231,218,.06)', color: C.ink }} />
            <Spacer />
            <Btn onClick={next}>{p.never.length || p.neverOther.trim() ? 'Next' : 'I eat everything'}</Btn>
          </Shell>
        )}
        {step === 'eat' && (() => {
          const style = f.eat_style || ''
          const pm = perMeal(style || 'mix', weekly)
          return (
            <div className="min-h-[100dvh] relative flex flex-col">
              <div className="absolute inset-x-0 top-0 h-[34vh]" style={{ backgroundImage: img('/images/meals/food/bowl.jpg'), backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,.3) 0%, rgba(2,31,22,.1) 12%, rgba(2,31,22,.88) 26%, #021F16 34%)' }} />
              <div className="relative max-w-md w-full mx-auto px-4 flex-1 flex flex-col" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
                <TopBar left={LEFT.eat} cal={cal} onBack={back} onPhoto />
                <div className="h-[13vh]" />
                <H1>How do you eat?</H1>
                <Sub>No meal plans. No counting. We hand you the meal.</Sub>
                <div className="flex flex-col gap-2.5 mt-4">
                  {EATS.map((e) => {
                    const on = style === e.v
                    return (
                      <button key={e.v} onClick={() => { hapticTap(); set('eat_style', e.v) }} className="nf-press h-[72px] rounded-[20px] px-5 flex items-center justify-between text-left"
                        style={{ border: `2px solid ${on ? C.gold : C.line}`, background: on ? C.gold : C.card, color: on ? C.bg : C.ink }}>
                        <span className="flex flex-col gap-0.5">
                          <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 28, lineHeight: 1, textTransform: 'uppercase' }}>{e.l}</span>
                          <span className="text-[13px]" style={{ opacity: 0.85 }}>{e.d}</span>
                        </span>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ border: `2px solid ${on ? C.bg : C.ink}` }}>
                          {on && <span className="w-3 h-3 rounded-full" style={{ background: C.bg }} />}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="rounded-[20px] px-4 pt-3.5 pb-4 mt-3 flex flex-col gap-3" style={{ background: C.card }}>
                  <div className="flex justify-between items-baseline">
                    <label htmlFor="weekly" style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: C.mute }}>FOOD MONEY PER WEEK</label>
                    <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 42, lineHeight: 1, color: C.gold }}>${weekly}{weekly >= 300 ? '+' : ''}</span>
                  </div>
                  <input id="weekly" type="range" min={40} max={300} step={5} value={weekly} className="nf-range"
                    onChange={(e) => { hapticTap(4); set('weekly_food_budget', e.target.value) }} />
                  <span className="text-sm">{style ? pm.text : 'Pick how you eat to see it per meal.'}</span>
                  <span className="text-xs -mt-1.5" style={{ color: 'rgba(237,231,218,.65)' }}>We stretch it across your week. You never do the math.</span>
                </div>
                <div className="flex-1 min-h-5" />
                {p.error && <p className="text-sm mb-3" style={{ color: '#FF8A70' }}>{p.error}</p>}
                <Btn disabled={!style} onClick={() => { setF((s) => ({ ...s, weekly_food_budget: String(weekly), meal_budget: String(pm.mealBudget) })); next() }}>Next</Btn>
              </div>
            </div>
          )
        })()}
        {step === 'location' && <Location onBack={back} onDone={p.editMode ? p.onEditDone : p.onBuild} editMode={p.editMode} />}
      </div>
    </div>
  )
}

// ---------- screens ----------

function NameWhy(p: Parameters<typeof NewFlow>[0] & { next: () => void }) {
  const [other, setOther] = useState(!!p.whyOwn)
  const first = (p.f.name || '').trim().split(' ')[0]
  return (
    <div className="min-h-[100dvh] relative flex flex-col">
      <div className="absolute inset-x-0 top-0 h-[40vh]" style={{ backgroundImage: img('/images/onboarding/name-step.jpg'), backgroundSize: 'cover', backgroundPosition: 'center 18%' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,0) 8%, rgba(2,31,22,.8) 26%, #021F16 36%)' }} />
      <div className="relative max-w-md w-full mx-auto px-4 flex-1 flex flex-col" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <TopBar left={LEFT.name} cal={null} onBack={p.onExit} onPhoto backLabel="Home" />
        <div className="h-[13vh]" />
        <H1 size={46}>What do we call you?</H1>
        <label htmlFor="nm" className="sr-only">First name</label>
        <input id="nm" value={p.f.name || ''} onChange={(e) => p.setF((s) => ({ ...s, name: e.target.value }))} placeholder="Your first name"
          autoCorrect="off" autoCapitalize="words" spellCheck={false} enterKeyHint="done"
          className="mt-3 h-14 rounded-2xl px-4 text-[19px] outline-none w-full"
          style={{ border: `2px solid ${p.f.name ? C.gold : 'rgba(237,231,218,.25)'}`, background: 'rgba(237,231,218,.08)', color: C.ink }} />
        <h2 className="mt-5 mx-1" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 30, lineHeight: 0.95, textTransform: 'uppercase', color: C.gold }}>
          {first ? `${first}, why does this matter to you?` : 'Why does this matter to you?'}
        </h2>
        <p className="mx-1 mt-1 text-sm" style={{ color: C.mute }}>Pick all that are true. We remind you on hard days.</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {WHYS.map((w) => {
            const on = p.payoffs.includes(w.v)
            return (
              <button key={w.v} onClick={() => { hapticTap(); p.setPayoffs(on ? p.payoffs.filter((x) => x !== w.v) : [...p.payoffs, w.v]) }}
                className="nf-press h-[50px] rounded-2xl px-3.5 flex items-center gap-2.5 text-left"
                style={{ border: `2px solid ${on ? C.gold : C.line}`, background: on ? C.gold : 'rgba(237,231,218,.05)', color: on ? C.bg : C.ink }}>
                <WhyIcon k={w.v} />
                <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 20, lineHeight: 1, textTransform: 'uppercase' }}>{w.l}</span>
              </button>
            )
          })}
        </div>
        <button onClick={() => { hapticTap(); setOther(!other) }} className="nf-press mt-2 h-[50px] rounded-2xl px-3.5 flex items-center gap-2.5"
          style={{ border: `2px dashed ${other ? C.gold : 'rgba(237,231,218,.3)'}`, background: other ? 'rgba(229,169,60,.15)' : 'transparent', color: other ? C.gold : C.ink }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>
          <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 20, lineHeight: 1, textTransform: 'uppercase' }}>Something else? Say it your way</span>
        </button>
        {other && (<>
          <label htmlFor="why-own" className="sr-only">Your why, in your own words</label>
          <input id="why-own" value={p.whyOwn} onChange={(e) => p.setWhyOwn(e.target.value)} placeholder="e.g. Walk my daughter down the aisle" maxLength={200}
            className="mt-2 h-[52px] rounded-2xl px-4 text-[16px] outline-none w-full" autoFocus
            style={{ border: `2px solid ${C.gold}`, background: 'rgba(237,231,218,.08)', color: C.ink }} />
        </>)}
        <div className="flex-1 min-h-6" />
        <Btn onClick={p.next} disabled={!(p.f.name || '').trim()}>Let&apos;s go</Btn>
      </div>
    </div>
  )
}

// Never foods as a plate (2026-10-26, Asa: "make it more immersive... the
// bubbles are fine, add one way the experience is better"). Every food sits
// on her plate; tapping one flicks it off with a "NEVER." stamp. Tap again
// and it lands back on.
const FOOD_ICON: Record<string, string> = { Pork: '🥓', Beef: '🥩', Chicken: '🍗', Fish: '🐟', Shellfish: '🦐', Dairy: '🧀', Eggs: '🥚', Gluten: '🍞', Nuts: '🌰', Peanuts: '🥜', Soy: '🫘', Mushrooms: '🍄', Spicy: '🌶️', Onions: '🧅' }
function NeverPlate({ never }: { never: string[] }) {
  const [stamp, setStamp] = useState(0)
  const prev = useRef(never.length)
  useEffect(() => { if (never.length > prev.current) setStamp((n) => n + 1); prev.current = never.length }, [never.length])
  const R = 92, c = 125
  return (
    <div className="flex flex-col items-center mt-3">
      <div className={`relative rounded-full ${stamp ? (stamp % 2 ? 'nv-shakeA' : 'nv-shakeB') : ''}`} style={{ width: 250, height: 250, background: 'radial-gradient(circle,#F4EFE4 0 52%,#E3DCCB 53% 60%,#EDE7DA 61% 100%)', boxShadow: '0 18px 40px rgba(0,0,0,.4)' }}>
        {NEVER.map((n, i) => {
          const a = (i / NEVER.length) * Math.PI * 2 - Math.PI / 2
          const r = i % 2 ? R : R - 34
          const gone = never.includes(n)
          return (
            <span key={n} aria-hidden className="absolute text-[32px] leading-[44px] text-center" style={{
              width: 44, height: 44, left: c + Math.cos(a) * r - 22, top: c + Math.sin(a) * r - 22,
              opacity: gone ? 0 : 1, transition: 'transform .5s cubic-bezier(.5,-0.4,.7,1), opacity .5s ease',
              transform: gone ? `translate(${Math.cos(a) * 260}px, ${Math.sin(a) * 260 - 120}px) rotate(${i % 2 ? 260 : -260}deg) scale(.6)` : 'none',
            }}>{FOOD_ICON[n]}</span>
          )
        })}
        {stamp > 0 && <span key={stamp} className="nv-nope absolute left-1/2 top-1/2 pointer-events-none" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 40, color: '#C8452D' }}>NEVER.</span>}
      </div>
      <span className="mt-2.5" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: 'rgba(237,231,218,.6)' }}>
        {never.length ? `${never.length} OFF YOUR PLATE FOR GOOD` : 'YOUR PLATE'}
      </span>
    </div>
  )
}

// The 6-second food intro — plays like a short video, then moves on.
function FoodIntro({ onDone }: { onDone: () => void }) {
  const done = useRef(false)
  const finish = () => { if (!done.current) { done.current = true; onDone() } }
  useEffect(() => {
    // 2026-10-26 (Asa): new ending: one finger tap orders it, and it rides
    // to her door. No decision for her, just "it's handled". ~8.5s total.
    const t = setTimeout(finish, 8600)
    const h = [[1700, 10], [2150, 10], [2600, 10], [3050, 25], [5450, 30], [6800, 20]].map(([ms, d]) => setTimeout(() => hapticTap(d), ms))
    return () => { clearTimeout(t); h.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const line = { fontFamily: HEAD, fontStyle: 'italic' as const, fontWeight: 800, fontSize: 52, lineHeight: 1, textTransform: 'uppercase' as const }
  return (
    <button onClick={finish} className="block w-full min-h-[100dvh] relative overflow-hidden text-left" aria-label="Tap to skip">
      <div className="fi-food absolute inset-0" style={{ backgroundImage: img('/images/meals/food/bowl.jpg'), backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0" style={{ background: 'rgba(2,31,22,.78)' }} />
      <div className="fi-flash absolute inset-0" style={{ background: C.gold }} />
      <div className="absolute left-4 right-4 h-1 rounded-full overflow-hidden" style={{ top: 'calc(16px + env(safe-area-inset-top))', background: 'rgba(237,231,218,.25)' }}>
        <div className="fi-bar h-1" style={{ background: C.gold }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full max-w-md h-[60vh]">
          <div className="fi-s1 absolute inset-x-6 top-[22%] flex flex-col items-center gap-1.5 text-center">
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, letterSpacing: '.2em', color: C.gold }}>NOW THE GOOD PART</span>
            <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 150, lineHeight: 0.85, textTransform: 'uppercase' }}>Food.</span>
          </div>
          <div className="fi-s2 absolute inset-x-8 top-[18%] flex flex-col gap-4">
            <span className="fi-line fi-l1" style={line}>What to eat?</span>
            <span className="fi-line fi-l2" style={line}>When to eat?</span>
            <span className="fi-line fi-l3" style={line}>How much?</span>
          </div>
          <div className="absolute inset-x-6 top-[14%] flex flex-col items-center gap-4 text-center">
            <span className="fi-s3" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 64, lineHeight: 0.9, textTransform: 'uppercase' }}>We&apos;ve got all three.</span>
            <span className="fi-s3 text-lg" style={{ color: 'rgba(237,231,218,.85)' }}>You just eat.</span>
          </div>
          <div className="fi-ord absolute inset-x-0 top-0 flex flex-col items-center gap-3.5">
            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: '.18em', color: C.gold }}>ONE TAP</span>
            <div className="fi-card w-[260px] rounded-3xl overflow-hidden" style={{ background: C.ink, color: C.bg, boxShadow: '0 20px 50px rgba(0,0,0,.45)' }}>
              <div className="h-[120px]" style={{ backgroundImage: img('/images/meals/food/bowl.jpg'), backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="px-4 pt-3.5 pb-4 flex flex-col gap-2">
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', opacity: 0.7 }}>YOUR LUNCH · 520 CAL</span>
                <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 30, lineHeight: 0.9, textTransform: 'uppercase' }}>Chicken bowl</span>
                <span className="fi-obtn relative h-[50px] rounded-full flex items-center justify-center" style={{ background: C.gold, fontFamily: MONO, fontWeight: 700, fontSize: 15, letterSpacing: '.12em' }}>ORDER IT<span className="fi-ripple" /></span>
              </div>
            </div>
            <svg className="fi-finger absolute" width="70" height="70" viewBox="0 0 64 64" style={{ left: '50%', top: 250, marginLeft: -10 }} aria-hidden><path d="M26 8c3 0 5 2 5 5v17l3-1c3-1 6 1 6 4l4-1c3 0 5 2 5 5l3 0c3 0 5 2 5 5v8c0 8-6 13-14 13H33c-5 0-9-3-11-7l-8-15c-1-3 0-5 3-6 2-1 4 0 5 2l3 5V13c0-3 1-5 1-5z" fill={C.ink} stroke={C.bg} strokeWidth="2.5" strokeLinejoin="round" /></svg>
            <svg className="absolute overflow-visible" width="330" height="150" viewBox="0 0 330 150" style={{ top: 300, left: '50%', marginLeft: -165 }} aria-hidden>
              <path className="fi-route" d="M30 30 C 120 10, 180 140, 290 110" fill="none" stroke={C.gold} strokeWidth="4" strokeLinecap="round" />
              <g className="fi-bag"><rect x="-16" y="-14" width="32" height="30" rx="6" fill={C.gold} /><path d="M-8 -14v-5a8 8 0 0116 0v5" fill="none" stroke={C.gold} strokeWidth="3.5" /></g>
              <g className="fi-door"><path d="M282 118 L300 98 L318 118 V140 H282 Z" fill={C.ink} /><rect x="295" y="124" width="10" height="16" fill={C.bg} /></g>
            </svg>
            <span className="fi-at absolute inset-x-0 text-center" style={{ top: 460, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}>At your door.</span>
          </div>
          <span className="fi-lock absolute inset-x-6 text-center" style={{ top: '34%', fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 44, lineHeight: 0.9, textTransform: 'uppercase', color: C.gold }}>Let&apos;s lock in your food plan.</span>
        </div>
      </div>
      <span className="absolute inset-x-0 text-center" style={{ bottom: 'calc(40px + env(safe-area-inset-bottom))', fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: 'rgba(237,231,218,.6)' }}>TAP TO SKIP</span>
    </button>
  )
}

function Location({ onBack, onDone, editMode }: { onBack: () => void; onDone: () => void; editMode: boolean }) {
  const [state, setState] = useState<'ask' | 'finding' | 'on' | 'none'>('ask')
  const [spots, setSpots] = useState<{ name: string; miles: number; lat: number; lng: number }[]>([])
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null)
  const [mapFailed, setMapFailed] = useState(false)
  const turnOn = () => {
    hapticTap()
    if (!('geolocation' in navigator)) { setState('none'); return }
    setState('finding')
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      try {
        await fetch('/api/plan/location-ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lng }) })
        try { localStorage.setItem('luf_last_ping_at', String(Date.now())) } catch { /* fine */ }
        const r = await fetch('/api/plan/nearby-spots').then((x) => x.json()).catch(() => null)
        const list = (r?.spots || []) as { name: string; miles: number; lat: number; lng: number }[]
        setSpots(list.slice(0, 4)); setMe({ lat, lng }); setState(list.length ? 'on' : 'none')
        if (list.length) hapticTap(20)
      } catch { setState('none') }
    }, () => setState('none'), { maximumAge: 10 * 60000, timeout: 9000 })
  }
  const PIN_POS = [{ x: '8%', y: '20%' }, { x: '55%', y: '28%' }, { x: '12%', y: '52%' }, { x: '58%', y: '66%' }]
  const title = state === 'on' ? `${spots.length} spot${spots.length === 1 ? '' : 's'} ready for you` : state === 'none' ? 'No problem.' : 'Hungry? We got you.'
  const sub = state === 'on' ? 'When it’s time to eat, your pick is already waiting.'
    : state === 'none' ? 'We’ll still pick every meal for you. You can turn this on later.'
    : 'We pick meals that are open and close by, right when it’s time to eat.'
  return (
    <div className="min-h-[100dvh] relative overflow-hidden">
      <div className="absolute inset-0 nf-map" />
      {state === 'on' && me && !mapFailed && <LiveMap me={me} spots={spots} bottomPad={300} onFail={() => setMapFailed(true)} />}
      {!(state === 'on' && me && !mapFailed) && (<>
      <div className="absolute left-[-5%] top-[50%] w-[130%] h-2.5 -rotate-[28deg] origin-left" style={{ background: 'rgba(237,231,218,.16)' }} />
      <div className="absolute left-[5%] top-[11%] w-[30%] h-[13%] rounded-md" style={{ background: 'rgba(229,169,60,.16)', border: '2px solid rgba(229,169,60,.45)' }} />
      <div className="absolute left-[62%] top-[18%] w-[33%] h-[18%] rounded-md" style={{ background: 'rgba(110,190,160,.14)', border: '2px solid rgba(110,190,160,.4)' }} />
      <div className="absolute left-[15%] top-[40%] w-[38%] h-[11%] rounded-md" style={{ background: 'rgba(255,122,89,.12)', border: '2px solid rgba(255,122,89,.35)' }} />
      <div className="absolute left-[59%] top-[53%] w-[36%] h-[12%] rounded-md" style={{ background: 'rgba(150,140,230,.12)', border: '2px solid rgba(150,140,230,.35)' }} />
      <div className="absolute left-1/2 top-[35%] -translate-x-1/2 w-6 h-6">
        <span className="nf-pulse absolute inset-0 rounded-full" style={{ background: 'rgba(90,160,255,.6)' }} />
        <span className="absolute inset-[3px] rounded-full" style={{ background: '#4C8DFF', border: '3px solid #EDE7DA' }} />
      </div>
      </>)}
      {state === 'on' && (mapFailed || !me) && spots.map((s, k) => (
        <div key={s.name} className="nf-pin absolute flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5" style={{ left: PIN_POS[k].x, top: PIN_POS[k].y, animationDelay: `${k * 0.12}s`, background: C.gold, color: C.bg, boxShadow: '0 6px 18px rgba(0,0,0,.35)' }}>
          <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center" style={{ background: C.bg }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8" /></svg>
          </span>
          <span className="flex flex-col leading-tight"><span className="font-bold text-[13px]">{s.name}</span><span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>{s.miles.toFixed(1)} MI</span></span>
        </div>
      ))}
      <div className="absolute left-4 right-4 flex justify-between items-center" style={{ top: 'calc(16px + env(safe-area-inset-top))' }}>
        <button onClick={onBack} aria-label="Back" className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: C.ink }}><Chevron color={C.bg} /></button>
        <LeftPill n={1} />
      </div>
      <div className="nf-sheet absolute inset-x-0 bottom-0 rounded-t-[32px] px-6 pt-7 flex flex-col items-center gap-2.5 text-center" style={{ background: C.ink, color: C.bg, paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
        <div className="max-w-md w-full flex flex-col items-center gap-2.5">
          <h1 style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 44, lineHeight: 0.9, textTransform: 'uppercase', margin: 0 }}>{title}</h1>
          <p className="text-base" style={{ color: 'rgba(2,31,22,.75)' }}>{sub}</p>
          <div className="h-4" />
          {state === 'ask' || state === 'finding' ? (
            <div className="flex items-center gap-4 w-full">
              <button onClick={onDone} className="px-2.5 py-3 underline underline-offset-[6px]" style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, letterSpacing: '.08em' }}>SKIP</button>
              <button onClick={turnOn} disabled={state === 'finding'} className="nf-press flex-1 h-[60px] rounded-full" style={{ background: C.bg, color: C.gold, fontFamily: MONO, fontWeight: 700, fontSize: 15, letterSpacing: '.1em' }}>
                {state === 'finding' ? 'FINDING SPOTS…' : 'TURN ON LOCATION'}
              </button>
            </div>
          ) : (
            <button onClick={onDone} className="nf-press w-full h-[60px] rounded-full" style={{ background: C.bg, color: C.gold, fontFamily: MONO, fontWeight: 700, fontSize: 15, letterSpacing: '.1em' }}>{editMode ? 'NEXT' : 'BUILD MY PLAN'}</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- building + reveal ----------

export function NewBuilding({ name }: { name: string }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6" style={{ background: C.bg, color: C.ink, fontFamily: BODY, ...FULL }}>
      <style>{CSS}</style>
      <div className="text-center nf-in">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full" style={{ border: '3px solid rgba(229,169,60,.25)' }} />
          <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '3px solid transparent', borderTopColor: C.gold, animationDuration: '0.9s' }} />
        </div>
        <p style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.2em', color: C.gold }}>ONE MOMENT</p>
        <h1 className="mt-2" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 48, lineHeight: 0.9, textTransform: 'uppercase' }}>Locking in your plan{name ? `, ${name}` : ''}</h1>
      </div>
    </div>
  )
}

type Pick = { label: string; name: string; place: string; kind: string; cal: number; protein: number; price: number | null; photo: string }

export function NewReveal({ name, targets, firstWorkout, track, isAnonymous, onSave, onGo, onFineTune }: {
  name: string; targets: { calories: number; protein_g: number; carbs_g: number; fats_g: number }
  firstWorkout: string | null; track: string | null; isAnonymous: boolean
  onSave: () => void; onGo: () => void; onFineTune: () => void
}) {
  const [n, setN] = useState(0)
  const [pick, setPick] = useState<Pick | null>(null)
  useEffect(() => {
    const start = Date.now()
    const t = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / 900)
      setN(Math.round(targets.calories * (1 - Math.pow(1 - k, 3))))
      if (k >= 1) { clearInterval(t); hapticTap(30) }
    }, 30)
    fetch('/api/plan/first-pick').then((r) => r.json()).then((d) => setPick(d?.pick || null)).catch(() => {})
    return () => clearInterval(t)
  }, [targets.calories])
  const macro = (v: number, l: string) => (
    <div className="rounded-2xl p-2.5 text-center" style={{ background: 'rgba(237,231,218,.07)' }}>
      <div style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 28 }}>{v}g</div>
      <div className="text-xs" style={{ color: C.mute }}>{l}</div>
    </div>
  )
  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ background: C.bg, color: C.ink, fontFamily: BODY, ...FULL }}>
      <style>{CSS}</style>
      <div className="absolute -left-24 -top-16 w-[150%] h-[520px]" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(229,169,60,.28), rgba(229,169,60,0) 60%)' }} />
      <div className="relative max-w-md mx-auto px-4 flex flex-col gap-3.5 min-h-[100dvh]" style={{ paddingTop: 'calc(28px + env(safe-area-inset-top))', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
        <div className="flex flex-col items-center gap-1 text-center">
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.2em', color: C.gold }}>YOUR PLAN IS READY</span>
          <h1 className="mt-1" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 54, lineHeight: 0.9, textTransform: 'uppercase', margin: 0 }}>Let&apos;s go{name ? `, ${name}` : ''}.</h1>
          <span className="mt-2.5" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 92, lineHeight: 0.9, color: C.gold }}>{n.toLocaleString('en-US')}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: C.mute }}>CALORIES A DAY · WE COUNT, YOU DON&apos;T</span>
          <p className="mt-1.5 text-[15px]">No guessing what, when, or how much. We tell you.</p>
        </div>
        <div className="nf-rise grid grid-cols-3 gap-2" style={{ animationDelay: '.9s' }}>
          {macro(targets.protein_g, 'Protein')}{macro(targets.carbs_g, 'Carbs')}{macro(targets.fats_g, 'Fat')}
        </div>
        {pick && (
          <div className="nf-rise rounded-[22px] overflow-hidden" style={{ background: '#0B3326', animationDelay: '.3s' }}>
            <div className="h-32 relative" style={{ backgroundImage: `url(${pick.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <span className="absolute left-3 top-3 rounded-full px-2.5 py-1.5" style={{ background: C.ink, color: C.bg, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.1em' }}>YOUR {pick.label.toUpperCase()} · ALREADY PICKED</span>
            </div>
            <div className="px-4 pt-3 pb-3.5 flex flex-col gap-1">
              <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 25, lineHeight: 1, textTransform: 'uppercase' }}>{pick.kind === 'out' ? `${pick.place} · ` : ''}{pick.name}</span>
              <span className="text-[13px]" style={{ color: C.mute }}>{pick.cal} cal · {pick.protein}g protein{pick.price != null ? ` · about $${pick.price}` : ''}</span>
            </div>
          </div>
        )}
        {firstWorkout && (
          <div className="nf-rise flex items-center gap-3.5 rounded-[18px] px-4 py-3" style={{ background: 'rgba(237,231,218,.07)', animationDelay: '1.5s' }}>
            <span className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: C.gold }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></svg>
            </span>
            <span className="flex flex-col gap-0.5">
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: C.gold }}>YOUR FIRST WORKOUT</span>
              <span className="font-semibold text-[15px]">{firstWorkout}{track === 'home' ? ', at home' : ''}</span>
            </span>
          </div>
        )}
        <div className="flex-1" />
        <div className="nf-rise flex flex-col gap-2" style={{ animationDelay: '1.8s' }}>
          {isAnonymous ? <Btn onClick={onSave}>Save my plan</Btn> : <Btn onClick={onGo}>Let&apos;s go</Btn>}
          {isAnonymous && <button onClick={onGo} className="text-sm py-2" style={{ color: C.mute }}>See my plan first</button>}
          <button onClick={onFineTune} className="text-sm py-1" style={{ color: 'rgba(237,231,218,.5)' }}>Fine-tune it — 60 seconds →</button>
        </div>
      </div>
    </div>
  )
}

// ---------- pieces ----------

function Shell({ left, cal, onBack, children }: { left?: number; cal: number | null; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 min-h-[100dvh] flex flex-col" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <TopBar left={left} cal={cal} onBack={onBack} />
      <div className="mt-4 flex-1 flex flex-col">{children}</div>
    </div>
  )
}

export function TopBar({ left, cal, onBack, onPhoto, backLabel }: { left?: number; cal: number | null; onBack: () => void; onPhoto?: boolean; backLabel?: string }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <button onClick={onBack} aria-label={backLabel || 'Back'} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: onPhoto ? 'rgba(2,31,22,.6)' : 'rgba(237,231,218,.1)' }}><Chevron color={C.ink} /></button>
      {cal != null && (
        <span className="flex items-center gap-2 rounded-full px-3 py-[7px]" style={{ background: onPhoto ? 'rgba(2,31,22,.75)' : 'rgba(229,169,60,.14)', border: '1px solid rgba(229,169,60,.5)', fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: C.gold }}>
          YOUR PLAN <span key={cal} className="nf-pop" style={{ color: C.ink }}>{cal.toLocaleString('en-US')} CAL</span>
        </span>
      )}
      {left != null ? <LeftPill n={left} /> : <span className="w-11" />}
    </div>
  )
}

const LeftPill = ({ n }: { n: number }) => (
  <span className="rounded-full px-3 py-2 shrink-0" style={{ background: C.ink, color: C.bg, fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.08em' }}>{n} LEFT</span>
)
const Chevron = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
)
const Check = () => (
  <span className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.gold }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
  </span>
)
export function H1({ children, size = 54 }: { children: React.ReactNode; size?: number }) {
  return <h1 className="nf-head mx-1" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: size, lineHeight: 0.9, textTransform: 'uppercase', margin: 0 }}>{children}</h1>
}
export const Sub = ({ children }: { children: React.ReactNode }) => <p className="mx-1 mt-2 text-[15px]" style={{ color: C.mute }}>{children}</p>
const Note = ({ children }: { children: React.ReactNode }) => <p className="mx-1 mt-3 text-sm" style={{ color: C.gold }}>{children}</p>
const Label = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`block mx-1 ${className}`} style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: C.mute }}>{children}</span>
)
const Spacer = () => <div className="flex-1 min-h-6" />
function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="nf-press w-full h-[60px] rounded-full shrink-0 uppercase"
      style={{ background: disabled ? 'rgba(229,169,60,.35)' : C.gold, color: C.bg, fontFamily: MONO, fontWeight: 700, fontSize: 16, letterSpacing: '.12em' }}>{children}</button>
  )
}
function Choice({ on, onClick, children, className = '', style }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} className={`nf-press rounded-[16px] font-semibold ${className}`}
      style={{ border: `2px solid ${on ? C.gold : 'rgba(237,231,218,.2)'}`, background: on ? C.gold : 'rgba(237,231,218,.06)', color: on ? C.bg : C.ink, ...style }}>{children}</button>
  )
}
function Dial({ id, label, show, min, max, value, onChange }: { id: string; label: string; show: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-[20px] px-4 pt-3.5 pb-4 flex flex-col gap-2.5" style={{ background: C.card }}>
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: C.mute }}>{label}</label>
        <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 40, lineHeight: 1 }}>{show}</span>
      </div>
      <input id={id} type="range" min={min} max={max} value={value} className="nf-range" onChange={(e) => { hapticTap(4); onChange(Number(e.target.value)) }} />
    </div>
  )
}
function DayIcon({ k }: { k: string }) {
  const s = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (k === 'desk') return <svg {...s}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
  if (k === 'walk') return <svg {...s}><circle cx="13" cy="4" r="2" /><path d="M10 22l2-7 3 3v4M7 12l3-4 4 1 3 3" /></svg>
  if (k === 'shoe') return <svg {...s}><path d="M4 16c0-4 2-9 5-9 2 0 2 3 4 4s7 1 7 4v3H4z" /><path d="M4 19h16" /></svg>
  return <svg {...s}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
}
function WhyIcon({ k }: { k: string }) {
  const s = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (k === 'energy') return <svg {...s}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
  if (k === 'kids') return <svg {...s}><circle cx="8" cy="7" r="3" /><circle cx="17" cy="9" r="2.2" /><path d="M3 21v-2a5 5 0 0110 0v2M14 21v-1.5a3.5 3.5 0 017 0V21" /></svg>
  if (k === 'mood') return <svg {...s}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
  if (k === 'health') return <svg {...s}><path d="M12 21s-8-5-8-11a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 6-8 11-8 11z" /></svg>
  if (k === 'look') return <svg {...s}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></svg>
  return <svg {...s}><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" /></svg>
}

export const CSS = `
.nf-pop-in{animation:nfPopIn .35s cubic-bezier(.3,1.4,.5,1) both}@keyframes nfPopIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){.nf-pop-in{animation:none}}
.nf-in{animation:nfIn .45s cubic-bezier(.2,1,.3,1) both}
.nf-in-back{animation:nfInBack .45s cubic-bezier(.2,1,.3,1) both}
@keyframes nfIn{from{transform:translateX(48px);opacity:0}to{transform:none;opacity:1}}
@keyframes nfInBack{from{transform:translateX(-48px);opacity:0}to{transform:none;opacity:1}}
.nf-head{animation:nfHead .55s .08s cubic-bezier(.2,1,.3,1) both}
@keyframes nfHead{from{transform:translateY(22px) skewX(-6deg);opacity:0}to{transform:none;opacity:1}}
.nf-press{transition:transform .12s ease}
.nf-press:active{transform:scale(.96)}
.nf-pop{display:inline-block;animation:nfPop .35s ease}
@keyframes nfPop{0%{transform:scale(1)}40%{transform:scale(1.14)}100%{transform:scale(1)}}
.nf-rise{animation:nfRise .6s cubic-bezier(.2,1,.3,1) both}
@keyframes nfRise{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
.nf-range{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:999px;background:rgba(237,231,218,.15);outline:none;margin:0}
.nf-range::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;border-radius:999px;background:#E5A93C;border:4px solid #021F16;box-shadow:0 0 0 2px #E5A93C}
.nf-range::-moz-range-thumb{width:24px;height:24px;border-radius:999px;background:#E5A93C;border:4px solid #021F16}
.nf-map{background-color:#0D2A21;background-image:repeating-linear-gradient(0deg,rgba(237,231,218,.10) 0 2px,transparent 2px 64px),repeating-linear-gradient(90deg,rgba(237,231,218,.10) 0 2px,transparent 2px 72px)}
.nf-pulse{animation:nfPulse 1.8s ease-out infinite}
@keyframes nfPulse{from{transform:scale(.6);opacity:.8}to{transform:scale(2.4);opacity:0}}
.nf-pin{animation:nfDrop .45s cubic-bezier(.3,1.6,.5,1) both}
@keyframes nfDrop{from{transform:translateY(-30px) scale(.6);opacity:0}to{transform:none;opacity:1}}
.nf-sheet{animation:nfUp .5s cubic-bezier(.2,1,.3,1) both}
@keyframes nfUp{from{transform:translateY(100%)}to{transform:none}}
.fi-food{animation:fiKb 8.6s linear both}
@keyframes fiKb{from{transform:scale(1.05)}to{transform:scale(1.25)}}
.fi-bar{width:100%;transform-origin:left;animation:fiBar 8.6s linear both}
@keyframes fiBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.fi-s1{animation:fiS1 1.4s cubic-bezier(.2,1,.3,1) both}
@keyframes fiS1{0%{opacity:0;transform:scale(.8)}20%{opacity:1;transform:scale(1)}80%{opacity:1;transform:scale(1.04)}100%{opacity:0;transform:scale(1.15)}}
.fi-s2{opacity:0;animation:fiS2 1.9s 1.3s ease both}
@keyframes fiS2{0%{opacity:0}8%{opacity:1}88%{opacity:1}100%{opacity:0}}
.fi-line{position:relative;width:max-content;opacity:0;animation:fiLine .3s cubic-bezier(.2,1,.3,1) both}
@keyframes fiLine{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:none}}
.fi-line::after{content:"";position:absolute;left:-6px;right:-6px;top:50%;height:6px;border-radius:6px;background:#E5A93C;transform:scaleX(0);transform-origin:left;animation:fiStrike .3s ease forwards}
.fi-l1{animation-delay:1.4s}.fi-l1::after{animation-delay:1.7s}
.fi-l2{animation-delay:1.85s}.fi-l2::after{animation-delay:2.15s}
.fi-l3{animation-delay:2.3s}.fi-l3::after{animation-delay:2.6s}
@keyframes fiStrike{to{transform:scaleX(1)}}
.fi-s3{opacity:0;animation:fiS3out 1.5s 3.1s cubic-bezier(.2,1,.3,1) both}
@keyframes fiS3out{0%{opacity:0;transform:translateY(30px) scale(.95)}20%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0;transform:translateY(-20px)}}
.fi-flash{opacity:0;animation:fiFlash .7s 3.05s ease both}
@keyframes fiFlash{0%{opacity:0}30%{opacity:.5}100%{opacity:0}}
.fi-ord{opacity:0;animation:fiOrd 2.7s 4.6s ease both}
@keyframes fiOrd{0%{opacity:0;transform:translateY(40px)}12%{opacity:1;transform:none}90%{opacity:1}100%{opacity:0}}
.fi-card{animation:fiCard 2.6s 4.6s cubic-bezier(.5,0,.3,1) both}
@keyframes fiCard{0%,42%{transform:none;opacity:1}55%,100%{transform:scale(.25) translate(-260px,420px);opacity:0}}
.fi-obtn{animation:fiPress .25s 5.45s ease both}
@keyframes fiPress{0%{transform:scale(1)}50%{transform:scale(.92);background:#F2C46A}100%{transform:scale(1)}}
.fi-ripple{position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px;border-radius:999px;border:3px solid #EDE7DA;opacity:0;animation:fiRip .6s 5.45s ease-out both}
@keyframes fiRip{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(6)}}
.fi-finger{opacity:0;animation:fiTap 1.1s 4.75s cubic-bezier(.3,0,.3,1) both}
@keyframes fiTap{0%{opacity:0;transform:translate(60px,140px)}55%{opacity:1;transform:translate(0,8px)}70%{transform:translate(0,0) scale(.92)}82%{transform:translate(0,4px) scale(1)}100%{opacity:0;transform:translate(30px,60px)}}
.fi-route{stroke-dasharray:6 8;stroke-dashoffset:300;opacity:0;animation:fiRoute 1s 5.8s linear both}
@keyframes fiRoute{from{stroke-dashoffset:300;opacity:1}to{stroke-dashoffset:0;opacity:1}}
.fi-bag{offset-path:path("M30 30 C 120 10, 180 140, 290 110");opacity:0;animation:fiBag 1.1s 5.75s cubic-bezier(.5,0,.4,1) both}
@keyframes fiBag{0%{offset-distance:0%;opacity:0}10%{opacity:1}100%{offset-distance:100%;opacity:1}}
.fi-door{transform-box:fill-box;transform-origin:center;animation:fiDoor .4s 6.8s cubic-bezier(.3,1.6,.5,1) both}
@keyframes fiDoor{0%{transform:scale(1)}50%{transform:scale(1.25)}100%{transform:scale(1)}}
.fi-at{opacity:0;animation:fiAt .4s 6.8s ease both}
@keyframes fiAt{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.fi-lock{opacity:0;animation:fiS3 .6s 7.25s cubic-bezier(.2,1,.3,1) both}
@keyframes fiS3{from{opacity:0;transform:translateY(30px) scale(.95)}to{opacity:1;transform:none}}
.nv-shakeA{animation:nvShakeA .35s ease}.nv-shakeB{animation:nvShakeB .35s ease}
@keyframes nvShakeB{0%,100%{transform:none}25%{transform:translateX(-6px) rotate(-2deg)}75%{transform:translateX(6px) rotate(2deg)}}
@keyframes nvShakeA{0%,100%{transform:none}25%{transform:translateX(-6px) rotate(-2deg)}75%{transform:translateX(6px) rotate(2deg)}}
.nv-nope{opacity:0;transform:translate(-50%,-50%) rotate(-8deg);animation:nvNope .7s ease both}
@keyframes nvNope{0%{opacity:0;transform:translate(-50%,-50%) rotate(-8deg) scale(.6)}25%{opacity:1;transform:translate(-50%,-50%) rotate(-8deg) scale(1.1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%) rotate(-8deg) scale(1)}}
@media (prefers-reduced-motion: reduce){.nf-in,.nf-in-back,.nf-head,.nf-rise,.nf-pin,.nf-sheet,.fi-food{animation:none}}
`
