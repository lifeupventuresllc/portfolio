'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'
import { createClient, clearLocalSession } from '@/lib/supabase/client'
import NewFlow, { NewBuilding, NewReveal, NEVER, type LifeStage } from './NewFlow'
import SaveGate from './SaveGate'

type Targets = { calories: number; protein_g: number; carbs_g: number; fats_g: number; bmr: number; tdee: number }


// Module-level, NOT defined inside the component — the real cause of the reported
// "types one letter, keyboard closes, screen shakes" bug on this page. A component
// defined inside a render function gets a brand-new identity every render; typing
// in ANY field on the page re-renders the whole component (every keystroke calls
// setF), so Screen/Q/Hint/LQ/LHint were all being redefined every letter — React
// saw a "different" component type and unmounted + remounted the whole subtree,
// including whichever input was focused. Same bug class already caught and fixed
// in find-your-fix/page.tsx; it just never got ported over here. Screen needs
// step/dir from the enclosing component's state, so those are now explicit props
// instead of closed-over locals.
function Screen({ step, dir, children }: { step: number; dir: 'fwd' | 'back'; children: React.ReactNode }) {
  return <div key={step} className={dir === 'fwd' ? 'q-in-fwd' : 'q-in-back'}>{children}</div>
}
const Q = ({ children }: { children: React.ReactNode }) => <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-1">{children}</h2>
const Hint = ({ children }: { children: React.ReactNode }) => <p className="text-ivory/60 text-sm mb-7">{children}</p>

