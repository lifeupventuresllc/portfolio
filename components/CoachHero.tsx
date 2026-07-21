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
type WorkoutChange = { fromMinutes?: number; toMinutes?: number; swapTo?: string; reason?: string }
type NutritionChange = { calorieDelta?: number; dinnerSuggestion?: string; reason?: string }
type Adjustment = { id: string | null; workoutChange?: WorkoutChange; nutritionChange?: NutritionChange }

// The 4 proactive daily-context questions — Coach Asa asks these FIRST, every
// morning, instead of waiting for her to type. Answers become a synthesized
// message sent through the same rule-based operator as free-typed chat, so
// they get the exact same recommend/approve flow with zero new backend code.
const FEELING = [{ v: 'great', l: '😊 Great' }, { v: 'okay', l: '😐 Okay' }, { v: 'tired', l: '😴 Tired' }, { v: 'stressed', l: '😣 Stressed' }]
const TIME = [{ v: 'short', l: '⏱️ 15-20 min' }, { v: 'normal', l: '🕐 About 45 min' }, { v: 'plenty', l: '🕒 Plenty of time' }]
const WHERE = [{ v: 'home', l: '🏠 Home' }, { v: 'gym', l: '🏋️ Gym' }, { v: 'traveling', l: '✈️ Traveling' }]
const GOAL = [{ v: 'push', l: '🔥 Push hard' }, { v: 'showup', l: '💪 Just show up' }, { v: 'recover', l: '🌿 Recover' }]

function synthesizeMessage(feeling: string, time: string, where: string, goal: string): string {
  const parts: string[] = []
  parts.push(feeling === 'tired' ? "I'm so tired today" : feeling === 'stressed' ? "I'm feeling stressed today" : feeling === 'great' ? "I'm feeling great today" : "I'm feeling okay today")
  if (time === 'short') parts.push('I only have 20 minutes')
  else if (time === 'plenty') parts.push('I have plenty of time')
  if (where === 'traveling') parts.push("I'm traveling and eating out")
  else if (where === 'gym') parts.push("I'm at the gym")
  else parts.push("I'm at home")
  parts.push(goal === 'push' ? 'I want to push hard today' : goal === 'recover' ? 'I just want to recover today' : 'I just want to show up today')
  return parts.join(', ') + '.'
}

export default function CoachHero({ firstName }: { firstName: string }) {
  const [workoutDone, setWorkoutDone] = useState(false)
  const [nutri, setNutri] = useState<{ protein: number; target: number } | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<Adjustment | null>(null)
  const today = localTodayISO()

  // Daily context quiz — shown once per day until she's answered (or already talked today)
  const [ctxDone, setCtxDone] = useState(true) // default true so it never flashes before the client check runs
  const [feeling, setFeeling] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [where, setWhere] = useState<string | null>(null)
  const [goal, setGoal] = useState<string | null>(null)

  useEffect(() => {
    try { setCtxDone(localStorage.getItem('luf_daily_context') === today) } catch { /* noop */ }
  }, [today])

  async function submitContext() {
    if (!feeling || !time || !where || !goal) return
    try { localStorage.setItem('luf_daily_context', today) } catch { /* noop */ }
    setCtxDone(true)
    await send(synthesizeMessage(feeling, time, where, goal))
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
    if (w?.toMinutes) out.push(`Workout → ${w.toMinutes}-min ${w.swapTo || 'session'}`)
    else if (w?.reason) out.push('Workout → re-slotted for today')
    if (n?.dinnerSuggestion) out.push(`Nutrition → ${n.dinnerSuggestion}`)
    if (n?.calorieDelta) out.push(`Calories → ${n.calorieDelta > 0 ? '+' : ''}${n.calorieDelta}`)
    return out
  }

  return (
    <div className="luf-glow luf-breathe relative overflow-hidden rounded-[2.25rem] border border-gold/40 bg-gradient-to-br from-gold/15 via-charcoal to-obsidian p-6">
      {/* identity — a person, not a tool */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="h-9 w-9 rounded-full bg-gold text-obsidian font-bold flex items-center justify-center text-lg shadow-lg shadow-gold/20">A</span>
        <div className="leading-tight">
          <p className="text-white text-sm font-semibold">Coach Asa</p>
          <p className="text-gold/70 text-[10px] uppercase tracking-[0.18em] font-semibold">I&apos;m right here with you</p>
        </div>
      </div>

      {/* proactive daily check-in — asked FIRST, every morning, before anything else */}
      {!ctxDone && messages.length === 0 ? (
        <div className="mb-5 space-y-3.5">
          <p className="text-white text-lg leading-snug font-medium text-balance">How&apos;s today looking, {firstName}?</p>
          {[
            { label: 'Feeling', opts: FEELING, val: feeling, set: setFeeling },
            { label: 'Time you have', opts: TIME, val: time, set: setTime },
            { label: 'Where you are', opts: WHERE, val: where, set: setWhere },
            { label: "Today's goal", opts: GOAL, val: goal, set: setGoal },
          ].map((row) => (
            <div key={row.label}>
              <p className="text-gold/70 text-[10px] uppercase tracking-wider font-semibold mb-1.5">{row.label}</p>
              <div className="flex gap-2 flex-wrap">
                {row.opts.map((o) => (
                  <button key={o.v} type="button" onClick={() => row.set(o.v)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${row.val === o.v ? 'bg-gold text-obsidian scale-[1.03]' : 'bg-obsidian/60 border border-smoke text-ivory/70 hover:border-gold/50'}`}>
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
        </div>
      ) : messages.length === 0 ? (
        <p className="text-white text-lg leading-snug font-medium text-balance mb-5">{greeting}</p>
      ) : (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[86%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${m.role === 'user' ? 'bg-gold text-obsidian font-medium rounded-br-sm' : 'bg-obsidian/70 border border-smoke text-ivory/90 rounded-bl-sm'}`}>{m.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* an adjustment she can accept — right here */}
      {pending && (
        <div className="luf-reveal luf-in bg-obsidian/70 border border-gold/40 rounded-2xl p-3.5 mb-4">
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

      {/* talk right here — no page jump */}
      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2">
        <input
          value={input} onChange={(e) => setInput(e.target.value)} disabled={sending}
          placeholder="Talk to me about your day…"
          autoComplete="off" autoCorrect="on" enterKeyHint="send" inputMode="text"
          className="flex-1 bg-obsidian/60 border border-smoke rounded-2xl px-4 py-3 text-base text-white placeholder:text-ivory/35 focus:border-gold/60 focus:outline-none"
        />
        <VoiceButton idleLabel="Talk to Coach Asa" onInterim={setInput} onResult={(t) => { setInput(t); send(t) }} />
        <button type="submit" disabled={sending || !input.trim()} className="h-12 w-12 shrink-0 rounded-full bg-gold text-obsidian font-bold text-lg flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform">{sending ? '…' : '➤'}</button>
      </form>

      <Celebration trigger={perfectDay} message={winAffirmation('allDone')} dedupeKey={`perfectday-${today}`} />
    </div>
  )
}
