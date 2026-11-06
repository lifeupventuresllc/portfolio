'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { effectiveGoal } from '@/lib/goals'
import { PAYOFF_OPTIONS } from '@/lib/payoff'
import { hapticTap } from '@/lib/haptics'
import { C, HEAD, MONO, BODY, NEVER, FOOD_ICON, perMeal } from '@/app/plan/intake/NewFlow'

type Current = {
  name: string; age: number; sex: string; height_in: number; weight_lbs: number
  target_lbs: number | null; activity_level: string; experience_level: string
  training_location: string; days_per_week: number; weekly_food_budget: number | null
  food_preferences: string; dislikes_allergies: string; injuries: string[]
  postpartum: boolean; other_info: string; cook_days_per_week: number
  focus_area: string; goals: string[]; training_styles: string[]
  // 2026-09-24 — real "what's your why" answer, editable here so changing
  // it never means restarting the full intake (the exact trap Asa caught
  // once already for "change my goal" — see the memory on that fix).
  payoffs: string[]
  eat_style: string
}

const GOALS = [
  { v: 'lose', l: '🔥 Lose fat', d: 'Lean out, keep your curves' },
  { v: 'gain', l: '💪🏽 Build & tone', d: 'Add shape and strength' },
  { v: 'maintain', l: '⚖️ Maintain', d: 'Hold steady, feel great' },
]
const FOCUS_AREAS = [
  { v: 'core', l: 'Core & waistline' },
  { v: 'legs', l: 'Legs & glutes' },
  { v: 'arms', l: 'Arms & back' },
  { v: 'overall', l: 'All-over' },
]
// Same two choices as the intake's "How do you like to lift?" (2026-11-04).
const STYLES = [
  { v: 'compound', l: 'Compound', d: 'Big moves, fewer exercises. Recommended.' },
  { v: 'split', l: 'Classic', d: 'One muscle at a time.' },
]
const LEVELS = [{ v: 'beginner', l: 'Beginner' }, { v: 'intermediate', l: 'Intermediate' }, { v: 'advanced', l: 'Advanced' }]
const EATS = [{ v: 'cook', l: 'I cook' }, { v: 'mix', l: 'A mix' }, { v: 'out', l: 'Eat out' }]

// Her saved "never" text ("onions, peanuts (allergy), olives") back into
// taps; anything that isn't one of the taps stays as typed.
function readNever(text: string) {
  const never: string[] = [], allergy: string[] = [], rest: string[] = []
  for (const part of text.split(/[,;]+/).map((x) => x.trim()).filter(Boolean)) {
    const hit = NEVER.find((n) => part.toLowerCase().replace(/\s*\(allergy\)/, '').replace(/^no\s+/, '') === n.toLowerCase())
    if (hit) { never.push(hit); if (/\(allergy\)/i.test(part)) allergy.push(hit) } else rest.push(part)
  }
  return { never, allergy, other: rest.join(', ') }
}

