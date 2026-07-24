'use client'

import { useEffect, useState } from 'react'
import Celebration from '@/components/Celebration'
import VoiceButton from '@/components/VoiceButton'
import { useLiveRefresh, localTodayISO, broadcastRefresh } from '@/lib/useLiveRefresh'
import { winAffirmation } from '@/lib/affirmations'

// The living centerpiece of the home screen. She talks to Coach Asa RIGHT HERE — no
// page jump. Warm, minimal, alive: a gold "A" avatar, a personal greeting, and an
// inline conversation. Approving a change refreshes the supporting cards on the spot.
type Msg = { role: 'user' | 'operator'; content: string }
type WorkoutChange = { fromMinutes?: number; toMinutes?: number; swapTo?: string; reason?: string; trackOverride?: 'gym' | 'home' }
type NutritionChange = { calorieDelta?: number; dinnerSuggestion?: string; reason?: string }
type Adjustment = { id: string | null; workoutChange?: WorkoutChange; nutritionChange?: NutritionChange }

// The 4 proactive daily-context questions — Coach Asa asks these FIRST, every
// morning, instead of waiting for her to type. Answers go to /api/plan/daily-context,
// which plans DIRECTLY from the structured fields (not a synthesized sentence run
// through regex matching) — that's what actually swaps today's workout to a home/gym
// track based on where she says she is, instead of just producing a cosmetic label.
const FEELING = [{ v: 'great', l: '😊 Great' }, { v: 'okay', l: '😐 Okay' }, { v: 'tired', l: '😴 Tired' }, { v: 'stressed', l: '😣 Stressed' }]
const TIME = [{ v: 'short', l: '⏱️ 15-20 min' }, { v: 'normal', l: '🕐 About 45 min' }, { v: 'plenty', l: '🕒 Plenty of time' }]
const WHERE = [{ v: 'home', l: '🏠 Home' }, { v: 'gym', l: '🏋️ Gym' }, { v: 'traveling', l: '✈️ Traveling' }]
const GOAL = [{ v: 'push', l: '🔥 Push hard' }, { v: 'showup', l: '💪 Just show up' }, { v: 'recover', l: '🌿 Recover' }]

