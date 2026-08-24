'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Celebration from '@/components/Celebration'
import DeepgramVoiceInput from '@/components/DeepgramVoiceInput'
import { useLiveRefresh, localTodayISO, broadcastRefresh } from '@/lib/useLiveRefresh'
import { winAffirmation } from '@/lib/affirmations'

// The living centerpiece of the home screen. She talks to Coach RIGHT HERE — no
// page jump. A personal greeting and an inline conversation, ChatGPT-simple:
// no separate quiz UI — "how's today looking," any injuries, what she has
// time for, all just flow through typed/spoken replies in the chat itself,
// same as everything else here. Approving a change refreshes the supporting
// cards on the spot.
type Msg = { role: 'user' | 'operator'; content: string }
type WorkoutChange = { fromMinutes?: number; toMinutes?: number; swapTo?: string; reason?: string; trackOverride?: 'gym' | 'home'; injuryBodyPart?: string; focusOverride?: ('core' | 'legs' | 'arms' | 'chest' | 'back' | 'shoulders')[] }

function joinAreas(areas: string[]): string {
  if (areas.length <= 1) return areas[0] || ''
  if (areas.length === 2) return `${areas[0]} and ${areas[1]}`
  return `${areas.slice(0, -1).join(', ')}, and ${areas[areas.length - 1]}`
}
type NutritionChange = { calorieDelta?: number; dinnerSuggestion?: string; reason?: string; eatingOut?: boolean }
type Adjustment = { id: string | null; workoutChange?: WorkoutChange; nutritionChange?: NutritionChange }

function NoteIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