export default function PreferencesForm({ current }: { current: Current }) {
  const saved0 = readNever(current.dislikes_allergies)
  const [goals, setGoals] = useState<string[]>(current.goals)
  const [focusArea, setFocusArea] = useState(current.focus_area)
  const [trainingStyles, setTrainingStyles] = useState<string[]>(current.training_styles)
  const [level, setLevel] = useState(current.experience_level || 'beginner')
  // 2026-11-05 (Asa): switch Home ↔ Gym any time, without redoing the intake.
  const [place, setPlace] = useState(current.training_location === 'home' ? 'home' : 'gym')
  const [payoffs, setPayoffs] = useState<string[]>(current.payoffs)
  // 2026-11-06 (Asa approved ~/Desktop/Preferences-Mockup.html): her food
  // money, how she eats and never-foods/allergies, editable after intake.
  const [weekly, setWeekly] = useState(current.weekly_food_budget || 150)
  const [eatStyle, setEatStyle] = useState(['cook', 'out', 'mix'].includes(current.eat_style) ? current.eat_style : 'mix')
  const [never, setNever] = useState<string[]>(saved0.never)
  const [allergy, setAllergy] = useState<string[]>(saved0.allergy)
  const [more, setMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Real gap found live, 2026-09-21 (beta feedback item 3, "everything ONE
  // tap"): pick goal + focus + style, THEN find and tap Save = 3-5 taps plus a
  // Save. Now every pick saves itself. Latest picks live in a ref so a burst
  // of taps (multi-select goals/styles, the money slider) is debounced into
  // ONE save of the final selection, and a tap during an in-flight save queues
  // one more save instead of being lost. Same endpoint + payload as the old button.
  const latest = useRef({ goals, focusArea, trainingStyles, payoffs, level, place, weekly, eatStyle, never, allergy })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const queued = useRef(false)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function change(next: Partial<typeof latest.current>, wait = 400) {
    latest.current = { ...latest.current, ...next }
    if (next.goals) setGoals(next.goals)
    if (next.focusArea !== undefined) setFocusArea(next.focusArea)
    if (next.trainingStyles) setTrainingStyles(next.trainingStyles)
    if (next.payoffs) setPayoffs(next.payoffs)
    if (next.level) setLevel(next.level)
    if (next.place) setPlace(next.place)
    if (next.weekly !== undefined) setWeekly(next.weekly)
    if (next.eatStyle) setEatStyle(next.eatStyle)
    if (next.never) setNever(next.never)
    if (next.allergy) setAllergy(next.allergy)
    setSaved(false); setError('')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(save, wait)
  }
  const toggleGoal = (v: string) => { const a = latest.current.goals; change({ goals: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] }) }
  const toggleStyle = (v: string) => change({ trainingStyles: [v] })
  const isClassic = trainingStyles.includes('split') && !trainingStyles.includes('compound')
  const togglePayoff = (v: string) => { const a = latest.current.payoffs; change({ payoffs: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] }) }
  // Same taps as intake: once = never eat, twice = allergy, again = off.
  const tapFood = (n: string) => {
    const { never: nv, allergy: al } = latest.current
    if (!nv.includes(n)) change({ never: [...nv, n] })
    else if (!al.includes(n)) change({ allergy: [...al, n] })
    else change({ never: nv.filter((x) => x !== n), allergy: al.filter((x) => x !== n) })
  }

  async function save() {
    const { goals, focusArea, trainingStyles, payoffs, level, place, weekly, eatStyle, never, allergy } = latest.current
    if (!goals.length) { setError('Pick at least one goal.'); return }
    if (inFlight.current) { queued.current = true; return }
    inFlight.current = true
    setSaving(true); setError(''); setSaved(false)
    const dislikes = [...never.map((n) => (allergy.includes(n) ? `${n.toLowerCase()} (allergy)` : n.toLowerCase())), saved0.other].filter(Boolean).join(', ')
    try {
      const res = await fetch('/api/challenge/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Everything she already answered, unchanged — only what this
          // screen shows is what it lets her edit.
          name: current.name, age: current.age, sex: current.sex, height_in: current.height_in,
          weight_lbs: current.weight_lbs, target_lbs: current.target_lbs,
          activity_level: current.activity_level, experience_level: level,
          training_location: place, days_per_week: current.days_per_week,
          cook_days_per_week: current.cook_days_per_week, weekly_food_budget: weekly,
          food_preferences: current.food_preferences, dislikes_allergies: dislikes,
          eat_style: eatStyle, meal_budget: perMeal(eatStyle, weekly).mealBudget,
          injuries: current.injuries, postpartum: current.postpartum, other_info: current.other_info,
          refining: true,
          goals, goal: effectiveGoal(goals), focus_area: focusArea,
          training_styles: trainingStyles, training_style: trainingStyles[0] || 'none',
          payoffs,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save')
      setSaved(true)
    } catch {
      // Selection is kept on screen; only the message changes.
      setError("Couldn't save just now. Tap again to retry.")
    } finally {
      inFlight.current = false
      setSaving(false)
      if (queued.current) { queued.current = false; save() }
    }
  }

  return (
    <div className="min-h-[100dvh] px-4 pb-16" style={{ background: C.bg, color: C.ink, fontFamily: BODY, paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
      <div className="max-w-md mx-auto flex flex-col">
        <a href="/plan" onClick={() => hapticTap()} className="nf-press self-start flex items-center gap-2 rounded-full pl-3 pr-4" style={{ height: 44, background: 'rgba(237,231,218,.08)', fontFamily: MONO, fontWeight: 700, fontSize: 12, letterSpacing: '.12em', color: C.ink }}>
          <span aria-hidden style={{ fontSize: 18 }}>‹</span> MY PLAN
        </a>
        <span className="mt-4" style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12, letterSpacing: '.12em', color: C.gold }}>YOUR PLAN</span>
        <h1 style={{ margin: '4px 0 0', fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 46, lineHeight: 0.9, textTransform: 'uppercase' }}>Change anything.</h1>
        <p style={{ margin: '6px 0 0', fontSize: 16, color: C.mute }}>Every tap saves. Your plan updates right away.</p>

        <Label>Where do you work out?</Label>
        <div className="grid grid-cols-2 gap-2">
          {([['home', '🏠 Home'], ['gym', '🏋️ Gym']] as const).map(([v, l]) => (
            <Tile key={v} on={place === v} center onClick={() => change({ place: v })}>{l}</Tile>
          ))}
        </div>

        <Label>Your level</Label>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((o) => <Tile key={o.v} on={level === o.v} center small onClick={() => change({ level: o.v })}>{o.l}</Tile>)}
        </div>

        <Label>How you like to lift</Label>
        <div className="flex flex-col gap-2">
          {STYLES.map((o) => (
            <Tile key={o.v} on={o.v === 'split' ? isClassic : !isClassic} onClick={() => toggleStyle(o.v)}>
              {o.l}<span className="block mt-0.5" style={{ fontSize: 13, fontWeight: 500, color: C.mute }}>{o.d}</span>
            </Tile>
          ))}
        </div>

        <Label>Your goal (pick all that apply)</Label>
        <div className="flex flex-col gap-2">
          {GOALS.map((o) => (
            <Tile key={o.v} on={goals.includes(o.v)} onClick={() => toggleGoal(o.v)}>
              {o.l}<span className="block mt-0.5" style={{ fontSize: 13, fontWeight: 500, color: C.mute }}>{o.d}</span>
            </Tile>
          ))}
        </div>

        <Label>Food money a week</Label>
        <div className="flex items-baseline justify-between">
          <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 40, lineHeight: 1 }}>${weekly}</span>
          <span style={{ fontSize: 14, color: C.mute }}>About ${Math.round(weekly / 7)} a day</span>
        </div>
        <label htmlFor="pref-weekly" className="sr-only">Food money a week</label>
        <input id="pref-weekly" type="range" min={40} max={300} step={5} value={weekly} className="pf-range mt-3"
          onChange={(e) => { hapticTap(4); change({ weekly: Number(e.target.value) }, 900) }} />

        <Label>How do you eat?</Label>
        <div className="grid grid-cols-3 gap-2">
          {EATS.map((o) => <Tile key={o.v} on={eatStyle === o.v} center small onClick={() => change({ eatStyle: o.v })}>{o.l}</Tile>)}
        </div>

        <Label>Foods you never eat</Label>
        <span style={{ fontSize: 14, color: C.mute, marginBottom: 8 }}>⚠️ Allergic? Tap it twice.</span>
        <div className="flex flex-wrap gap-2">
          {NEVER.map((n) => {
            const on = never.includes(n)
            const allergic = allergy.includes(n)
            return (
              <button key={n} type="button" onClick={() => { hapticTap(allergic ? 8 : 18); tapFood(n) }} aria-label={allergic ? `${n}: allergy` : on ? `${n}: never eat` : n}
                className="nf-press h-10 rounded-full px-3 text-[14px] font-semibold flex items-center gap-1.5"
                style={{ border: `2px solid ${allergic ? '#FF5A3C' : on ? '#C8452D' : 'rgba(237,231,218,.22)'}`, background: allergic ? '#C8452D' : on ? 'rgba(200,69,45,.18)' : 'transparent', color: allergic ? '#fff' : on ? '#F0B3A6' : C.ink }}>
                <span className="text-[17px] leading-none" aria-hidden>{FOOD_ICON[n]}</span>
                {n}
                {allergic && <span className="rounded-full px-1.5 py-0.5" style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', background: '#fff', color: '#C8452D' }}>ALLERGY</span>}
              </button>
            )
          })}
        </div>

        <button type="button" onClick={() => { hapticTap(); setMore((m) => !m) }} aria-expanded={more}
          className="nf-press mt-6 flex items-center justify-between rounded-[18px] px-4" style={{ height: 52, border: '2px dashed rgba(237,231,218,.2)', color: C.mute, fontSize: 15, fontWeight: 600 }}>
          <span>More: focus area, your why</span><span aria-hidden>{more ? '⌄' : '›'}</span>
        </button>
        {more && (
          <>
            <Label>Focus area</Label>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_AREAS.map((o) => <Tile key={o.v} on={focusArea === o.v} center small onClick={() => change({ focusArea: o.v })}>{o.l}</Tile>)}
            </div>
            {/* 2026-09-24 — real edit path for "what's your why," so changing it
                never means restarting the whole intake (the same trap already
                found + fixed once for the goal question). */}
            <Label>Your why (pick all that apply)</Label>
            <div className="flex flex-col gap-2">
              {PAYOFF_OPTIONS.map((o) => (
                <Tile key={o.v} on={payoffs.includes(o.v)} onClick={() => togglePayoff(o.v)}>
                  {o.label}<span className="block mt-0.5" style={{ fontSize: 13, fontWeight: 500, color: C.mute }}>{o.desc}</span>
                </Tile>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 min-h-[24px] text-center" role="status">
          {error ? <span style={{ fontSize: 15, color: '#FF8A7A' }}>{error}</span>
            : saving ? <span style={{ fontSize: 15, color: C.mute }}>Saving…</span>
            : saved ? <span style={{ fontSize: 15, fontWeight: 600, color: '#9FDCC4' }}>✓ Saved. Your plan&apos;s updated.</span> : null}
        </div>
        {/* The old Save button also jumped to today's workout (?focusUpdated=1,
            beta Priority 1, 2026-08-25). Auto-jumping would interrupt multi-picks,
            so that same destination is now one tap away once she's done. */}
        <a href="/plan/today?focusUpdated=1" className="nf-press mt-3 flex items-center justify-center rounded-full" style={{ height: 58, background: '#FFB21E', color: C.bg, fontFamily: MONO, fontWeight: 700, fontSize: 15, letterSpacing: '.12em' }}>SEE TODAY&apos;S WORKOUT</a>
      </div>
      <style>{`.pf-range{-webkit-appearance:none;appearance:none;width:100%;height:8px;border-radius:999px;background:rgba(237,231,218,.15);outline:none;margin-top:12px}.pf-range::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;border-radius:999px;background:#E5A93C;border:4px solid #021F16;box-shadow:0 0 0 2px #E5A93C}.pf-range::-moz-range-thumb{width:24px;height:24px;border-radius:999px;background:#E5A93C;border:4px solid #021F16}`}</style>
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <span className="mt-6 mb-2 block" style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12, letterSpacing: '.12em', color: C.gold, textTransform: 'uppercase' }}>{children}</span>
}

function Tile({ on, center, small, onClick, children }: { on: boolean; center?: boolean; small?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={() => { hapticTap(); onClick() }} aria-pressed={on}
      className={`nf-press w-full rounded-[18px] py-3 ${small ? 'px-1.5' : 'px-3.5'} ${center ? 'text-center' : 'text-left'}`}
      style={{ minHeight: 56, fontSize: small ? 14 : 16, fontWeight: 700, color: C.ink, border: on ? '3px solid #FFB21E' : '2px solid rgba(237,231,218,.18)', background: on ? 'rgba(255,178,30,.12)' : 'transparent' }}>
      {children}
    </button>
  )
}
