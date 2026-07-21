'use client'

import { useState } from 'react'
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

export default function CoachHero({ firstName }: { firstName: string }) {
  const [workoutDone, setWorkoutDone] = useState(false)
  const [nutri, setNutri] = useState<{ protein: number; target: number } | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<Adjustment | null>(null)
  const today = localTodayISO()

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

      {/* opening greeting, or the live conversation once she talks */}
      {messages.length === 0 ? (
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