export default function CoachHero({ firstName }: { firstName: string }) {
  const [workoutDone, setWorkoutDone] = useState(false)
  const [nutri, setNutri] = useState<{ protein: number; target: number } | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<Adjustment | null>(null)
  const [recordingMemo, setRecordingMemo] = useState(false)
  const today = localTodayISO()

  // Daily context quiz — shown once per day until she's answered (or already talked today).
  // Pre-selected with the most common answer for each so "Build my day" is tappable
  // immediately — she can accept the defaults in ONE tap, or override any field first.
  // Same 4 structured fields hit the backend either way — this only removes friction
  // from the front end, the planForDailyContext richness behind it is unchanged.
  const [ctxDone, setCtxDone] = useState(true) // default true so it never flashes before the client check runs
  const [feeling, setFeeling] = useState<string | null>('okay')
  const [time, setTime] = useState<string | null>('normal')
  const [where, setWhere] = useState<string | null>('home')
  const [goal, setGoal] = useState<string | null>('showup')
  // Collapsed by default: one tap accepts today's guessed defaults — same 4 fields
  // still reach the backend either way, she just doesn't have to look at 14 buttons
  // to get there. "Adjust" reveals the full picker only when something's actually different.
  const [ctxExpanded, setCtxExpanded] = useState(false)

  useEffect(() => {
    try { setCtxDone(localStorage.getItem('luf_daily_context') === today) } catch { /* noop */ }
  }, [today])

  async function submitContext() {
    if (!feeling || !time || !where || !goal) return
    try { localStorage.setItem('luf_daily_context', today) } catch { /* noop */ }
    setCtxDone(true)
    setSending(true)
    const userSummary = `Feeling ${feeling} · ${time === 'short' ? '15-20 min' : time === 'plenty' ? 'plenty of time' : '~45 min'} · ${where} · ${goal === 'push' ? 'push hard' : goal === 'recover' ? 'recover' : 'just show up'}`
    setMessages((m) => [...m, { role: 'user', content: userSummary }])
    try {
      const r = await fetch('/api/plan/daily-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feeling, time, where, goal }) })
      const d = await r.json().catch(() => ({}))
      setMessages((m) => [...m, { role: 'operator', content: d?.reply || "Got it — let's build today around you." }])
      if (d?.adjustment) setPending(d.adjustment as Adjustment)
    } catch { setMessages((m) => [...m, { role: 'operator', content: "I couldn't reach your plan just now — try that again in a sec." }]) }
    setSending(false)
  }

  useLiveRefresh(() => {
    fetch('/api/plan/daily').then((r) => r.json()).then((d) => setWorkoutDone(!!d?.today?.workout)).catch(() => {})
    fetch('/api/plan/food-log').then((r) => r.json()).then((d) => setNutri({ protein: Number(d?.totals?.protein_g) || 0, target: Number(d?.target?.protein_g) || 0 })).catch(() => {})
  })

  const nutritionDone = !!nutri && nutri.target > 0 && nutri.protein >= nutri.target
  const perfectDay = workoutDone && nutritionDone
  const proteinLeft = nutri && nutri.target > 0 ? Math.max(0, nutri.target - nutri.protein) : null

  let greeting: string
  if (perfectDay) greeting = `You've handled everything today, ${firstName}. Proud of you. 💛`
  else if (!workoutDone && !nutritionDone) greeting = proteinLeft != null
    ? `How's your day looking, ${firstName}? You've still got your workout and ${proteinLeft}g of protein — tell me what's going on and I'll fit it in.`
    : `How's your day looking, ${firstName}? Tell me what's going on and I'll build today around you.`
  else if (!workoutDone && nutritionDone) greeting = `Nutrition's handled 🙌 — just your workout left, ${firstName}. Short on time? Tell me and I'll adjust it.`
  else if (proteinLeft != null && proteinLeft > 0) greeting = `Workout's done 💪🏽 — ${proteinLeft}g of protein to go, ${firstName}. Want a quick idea? Just tell me.`
  else greeting = `How are you feeling today, ${firstName}? Tell me what's going on and I'll keep you on track.`

  async function send(text: string) {
    const msg = text.trim(); if (!msg || sending) return
    setInput(''); setPending(null); setSending(true)
    setMessages((m) => [...m, { role: 'user', content: msg }])
    try {
      const r = await fetch('/api/plan/operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) })
      const d = await r.json().catch(() => ({}))
      setMessages((m) => [...m, { role: 'operator', content: d?.reply || "Tell me a little more about your day and I'll adjust your plan." }])
      if (d?.adjustment) setPending(d.adjustment as Adjustment)
    } catch { setMessages((m) => [...m, { role: 'operator', content: "I couldn't reach your plan just now — try that again in a sec." }]) }
    setSending(false)
  }

  async function decide(status: 'approved' | 'modified' | 'rejected') {
    const adj = pending; setPending(null)
    try {
      const r = await fetch('/api/plan/operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adjustmentId: adj?.id ?? '', status }) })
      const d = await r.json().catch(() => ({}))
      if (d?.reply) setMessages((m) => [...m, { role: 'operator', content: d.reply }])
      if (status === 'approved') broadcastRefresh() // supporting cards reflect the change instantly
    } catch { /* ignore */ }
  }

  const adjLines = (a: Adjustment) => {
    const out: string[] = []; const w = a.workoutChange, n = a.nutritionChange
    if (w?.trackOverride) out.push(`Workout → swapped to a ${w.trackOverride === 'home' ? 'bodyweight home' : 'gym'} session${w.toMinutes ? `, ${w.toMinutes} min` : ''}`)
    else if (w?.toMinutes) out.push(`Workout → ${w.toMinutes}-min ${w.swapTo || 'session'}`)
    else if (w?.reason) out.push('Workout → re-slotted for today')
    if (n?.dinnerSuggestion) out.push(`Nutrition → ${n.dinnerSuggestion}`)
    if (n?.calorieDelta) out.push(`Calories → ${n.calorieDelta > 0 ? '+' : ''}${n.calorieDelta}`)
    return out
  }

  return (
    <div className="luf-breathe relative overflow-hidden rounded-[2.25rem] border border-gold/30 bg-paper/80 backdrop-blur-md shadow-xl p-6">
      {/* identity — a person, not a tool */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="h-9 w-9 rounded-full bg-gold text-obsidian font-bold flex items-center justify-center text-lg shadow-lg shadow-gold/20">A</span>
        <div className="leading-tight">
          <p className="text-ink text-sm font-semibold">Coach Asa</p>
          <p className="text-gold/80 text-[10px] uppercase tracking-[0.18em] font-semibold">I&apos;m right here with you</p>
        </div>
      </div>

      {/* proactive daily check-in — asked FIRST, every morning, before anything else */}
      {!ctxDone && messages.length === 0 ? (
        <div className="mb-5 space-y-3">
          <p className="text-ink text-lg leading-snug font-medium text-balance">How&apos;s today looking, {firstName}?</p>

          {!ctxExpanded ? (
            <>
              <p className="text-ink/40 text-xs -mt-1">I&apos;ve guessed a normal day — build it, or tell me what&apos;s different.</p>
              <div className="flex gap-1.5 flex-wrap">
                {[FEELING.find((o) => o.v === feeling), TIME.find((o) => o.v === time), WHERE.find((o) => o.v === where), GOAL.find((o) => o.v === goal)].map((o) => o && (
                  <span key={o.v} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-charcoal/90 border border-smoke text-ivory/70">{o.l}</span>
                ))}
              </div>
              <button onClick={submitContext} disabled={sending}
                className="w-full bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-2xl disabled:opacity-40 active:scale-95 transition-transform">
                {sending ? 'Building your day…' : 'Build my day →'}
              </button>
              <button onClick={() => setCtxExpanded(true)} className="w-full text-center text-ink/40 text-xs hover:text-gold transition-colors">Something different today? Adjust →</button>
            </>
          ) : (
            <>
              <p className="text-ink/40 text-xs -mt-1">Tap anything that&apos;s different, then build it.</p>
              {[
                { label: 'Feeling', opts: FEELING, val: feeling, set: setFeeling },
                { label: 'Time you have', opts: TIME, val: time, set: setTime },
                { label: 'Where you are', opts: WHERE, val: where, set: setWhere },
                { label: "Today's goal", opts: GOAL, val: goal, set: setGoal },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-gold/80 text-[10px] uppercase tracking-wider font-semibold mb-1.5">{row.label}</p>
                  <div className="flex gap-2 flex-wrap">
                    {row.opts.map((o) => (
                      <button key={o.v} type="button" onClick={() => row.set(o.v)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${row.val === o.v ? 'bg-gold text-obsidian scale-[1.03]' : 'bg-charcoal/90 border border-smoke text-ivory/70 hover:border-gold/50'}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={submitContext} disabled={!feeling || !time || !where || !goal || sending}
                className="w-full bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-2xl disabled:opacity-40 active:scale-95 transition-transform">
                {sending ? 'Building your day…' : 'Build my day →'}
              </button>
            </>
          )}
        </div>
      ) : messages.length === 0 ? (
        <p className="text-ink text-lg leading-snug font-medium text-balance mb-5">{greeting}</p>
      ) : (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[86%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${m.role === 'user' ? 'bg-gold text-obsidian font-medium rounded-br-sm' : 'bg-charcoal/90 border border-smoke text-ivory/90 rounded-bl-sm'}`}>{m.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* an adjustment she can accept — right here */}
      {pending && (
        <div className="luf-reveal luf-in bg-charcoal/90 border border-gold/40 rounded-2xl p-3.5 mb-4">
          <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1.5">Here&apos;s what I recommend</p>
          {adjLines(pending).length ? (
            <ul className="mb-2.5 space-y-0.5">{adjLines(pending).map((l, i) => <li key={i} className="text-white text-sm">• {l}</li>)}</ul>
          ) : <p className="text-ivory/70 text-sm mb-2.5">A small tweak to keep you on track today.</p>}
          <div className="flex gap-2">
            <button onClick={() => decide('approved')} className="flex-1 bg-gold text-obsidian px-3 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">Yes, do it</button>
            <button onClick={() => decide('modified')} className="bg-charcoal border border-gold/40 text-gold px-3 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">Change it</button>
            <button onClick={() => decide('rejected')} className="bg-charcoal border border-smoke text-ivory/60 px-3 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">Not now</button>
          </div>
        </div>
      )}

      {recordingMemo && (
        <p className="luf-flame text-red-400 text-[10px] uppercase tracking-wider font-bold mb-1.5">● Recording your memo — tap 🎙️ again when you&apos;re done</p>
      )}

      {/* talk right here — no page jump */}
      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2">
        <input
          value={input} onChange={(e) => setInput(e.target.value)} disabled={sending}
          placeholder="Talk to me about your day…"
          autoComplete="off" autoCorrect="on" enterKeyHint="send" inputMode="text"
          className="flex-1 bg-charcoal/5 border border-smoke/30 rounded-2xl px-4 py-3 text-base text-ink placeholder:text-ink/35 focus:border-gold/60 focus:outline-none"
        />
        <VoiceButton idleLabel="Talk to Coach Asa" onInterim={setInput} onResult={(t) => { setInput(t); send(t) }} />
        <VoiceButton
          icon="🎙️" idleLabel="Record a longer memo" continuous
          onInterim={(t) => { setRecordingMemo(true); setInput(t) }}
          onResult={(t) => { setRecordingMemo(false); setInput(t); send(t) }}
        />
        <button type="submit" disabled={sending || !input.trim()} className="h-12 w-12 shrink-0 rounded-full bg-gold text-obsidian font-bold text-lg flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform">{sending ? '…' : '➤'}</button>
      </form>
      <p className="text-ink/30 text-[10px] mt-1.5">🎤 quick chat · 🎙️ record a longer memo — thoughts, questions, or your daily check-in</p>

      <Celebration trigger={perfectDay} message={winAffirmation('allDone')} dedupeKey={`perfectday-${today}`} />
    </div>
  )
}