// Required tier: the minimum to get her a real plan fast (name, goal, focus, body).
// Everything else is a second, optional pass she's invited into AFTER she's already
// seen her numbers — not a wall she has to clear before experiencing anything.
// 'location', 'injuries', and 'food' (foods loved/avoided) moved here from the
// optional tier — these aren't cosmetic, they directly drive plan accuracy and,
// for injuries, safety. Skipping the optional pass used to mean a silently
// generic plan: gym-track even for a home-only member, zero injury awareness,
// no food preferences. activity_level moved into the 'body' required step too
// (same question the standalone Calorie Blueprint asks — it feeds directly
// into the calorie math, so it shouldn't be skippable via the optional tier).
// Everything else stays deferred (weekly_food_budget merged into the 'cook'
// optional step; experience/training_style/days_per_week/postpartum/other_info
// are genuinely secondary refinements).
// 'why' added 2026-09-24 (Asa's ask, mockup-approved) — right after 'goal':
// what she picks there is WHAT she's doing, this is WHY. Optional (Continue
// always enabled, no minimum pick) — it just personalizes messaging later,
// never gates plan-building the way goal/focus/body genuinely need to.
// 'eating' added 2026-10-19 (Asa's Nutrition tab, mockup v3): how she eats
// (cook vs eat out) + her money for one meal, asked once here so the
// Nutrition tab already knows and never makes her decide.
// 2026-10-25: the required tier is now the new dark flow in ./NewFlow.tsx
// (name + why → goal → body → her days → where/how often → anything hurt →
// food intro → never foods → how she eats + weekly money → location).
// Training days and the weekly food budget moved into it; focus area and
// foods she loves stay as she last set them (fine-tune later).
const OPTIONAL_STEPS = [
  'target', 'experience', 'training_style', 'cook', 'postpartum', 'other',
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
  // Real fix, live feedback (beta feedback Priority 1, 2026-08-25): "nothing
  // should be hidden behind other features" — editing used to mean picking
  // between two separate links (required tier vs. "tier=optional") with no
  // way to reach both without knowing they're two different things. The
  // dashboard's Settings icon links here with edit=true; the required tier's
  // last step chains straight into the optional questions instead of ending,
  // so one entry point reaches everything in one sitting.
  const editMode = searchParams.get('edit') === 'true'

  // Anonymous-access, Phase 1: an anonymous session has no password to log
  // back in with, so the existing unconditional "Sign out" button would
  // permanently discard her only path back to unsaved progress if tapped
  // mid-flow. Defaults false so a real logged-in user sees it immediately,
  // same as before — only hides once we've actually confirmed she's
  // anonymous.
  const [isAnonymous, setIsAnonymous] = useState(false)

  // "Save your plan as you go" first screen (./SaveGate.tsx, 2026-10-29):
  // only for an anonymous guest who hasn't answered yet — never for a real
  // signed-in account, never in edit mode / the optional pass. `auth` starts
  // unknown so neither a real user nor a guest ever sees the wrong screen
  // flash first. ?link=taken|failed is set by
  // app/api/auth/callback when a Google link didn't go through.
  const noGate = editMode || startInOptional
  const [auth, setAuth] = useState<'checking' | 'anon' | 'real'>('checking')
  const linkParam = searchParams.get('link')
  const [linkNotice, setLinkNotice] = useState<'taken' | 'failed' | null>(linkParam === 'taken' || linkParam === 'failed' ? linkParam : null)
  const [gateSkipped, setGateSkipped] = useState(() => {
    try { return sessionStorage.getItem('luf-save-gate-skipped') === '1' } catch { return false }
  })
  function skipGate() {
    setGateSkipped(true); setLinkNotice(null)
    try { sessionStorage.setItem('luf-save-gate-skipped', '1') } catch { /* ignore */ }
    if (linkParam) window.history.replaceState(null, '', window.location.pathname)
    window.scrollTo(0, 0)
  }
  useEffect(() => {
    // getSession() reads the local session — instant, and this only picks
    // which screen to show (every server route still checks the real user).
    createClient().auth.getSession().then(({ data }) => {
      const u = data.session?.user
      const anon = !u || !!u.is_anonymous
      setIsAnonymous(!!u?.is_anonymous)
      setAuth(anon ? 'anon' : 'real')
      // Just connected Google: her first name is already known — fill the
      // first question so she doesn't retype it (only if it's still blank).
      const full = (u?.user_metadata?.full_name || u?.user_metadata?.name || '') as string
      if (!anon && full.trim()) setF((s) => (s.name ? s : { ...s, name: full.trim().split(' ')[0] }))
    }).catch(() => setAuth('real'))
  }, [])

  async function handleSignOut() {
    // Real bug found live, 2026-09-09: router.push('/') + router.refresh()
    // (in that order) let a signed-out name/session linger on screen — see
    // components/ClientMenu.tsx's handleSignOut for the full explanation.
    // A hard navigation sidesteps the whole class of risk. Also see that
    // same file's comment on clearLocalSession() -- signOut() alone doesn't
    // clear the local session if its network call fails.
    await createClient().auth.signOut().catch(() => {})
    clearLocalSession()
    window.location.href = '/'
  }

  const [tier, setTier] = useState<'required' | 'optional'>(startInOptional ? 'optional' : 'required')
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')
  const [f, setF] = useState({
    name: '', focus_area: '', age: '', sex: 'female', heightFt: '5', heightIn: '4', weight_lbs: '',
    target_lbs: '', activity_level: '', experience_level: '', training_location: '',
    days_per_week: '', cook_days_per_week: '', weekly_food_budget: '', food_preferences: '', dislikes_allergies: '',
    postpartum: '', other_info: '', eat_style: '', meal_budget: '',
  })
  // Real multi-select support (Priority 1, 2026-08-25 beta feedback) — she can
  // genuinely want more than one goal at once ("lose fat AND tone/build"), and
  // more than one training style. Arrays, not a single string; order reflects
  // priority (first-picked = primary, same as everywhere downstream that
  // still needs one value — see lib/plan-builder.ts).
  const [goals, setGoals] = useState<string[]>([])
  const [trainingStyles, setTrainingStyles] = useState<string[]>([])
  const [payoffs, setPayoffs] = useState<string[]>([])
  const primaryGoal = goals[0] || ''
  const [injuries, setInjuries] = useState<string[]>([])
  // New intake (2026-10-25): pregnant/nursing safety, her why in her own
  // words, and "never" foods as taps (saved into dislikes_allergies).
  const [lifeStage, setLifeStage] = useState<LifeStage>('none')
  const [whyOwn, setWhyOwn] = useState('')
  const [never, setNever] = useState<string[]>([])
  const [neverOther, setNeverOther] = useState('')
  const [firstWorkout, setFirstWorkout] = useState<string | null>(null)
  const [track, setTrack] = useState<string | null>(null)
  const [phase, setPhase] = useState<'quiz' | 'building' | 'done'>('quiz')
  const [targets, setTargets] = useState<Targets | null>(null)
  const [error, setError] = useState('')

  function applyBlueprint(b: Record<string, unknown>) {
    const ACTIVITY_MAP: Record<string, string> = { none: 'sedentary', sedentary: 'sedentary', light: 'light', moderate: 'moderate', active: 'active', very_active: 'active' }
    setF((s) => ({
      ...s,
      name: (b.name as string) || s.name,
      age: b.age ? String(b.age) : s.age,
      sex: (b.sex as string) || s.sex,
      heightFt: b.height_in ? String(Math.floor((b.height_in as number) / 12)) : s.heightFt,
      heightIn: b.height_in ? String((b.height_in as number) % 12) : s.heightIn,
      weight_lbs: b.weight_lbs ? String(b.weight_lbs) : s.weight_lbs,
      target_lbs: b.goal_weight_lbs ? String(b.goal_weight_lbs) : s.target_lbs,
      activity_level: ACTIVITY_MAP[b.activity as string] || s.activity_level,
      days_per_week: b.workout_days ? String(b.workout_days) : s.days_per_week,
    }))
    if (b.goal) setGoals((g) => (g.length ? g : [b.goal as string]))
  }



  // Real gap found live (Priority 1, 2026-08-25 beta feedback — "can't go back
  // and change my preferences"): this used to only ever pull her real existing
  // intake forward for the OPTIONAL-tier deep link (?tier=optional). Reopening
  // the REQUIRED tier — the one with goal/focus/body/location, the fields she
  // actually asked to revisit — always started from a blank form, silently
  // defaulted to the CALORIE BLUEPRINT lead-magnet data if she'd ever done that
  // (irrelevant once she's a real member with her own real answers), or just
  // blank otherwise. One effect now, tried in the right priority order: her
  // own real saved intake first (covers either tier, goal/training_style/focus
  // included), the free-Blueprint carryover only as a fallback for someone who
  // genuinely has no real intake yet.
  useEffect(() => {
    fetch('/api/plan/intake-lookup').then((r) => r.json()).then((d) => {
      if (!d?.found || !d.intake) {
        // No real intake yet — try the free Calorie Blueprint carryover instead.
        fetch('/api/plan/blueprint-lookup').then((r2) => r2.json()).then((d2) => {
          if (d2?.found && d2.blueprint) applyBlueprint(d2.blueprint)
        }).catch(() => {})
        return
      }
      const i = d.intake
      setF((s) => ({
        ...s,
        name: d.name || s.name,
        age: i.age != null ? String(i.age) : s.age,
        sex: i.sex || s.sex,
        heightFt: i.height_in ? String(Math.floor(i.height_in / 12)) : s.heightFt,
        heightIn: i.height_in ? String(i.height_in % 12) : s.heightIn,
        weight_lbs: i.weight_lbs != null ? String(i.weight_lbs) : s.weight_lbs,
        target_lbs: i.target_lbs != null ? String(i.target_lbs) : s.target_lbs,
        activity_level: i.activity_level || s.activity_level,
        experience_level: i.experience_level || s.experience_level,
        training_location: i.training_location || s.training_location,
        days_per_week: i.days_per_week ? String(i.days_per_week) : s.days_per_week,
        cook_days_per_week: i.cook_days_per_week != null ? String(i.cook_days_per_week) : s.cook_days_per_week,
        weekly_food_budget: i.weekly_food_budget != null ? String(i.weekly_food_budget) : s.weekly_food_budget,
        food_preferences: i.food_preferences || s.food_preferences,
        dislikes_allergies: i.dislikes_allergies || s.dislikes_allergies,
        focus_area: i.focus_area || s.focus_area,
        postpartum: i.postpartum ? 'yes' : s.postpartum,
        other_info: i.other_info || s.other_info,
        eat_style: i.eat_style || s.eat_style,
        meal_budget: i.meal_budget != null ? String(i.meal_budget) : s.meal_budget,
      }))
      if (Array.isArray(i.injuries)) setInjuries(i.injuries)
      if (Array.isArray(i.goals) && i.goals.length) setGoals(i.goals)
      if (Array.isArray(i.training_styles) && i.training_styles.length) setTrainingStyles(i.training_styles)
      if (Array.isArray(i.payoffs) && i.payoffs.length) setPayoffs(i.payoffs)
      if (i.life_stage === 'pregnant' || i.life_stage === 'nursing') setLifeStage(i.life_stage)
      if (i.why_own) setWhyOwn(i.why_own)
      // Her saved "never" text back into taps; anything that isn't one of
      // the taps stays in the "anything else" box, never dropped.
      if (i.dislikes_allergies) {
        const parts = String(i.dislikes_allergies).split(/[,;]+/).map((x: string) => x.trim()).filter(Boolean)
        const chips: string[] = [], rest: string[] = []
        for (const part of parts) {
          const hit = NEVER.find((n) => part.toLowerCase().replace(/^no\s+/, '') === n.toLowerCase())
          if (hit) chips.push(hit); else rest.push(part)
        }
        setNever(chips); setNeverOther(rest.join(', '))
      }
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

  // choosing a single-select option auto-advances (that "texting a coach" feel)
  // 420ms — the 280 bump wasn't enough on its own; against a busy photo
  // thumbnail a thin border+soft shadow barely registers even with time to
  // render. Paired with a much bolder active state above so the flash is
  // actually unmistakable before it advances.
  const pick = (k: string, v: string) => { hapticTap(); set(k, v); setTimeout(next, 420) }

  const firstName = f.name.trim().split(' ')[0] || 'you'

  const total = OPTIONAL_STEPS.length
  const pct = Math.round(((step + 1) / total) * 100)

  async function build(refining: boolean) {
    if (!f.age || !f.weight_lbs) { setError('I just need your age and weight to get your numbers right.'); return }
    const dislikes = [...never.map((n) => n.toLowerCase()), neverOther.trim()].filter(Boolean).join(', ')
    setPhase('building')
    setError('')
    try {
      const height_in = Number(f.heightFt) * 12 + Number(f.heightIn)
      const start = Date.now()
      const res = await fetch('/api/challenge/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, age: Number(f.age), sex: 'female', height_in, weight_lbs: Number(f.weight_lbs),
          goal: primaryGoal || 'lose', goals, target_lbs: Number(f.target_lbs) || null, focus_area: f.focus_area || 'overall',
          activity_level: f.activity_level || 'moderate', experience_level: f.experience_level || 'beginner',
          training_location: f.training_location || 'gym', days_per_week: Number(f.days_per_week) || 3,
          cook_days_per_week: Number(f.cook_days_per_week) || 2, weekly_food_budget: Number(f.weekly_food_budget) || null,
          food_preferences: f.food_preferences, dislikes_allergies: dislikes,
          injuries, injuries_limitations: '', postpartum: f.postpartum === 'yes',
          training_style: trainingStyles[0] || 'none', training_styles: trainingStyles, other_info: f.other_info,
          payoffs, why_own: whyOwn, life_stage: lifeStage,
          eat_style: f.eat_style || undefined,
          meal_budget: Number(f.meal_budget) || (f.eat_style ? (f.eat_style === 'cook' ? 6 : 12) : undefined),
          refining,
        }),
      })
      const data = await res.json()
      // let the "building" moment breathe for at least ~2.2s (skip the pause on a quiet refine)
      const wait = refining ? 0 : Math.max(0, 2200 - (Date.now() - start))
      await new Promise((r) => setTimeout(r, wait))
      if (data.success) {
        setTargets(data.targets)
        setFirstWorkout(data.firstWorkout || null); setTrack(data.track || null)
        if (refining) { router.refresh(); router.push('/plan') }
        else setPhase('done')
      } else { setError(data.error || 'Something went wrong.'); setPhase('quiz') }
    } catch { setError('Something went wrong. Try again.'); setPhase('quiz') }
  }

  function startOptionalTier() {
    setTier('optional'); setDir('fwd'); setError(''); setStep(0); setPhase('quiz')
  }

  // ---------- shared UI (dark — used by the optional second-pass + building/done chrome it shares) ----------
  const opt = (active: boolean) => `w-full text-left px-5 py-4 rounded-2xl border font-semibold transition-all duration-200 ${active ? 'bg-charcoal bg-gradient-to-br from-gold/20 to-charcoal border-gold scale-[1.01] text-gold' : 'bg-charcoal border-smoke hover:border-gold/50 hover:bg-charcoal/70 text-white'}`
  const input = 'w-full px-4 py-3.5 bg-obsidian border border-smoke rounded-xl text-white focus:outline-none focus:border-gold transition-colors'
  const primaryBtn = 'w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-[1.02] disabled:opacity-40'
  // ---------- BUILDING moment ----------
  if (phase === 'building') {
    if (tier === 'required') return <NewBuilding name={f.name.trim().split(' ')[0]} />
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6 bg-obsidian">
        <div className="text-center q-in-fwd">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" style={{ animationDuration: '0.9s' }} />
          </div>
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">One moment</p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">Fine-tuning your plan…</h1>
          <p className="text-ivory/60 text-sm">Crunching your numbers and matching your workout for {firstName}.</p>
        </div>
      </div>
    )
  }

  // ---------- DONE / reveal ----------
  if (phase === 'done' && targets) {
    return (
      <NewReveal
        name={f.name.trim().split(' ')[0]} targets={targets} firstWorkout={firstWorkout} track={track} isAnonymous={isAnonymous}
        // Real gap found live: router.push alone could serve Next's cached
        // pre-intake /plan — router.refresh() first so it's fresh.
        onGo={() => { router.refresh(); router.push('/plan') }}
        onSave={() => router.push('/plan/save')}
        onFineTune={startOptionalTier}
      />
    )
  }

  // ---------- REQUIRED TIER (new dark flow, ./NewFlow.tsx) ----------
  if (tier === 'required') {
    if (!noGate && auth === 'checking') {
      return <div className="min-h-[100dvh]" style={{ background: '#021F16', marginBottom: 'calc(-4.5rem - env(safe-area-inset-bottom))' }} />
    }
    if (!noGate && auth === 'anon' && (!gateSkipped || linkNotice)) {
      return (
        <SaveGate
          notice={linkNotice}
          onSkip={skipGate}
          onEmail={() => router.push(`/plan/save?redirect=${encodeURIComponent('/plan/intake')}`)}
          onExit={() => { router.refresh(); router.push('/plan') }}
        />
      )
    }
    return (
      <NewFlow
        f={f} setF={(fn) => setF((s) => ({ ...s, ...fn(s) }))}
        goals={goals} setGoals={setGoals} payoffs={payoffs} setPayoffs={setPayoffs}
        injuries={injuries} setInjuries={setInjuries}
        lifeStage={lifeStage} setLifeStage={setLifeStage} whyOwn={whyOwn} setWhyOwn={setWhyOwn}
        never={never} setNever={setNever} neverOther={neverOther} setNeverOther={setNeverOther}
        error={error} editMode={editMode}
        onBuild={() => build(false)}
        onEditDone={() => { setTier('optional'); setStep(0) }}
        onExit={() => { router.refresh(); router.push('/plan') }}
      />
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
          {/* Same real bug + fix as the required-tier header above — see its comment. */}
          <button onClick={() => { router.refresh(); router.push('/plan') }} className="text-ivory/40 hover:text-gold text-xs whitespace-nowrap">Home</button>
          {!isAnonymous && <button onClick={handleSignOut} className="text-ivory/40 hover:text-gold text-xs whitespace-nowrap">Sign out</button>}
        </div>
      </div>

      <div className="max-w-lg w-full mx-auto flex-1">
        <Screen step={step} dir={dir}>
          {s === 'target' && (() => {
            const delta = f.target_lbs ? Number(f.target_lbs) : 10
            const startW = Number(f.weight_lbs) || 0
            const goalW = primaryGoal === 'gain' ? startW + delta : startW - delta
            return (<>
              <Q>How much are we {primaryGoal === 'gain' ? 'building' : 'shifting'}?</Q>
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
              <p className="text-center text-ivory/50 text-sm mb-8">{delta} lbs {primaryGoal === 'gain' ? 'to build' : 'to lose'}</p>
              <button onClick={next} className={primaryBtn}>Continue →</button>
              <button onClick={() => { set('target_lbs', ''); next() }} className="w-full text-center text-ivory/40 text-xs mt-4 hover:text-gold transition-colors">Not sure — you tell me →</button>
            </>)
          })()}

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
            {/* Multi-select (Priority 1, 2026-08-25 beta feedback) — same
                pattern as the goal step. "No strong preference" is mutually
                exclusive with real styles (picking it clears any real style
                selected, and picking a real style clears it) since it isn't
                a genuine additional preference. */}
            <Hint>Tap all that apply — no wrong answer.</Hint>
            <div className="space-y-3 mb-6">
              {[
                { v: 'compound', l: '🔗 Full body / compound movements', d: 'Moves that work multiple muscles each rep' },
                { v: 'split', l: '🎯 Split / one muscle group at a time', d: 'Focused, isolated work per day' },
                { v: 'cardio', l: '🏃🏽 Cardio-first', d: 'Heart rate up, calorie burn' },
                { v: 'none', l: '🤷🏽 No strong preference', d: "I'll trust your programming" },
              ].map((o) => (
                <button key={o.v} onClick={() => { hapticTap(); setTrainingStyles((a) => o.v === 'none' ? ['none'] : (a.includes(o.v) ? a.filter((x) => x !== o.v) : [...a.filter((x) => x !== 'none'), o.v])) }} className={opt(trainingStyles.includes(o.v))}>
                  <span className="block">{o.l}</span><span className={`block text-xs font-normal mt-0.5 ${trainingStyles.includes(o.v) ? 'text-gold/70' : 'text-ivory/40'}`}>{o.d}</span>
                </button>
              ))}
            </div>
            <button onClick={next} disabled={!trainingStyles.length} className={primaryBtn}>Continue →</button>
          </>)}

          {s === 'cook' && (<>
            <Q>How many days do you want to cook?</Q>
            <Hint>Cook once and I&apos;ll stretch it, or cook fresh more often — your call.</Hint>
            <div className="space-y-3 mb-7">
              {[{ v: '1', l: '1 day', d: 'Cook once, eat all week' }, { v: '2', l: '2 days', d: 'The sweet spot — always fresh' }, { v: '3', l: '3 days', d: 'Max variety' }].map((o) => (
                <button key={o.v} onClick={() => { hapticTap(); set('cook_days_per_week', o.v) }} className={opt(f.cook_days_per_week === o.v)}>
                  <span className="block">{o.l}</span><span className={`block text-xs font-normal mt-0.5 ${f.cook_days_per_week === o.v ? 'text-gold/70' : 'text-ivory/40'}`}>{o.d}</span>
                </button>
              ))}
            </div>
            <button onClick={next} disabled={!f.cook_days_per_week} className={primaryBtn}>Continue →</button>
          </>)}

          {s === 'postpartum' && (<>
            <Q>Are you currently postpartum?</Q>
            <Hint>If you are, I&apos;ll prioritize gentler, postpartum-friendly core work in your plan.</Hint>
            <div className="space-y-3">
              <button onClick={() => pick('postpartum', 'yes')} className={opt(f.postpartum === 'yes')}>Yes</button>
              <button onClick={() => pick('postpartum', 'no')} className={opt(f.postpartum === 'no')}>No</button>
            </div>
          </>)}

          {s === 'other' && (<>
            <Q>Anything else I should know?</Q>
            <Hint>Totally optional — schedule quirks, past experience, whatever&apos;s on your mind.</Hint>
            <textarea
              value={f.other_info} onChange={(e) => set('other_info', e.target.value)}
              placeholder="e.g. I travel for work every other week, I've done this before and it didn't stick because..."
              rows={4} className={`${input} resize-none mb-6`}
            />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button onClick={() => build(true)} className={primaryBtn}>✨ Update my plan</button>
          </>)}
        </Screen>
      </div>
    </div>
  )
}