export default function CoachHero({ firstName, hasPlan = true, maximized = false, hasRealName = true }: { firstName: string; hasPlan?: boolean; maximized?: boolean; hasRealName?: boolean }) {
  const router = useRouter()
  const [workoutDone, setWorkoutDone] = useState(false)
  const [nutri, setNutri] = useState<{ protein: number; target: number } | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<Adjustment | null>(null)
  // Real bug found live: this modal never auto-scrolled to a new message —
  // OperatorChat.tsx (the full-page chat) already did this, this component
  // never had the equivalent. In a fixed-height panel that means a fresh
  // Coach Asa reply could render entirely below the visible fold, reading as
  // "cut off," and she'd have to find it by scrolling manually every time.
  const endRef = useRef<HTMLDivElement>(null)
  // In-chat actionable cards, not dead-end text — after she approves a change,
  // or Coach Asa builds her a plan from scratch, take her straight to whatever
  // actually changed instead of making her navigate there herself. Clears on
  // her next message so it doesn't linger into an unrelated later exchange.
  const [justApproved, setJustApproved] = useState<Adjustment | null>(null)
  const [justBuilt, setJustBuilt] = useState<{ workout: boolean; nutrition: boolean } | null>(null)
  const [quickReplies, setQuickReplies] = useState<string[] | null>(null)
  const [recordingMemo, setRecordingMemo] = useState(false)
  const today = localTodayISO()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Teleprompter growth — grows line by line with what she's typed/said, up to
  // a max height, then scrolls internally instead of pushing the modal around.
  // Standard technique: reset to 'auto' first so shrinking (delete/backspace)
  // is measured correctly, then set to the real scrollHeight, capped.
  const TEXTAREA_MAX_HEIGHT = 160
  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`
  }
  useEffect(() => { autoGrow() }, [input])

  // Only scroll when the message COUNT (or a new card) changes, instantly —
  // not on every keystroke/render — so it never jumps while she's typing.
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }) }, [messages.length, pending, justApproved, justBuilt, quickReplies])

  useLiveRefresh(() => {
    fetch('/api/plan/daily').then((r) => r.json()).then((d) => setWorkoutDone(!!d?.today?.workout)).catch(() => {})
    fetch('/api/plan/food-log').then((r) => r.json()).then((d) => setNutri({ protein: Number(d?.totals?.protein_g) || 0, target: Number(d?.target?.protein_g) || 0 })).catch(() => {})
  })

  const nutritionDone = !!nutri && nutri.target > 0 && nutri.protein >= nutri.target
  const perfectDay = workoutDone && nutritionDone
  const proteinLeft = nutri && nutri.target > 0 ? Math.max(0, nutri.target - nutri.protein) : null

  // Leads with her name every time now (was worked in mid-sentence) — Asa's
  // explicit call, same "always address her by name" standard as the chat.
  // Real bug found live: every one of these is a vocative "{firstName}, ..."
  // construction — the exact shape that breaks with the 'there' guest
  // fallback ("there, how's your day looking?" reads as broken, unlike the
  // idiomatic "Hey there"). hasRealName drops the name-prefix entirely
  // instead, capitalizing what follows so it still reads as a real sentence.
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const lead = (rest: string) => hasRealName ? `${firstName}, ${rest}` : cap(rest)
  let greeting: string
  if (perfectDay) greeting = lead("you've handled everything today. Proud of you.")
  else if (!workoutDone && !nutritionDone) greeting = proteinLeft != null
    ? lead(`how's your day looking? You've still got your workout and ${proteinLeft}g of protein — tell me what's going on and I'll fit it in.`)
    : lead("how's your day looking? Tell me what's going on and I'll build today around you.")
  else if (!workoutDone && nutritionDone) greeting = lead("nutrition's handled — just your workout left. Short on time? Tell me and I'll adjust it.")
  else if (proteinLeft != null && proteinLeft > 0) greeting = lead(`workout's done — ${proteinLeft}g of protein to go. Want a quick idea? Just tell me.`)
  else greeting = lead("how are you feeling today? Tell me what's going on — and how's the app been working for you so far?")

  async function send(text: string) {
    const msg = text.trim(); if (!msg || sending) return
    setInput(''); setPending(null); setJustApproved(null); setJustBuilt(null); setQuickReplies(null); setSending(true)
    setMessages((m) => [...m, { role: 'user', content: msg }])
    try {
      const r = await fetch('/api/plan/operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) })
      const d = await r.json().catch(() => ({}))
      setMessages((m) => [...m, { role: 'operator', content: d?.reply || "Tell me a little more about your day and I'll adjust your plan." }])
      if (d?.adjustment) setPending(d.adjustment as Adjustment)
      // Real tappable options for a single, bounded-answer question (her level,
      // focus area, or "no injuries") instead of making her type it — found live:
      // she had to retype something she'd effectively already have to guess the
      // exact phrasing of. Tapping just calls send() with that exact text.
      if (d?.quickReplies) setQuickReplies(d.quickReplies as string[])
      // A cold-start build just flipped intake_completed server-side — that decides
      // which whole branch /plan/page.tsx renders (the "no plan yet" card vs. the
      // real dashboard), which broadcastRefresh() alone can't reach since that's a
      // server decision, not a client-fetched value. Found live: without this, she'd
      // have to manually reload to see her own just-built plan show up at all.
      // justBuilt surfaces a real "go see it" card below (in-chat action, not a
      // dead-end reply) instead of only saying "it's on your dashboard" in text —
      // routed to the specific thing built (workout/today), same pattern as
      // justApproved below, not always the generic dashboard.
      if (d?.planBuilt) { router.refresh(); broadcastRefresh(); setJustBuilt({ workout: !!d.builtWorkout, nutrition: !!d.builtNutrition }) }
    } catch { setMessages((m) => [...m, { role: 'operator', content: "I couldn't reach your plan just now — try that again in a sec." }]) }
    setSending(false)
  }

  // Explicit, always-available "keep everything as-is" — she shouldn't have to type
  // to tell me nothing needs to change. Clears any pending recommendation and confirms
  // instantly, no API round-trip needed since there's nothing to accept/reject.
  function stickWithPlan() {
    setPending(null)
    setMessages((m) => [...m, { role: 'user', content: "I'll stick with my current plan." }, { role: 'operator', content: `${hasRealName ? `${firstName}, ` : ''}Sounds good — sticking with what's already working. No changes.` }])
  }

  async function decide(status: 'approved' | 'modified' | 'rejected') {
    const adj = pending; setPending(null)
    try {
      const r = await fetch('/api/plan/operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adjustmentId: adj?.id ?? '', status }) })
      const d = await r.json().catch(() => ({}))
      if (d?.reply) setMessages((m) => [...m, { role: 'operator', content: d.reply }])
      if (status === 'approved') {
        // Real bug found live: approving marked the adjustment approved
        // server-side correctly, but tapping through to /plan/workout right
        // after could still show her OLD unchanged workout — Next's router
        // cache serving a stale pre-approval page, since nothing here ever
        // invalidated it. Same class of bug already fixed once this session
        // for the intake-completion flow. router.refresh() guarantees the
        // page she taps through to is actually fresh.
        router.refresh()
        broadcastRefresh() // supporting cards reflect the change instantly
        setJustApproved(adj) // surfaces a real "take me there" card below, not just text
      }
    } catch { /* ignore */ }
  }

  const adjLines = (a: Adjustment) => {
    const out: string[] = []; const w = a.workoutChange, n = a.nutritionChange
    if (w?.injuryBodyPart) out.push(`Workout → swapped to protect your ${w.injuryBodyPart.replace('_', ' ')}, from now on`)
    else if (w?.trackOverride) out.push(`Workout → swapped to a ${w.trackOverride === 'home' ? 'bodyweight home' : 'gym'} session${w.toMinutes ? `, ${w.toMinutes} min` : ''}`)
    else if (w?.focusOverride?.length) out.push(`Workout → focused on ${joinAreas(w.focusOverride)} today`)
    else if (w?.toMinutes) out.push(`Workout → ${w.toMinutes}-min ${w.swapTo || 'session'}`)
    else if (w?.reason) out.push('Workout → re-slotted for today')
    // Additive, not exclusive — a track swap AND a focus request can land in
    // the same message ("I'm at a hotel, give me an arm workout"), and both
    // deserve their own line rather than only the first-matched one above.
    if (w?.focusOverride?.length && w?.trackOverride) out.push(`Focus → ${joinAreas(w.focusOverride)} today`)
    if (n?.dinnerSuggestion) out.push(`Nutrition → ${n.dinnerSuggestion}`)
    if (n?.calorieDelta) out.push(`Calories → ${n.calorieDelta > 0 ? '+' : ''}${n.calorieDelta}`)
    return out
  }

  return (
    <div className={`relative max-h-full flex flex-col overflow-hidden border border-gold/40 bg-white shadow-sm p-6 ${maximized ? '' : 'rounded-[2.25rem]'}`}>
      {/* Everything that can grow (identity + the quiz/greeting/message thread)
          lives in the scrollable top region; the input stays pinned at the
          bottom, same shape as any standard chat UI — see the footer region
          below. Negative margin + matching padding lets this region scroll
          edge-to-edge without the parent's own p-6 clipping its scrollbar.
          min-h-0 is required, not decorative — a flex item's default
          min-height is `auto` (won't shrink below its content), so once the
          fixed-height wrapper this renders inside (see app/plan/page.tsx)
          plus a real recommendation card in the shrink-0 footer below
          together exceed the available height, this region would refuse to
          shrink and get silently clipped by the parent's overflow-hidden
          instead — the message thread would render but be invisible. Found
          live: sending "build me an arm workout" produced a real reply + a
          real recommendation card, but the chat bubble showing that reply
          was fully clipped, not just scrolled off-screen. A bare min-h-0
          alone technically fixes the clipping (nothing overflows the
          rounded card anymore) but can still squeeze this region down to
          ~0px whenever the footer's recommendation card is tall relative to
          the wrapper's height — which defeats the actual point of a real,
          named-exercise
          reply if she can never see the sentence it's written in. The
          explicit min-height below guarantees at least a couple of lines of
          the latest exchange stay visible/scrollable no matter how much
          footer content follows, while still letting the region shrink
          below its full content height so it isn't the old unbounded-growth
          bug in a different form. */}
      <div className="flex-1 min-h-[110px] overflow-y-auto -mx-6 px-6 pb-3">
      {/* identity — a person, not a tool. No avatar glyph (Asa's call) — just
          the name and line, ChatGPT-plain. */}
      <div className="leading-tight mb-4">
        <p className="text-ink text-sm font-semibold">Coach</p>
        <p className="text-gold/80 text-[10px] uppercase tracking-[0.18em] font-semibold">I&apos;m right here with you</p>
      </div>

      {messages.length === 0 ? (
        // ChatGPT-style landing treatment (Asa's spec, matched to the reference
        // screenshot) — this is the box she actually sees first, not the
        // separate /plan/coach page. `greeting` is already personalized/
        // contextual (it changes based on what's done today), which is a real
        // upgrade over a static "What are you working on?" — kept as the
        // headline, just given the bigger, bolder treatment the reference
        // has, plus the same "suggestion pill" pattern below it.
        <div className="text-center py-2">
          <p className="text-ink text-xl leading-snug font-bold text-balance mb-4">{greeting}</p>
          <button
            onClick={() => send('What can Coach do?')}
            disabled={sending}
            className="inline-block bg-charcoal/5 border border-smoke/30 text-ink/50 text-xs font-semibold px-4 py-2 rounded-full hover:border-gold/50 hover:text-gold transition-colors disabled:opacity-40"
          >
            What can Coach do?
          </button>
          {/* Moved in from CoachOrbLauncher's old "closed" state now that
              there's no more open/closed modal — same gating logic (never
              shown once a real conversation's started, so it can't read as
              the app ignoring an in-progress build), just keyed off
              messages.length === 0 instead of the modal being closed. The
              chat-build path above already gets her there conversationally;
              this is still the direct form-fill alternative for anyone who'd
              rather not type it out. */}
          {!hasPlan && (
            <Link href="/plan/intake" className="block bg-charcoal/5 border border-smoke/30 rounded-2xl p-4 text-center mt-4 hover:border-gold/40 transition-colors">
              <p className="text-ink font-semibold text-sm mb-0.5">No plan built yet</p>
              <p className="text-ink/50 text-xs">Tell me what you&apos;re looking for above, or tap here to build your real plan.</p>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[86%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${m.role === 'user' ? 'bg-gold text-obsidian font-medium rounded-br-sm' : 'bg-charcoal/90 border border-smoke text-ivory/90 rounded-bl-sm'}`}>{m.content}</div>
            </div>
          ))}
        </div>
      )}
      <div ref={endRef} />
      </div>

      {/* Pinned footer — the adjustment prompt, memo-recording notice, "stick
          with my plan" bypass, and the input itself never scroll away with
          the message thread. */}
      <div className="shrink-0 pt-3">
      {/* Tappable answers to Coach Asa's own gate question (level/focus/injuries)
          — one tap sends the exact text, same as typing it. */}
      {quickReplies && (
        <div className="luf-reveal luf-in flex flex-wrap gap-2 mb-4">
          {quickReplies.map((o) => (
            <button key={o} onClick={() => send(o)} disabled={sending}
              className="bg-charcoal border border-gold/40 text-gold px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform disabled:opacity-40">
              {o}
            </button>
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
          {/* Simplified to Yes/No, Asa's explicit call — "Change it" never
              actually changed anything on its own (it only posted a reply
              asking her to describe what she wants), so it wasn't a real
              third choice, just a confusing extra tap. She can still just
              type what she wants instead, exactly like before. */}
          {/* Real ask, live: bare "Yes"/"No" still didn't say what she was
              agreeing to — explicit verbs make it unambiguous without going
              back to 3 buttons. */}
          <div className="flex gap-2">
            <button onClick={() => decide('approved')} className="flex-1 bg-gold text-obsidian px-3 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">Yes, update it</button>
            <button onClick={() => decide('rejected')} className="flex-1 bg-charcoal border border-smoke text-ivory/60 px-3 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">No, keep it</button>
          </div>
        </div>
      )}

      {/* In-chat actionable cards — after she approves a change, take her
          straight to whatever actually changed instead of a dead-end text
          reply. Mirrors components/OperatorChat.tsx's approval cards. */}
      {justApproved && (
        <div className="luf-reveal luf-in flex flex-col gap-2 mb-4">
          {justApproved.workoutChange && (
            <Link href="/plan/workout" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
              View my updated workout →
            </Link>
          )}
          {justApproved.nutritionChange && (
            <Link
              href={justApproved.nutritionChange.eatingOut ? '/plan/eating-out' : '/plan/today'}
              className="flex items-center justify-center gap-1.5 bg-charcoal border border-gold/40 text-gold px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl hover:border-gold/70 transition-colors"
            >
              {justApproved.nutritionChange.eatingOut ? 'Show me my options →' : 'View my updated plan →'}
            </Link>
          )}
        </div>
      )}

      {/* Cold-start build — no reason to make her find her own way to the
          dashboard once Coach Asa just built it live in this conversation.
          Routed to the specific thing built, not always the generic
          dashboard — only lands there when both workout and nutrition were
          built (no single page shows both). */}
      {justBuilt && (
        <div className="luf-reveal luf-in flex flex-col gap-2 mb-4">
          {justBuilt.workout && justBuilt.nutrition ? (
            <Link href="/plan" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
              View my new plan →
            </Link>
          ) : justBuilt.workout ? (
            <Link href="/plan/workout" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
              View my new workout →
            </Link>
          ) : justBuilt.nutrition ? (
            <Link href="/plan/today" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
              View my new nutrition plan →
            </Link>
          ) : (
            <Link href="/plan" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
              View my new plan →
            </Link>
          )}
        </div>
      )}

      {recordingMemo && (
        <p className="luf-flame text-red-400 text-[10px] uppercase tracking-wider font-bold mb-1.5">● Recording your memo — tap the note button again when you&apos;re done</p>
      )}

      {/* Only makes sense once she actually has a plan to stick with — for a
          plan-less user (cold-start build in progress), this used to show
          unconditionally, which read as actively wrong advice at exactly the
          moment she's answering a build question. Found via a first-time-
          user pass over a live screenshot. */}
      {!pending && hasPlan && (
        <button onClick={stickWithPlan} disabled={sending}
          className="w-full text-center bg-charcoal/5 border border-smoke/30 text-ink/50 hover:text-gold hover:border-gold/40 px-4 py-2 rounded-xl text-xs font-semibold mb-2 transition-colors disabled:opacity-40">
          Stick with my current plan
        </button>
      )}

      {/* talk right here — no page jump. Unified pill (Asa's ChatGPT-reference
          spec), same swap-on-typing pattern as /plan/coach's composer: the
          note-memo mic stays docked on the left (its own distinct capability,
          not a "+" menu item since there are no quick-signal chips here to
          hide behind one), the quick-talk mic sits on the right and swaps to
          a send-arrow the moment there's real text — reusing
          DeepgramVoiceInput's className/activeClassName so both mic buttons
          restyle into this pill without forking any transcription logic. */}
      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex items-center gap-1 bg-charcoal/5 border border-smoke/30 rounded-full pl-1.5 pr-1.5 py-1.5">
        <DeepgramVoiceInput
          source="coach_hero" icon={<NoteIcon />} idleLabel="Record a longer memo"
          onInterim={(t) => { setRecordingMemo(true); setInput(t) }}
          onResult={(t) => { setRecordingMemo(false); setInput(t) }}
          className="h-9 w-9 rounded-full text-ink/40 hover:text-gold"
          activeClassName="h-9 w-9 rounded-full bg-red-500/90 text-white luf-glow scale-105"
        />
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter (or any IME composition) inserts a real
            // newline — same convention as Claude's or any standard chat input.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) }
          }}
          disabled={sending}
          placeholder="Talk to me about your day…"
          autoComplete="off" autoCorrect="on" enterKeyHint="send" inputMode="text"
          style={{ maxHeight: TEXTAREA_MAX_HEIGHT }}
          className="flex-1 resize-none bg-transparent px-1.5 py-1.5 text-base text-ink placeholder:text-ink/35 focus:outline-none overflow-y-auto"
        />
        {input.trim() ? (
          <button type="submit" disabled={sending} aria-label="Send" className="shrink-0 h-9 w-9 rounded-full bg-gold text-obsidian flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform">
            {sending ? <span className="text-sm font-bold leading-none">…</span> : <SendIcon />}
          </button>
        ) : (
          // Deepgram Nova-3, not the browser's built-in recognition — see
          // components/DeepgramVoiceInput.tsx. Deliberately no auto-send:
          // she reviews/edits the transcript like anything she typed, which
          // matters now that a low-confidence read gets flagged instead of
          // silently sent as-is.
          <DeepgramVoiceInput
            source="coach_hero" idleLabel="Talk to Coach" onInterim={setInput} onResult={setInput}
            className="h-9 w-9 rounded-full bg-gold text-obsidian"
            activeClassName="h-9 w-9 rounded-full bg-red-500/90 text-white luf-glow scale-105"
          />
        )}
      </form>
      <p className="text-ink/25 text-[10px] mt-1.5 text-center">tap to talk · left mic for a longer voice memo</p>
      </div>

      <Celebration trigger={perfectDay} message={winAffirmation('allDone')} dedupeKey={`perfectday-${today}`} />
    </div>
  )
}
