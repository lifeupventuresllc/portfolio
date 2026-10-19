'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MealOption, EatStyle, OrderDestination } from '@/lib/meal-pick'

// The Nutrition tab's decision screen (2026-10-19, Asa's mockup v3): two
// cards, one tap. Nothing else competes with them — the sentence above is
// the only setting, "Show me two others" is the only other choice.
export type PickCard = MealOption & { dest: OrderDestination }

const C = {
  card: '#08281d', line: '#0d3a2a', green: '#4CAF7D', gold: '#E5A93C', pink: '#EA5C87',
  ivory: '#EDE7DA', muted: 'rgba(237,231,218,0.55)', faint: 'rgba(237,231,218,0.35)',
}

type Props = {
  cards: PickCard[]
  slot: string                 // 'Lunch'
  remainingCal: number
  dayTarget: number
  greeting: string
  eatStyle: EatStyle
  mealBudget: number
  note: string | null
}

// The thin top line: calories left today, out of her day's number.
function CalLine({ left, target }: { left: number; target: number }) {
  return (
    <div className="flex items-baseline justify-between pb-2.5 mb-4 text-[12px]" style={{ borderBottom: `1px solid ${C.line}`, color: C.muted }}>
      <span>Left today</span>
      <span><b className="text-[14px] tabular-nums" style={{ color: C.green }}>{left.toLocaleString()} cal</b> of {target.toLocaleString()}</span>
    </div>
  )
}

export default function NutritionPicks({ cards, slot, remainingCal, dayTarget, greeting, eatStyle, mealBudget, note }: Props) {
  const router = useRouter()
  const [pair, setPair] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ card: PickCard; left: number; entryId: string | null } | null>(null)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetDraft, setBudgetDraft] = useState(mealBudget)
  const [reported, setReported] = useState<Record<string, boolean>>({})
  const [wrapped, setWrapped] = useState(false)

  const pairs = Math.max(1, Math.ceil(cards.length / 2))
  const shown = cards.slice(pair * 2, pair * 2 + 2)
  const meal = slot.toLowerCase()

  const post = (body: object) => fetch('/api/plan/meal-pick', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).catch(() => null)

  function showOthers() {
    post({ action: 'skipped', keys: shown.map((c) => c.key) })
    setOpen(null)
    const nextPair = (pair + 1) % pairs
    setWrapped(nextPair === 0 && pairs > 1)
    setPair(nextPair)
  }

  async function choose(card: PickCard) {
    if (busy) return
    setBusy(true)
    let entryId: string | null = null
    try {
      const res = await fetch('/api/plan/food-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: card.name, brand: card.place, meal, servings: 1,
          calories: card.cal, protein_g: card.protein, carbs_g: card.carbs, fats_g: card.fat,
          source: 'meal_pick',
        }),
      })
      const day = await res.json().catch(() => null) as { entries?: { id: string; name: string; meal: string }[] } | null
      const match = (day?.entries || []).filter((e) => e.name === card.name && e.meal === meal).pop()
      entryId = match?.id || null
      post({ action: 'picked', key: card.key })
      setDone({ card, left: Math.max(0, remainingCal - card.cal), entryId })
    } catch { /* stays on the cards — nothing was logged */ }
    setBusy(false)
  }

  async function undo() {
    if (!done) return
    if (done.entryId) await fetch(`/api/plan/food-log?id=${encodeURIComponent(done.entryId)}`, { method: 'DELETE' }).catch(() => {})
    setDone(null)
    router.refresh()
  }

  async function switchStyle() {
    setBusy(true)
    await post({ action: 'style', eatStyle: eatStyle === 'out' ? 'cook' : 'out' })
    setPair(0); setOpen(null)
    router.refresh()
    setBusy(false)
  }

  async function saveBudget() {
    setBusy(true)
    await post({ action: 'budget', mealBudget: budgetDraft })
    setEditingBudget(false); setPair(0); setOpen(null)
    router.refresh()
    setBusy(false)
  }

  // ---------- after she taps: the calm payoff ----------
  if (done) {
    const { card, left } = done
    const pct = remainingCal > 0 ? Math.min(100, Math.round(((remainingCal - left) / remainingCal) * 100)) : 100
    const spent = card.price != null ? `You spent about $${card.price} of your $${mealBudget}.` : ''
    return (
      <div>
      <CalLine left={left} target={dayTarget} />
      <div className="flex flex-col items-center text-center gap-3 pt-6">
        <div className="rounded-full grid place-items-center" style={{ width: 132, height: 132, background: `conic-gradient(${C.line} 0 ${pct}%, ${C.green} ${pct}% 100%)` }}>
          <div className="rounded-full grid place-items-center" style={{ width: 106, height: 106, background: '#021F16' }}>
            <div>
              <p className="text-[26px] font-bold leading-none tabular-nums" style={{ color: C.ivory }}>{left.toLocaleString()}</p>
              <p className="text-[10px] mt-1" style={{ color: C.muted }}>cal left</p>
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-bold mt-2" style={{ color: C.ivory }}>Done. You&apos;re on track.</h2>
        <p className="text-sm max-w-xs" style={{ color: C.muted }}>{slot} is logged. {spent}</p>

        <div className="w-full max-w-sm mt-3 flex flex-col gap-2.5">
          {card.dest.url ? (
            <a href={card.dest.url} target="_blank" rel="noopener noreferrer"
              className="w-full text-center rounded-2xl py-3.5 font-bold text-sm active:scale-[0.98] transition-transform"
              style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.pink})`, color: '#0A0A0F' }}>
              {card.dest.label}
            </a>
          ) : card.ingredients && card.ingredients.length > 0 ? (
            <div className="w-full text-left rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: C.green }}>What you need</p>
              <ul className="text-sm space-y-1" style={{ color: C.ivory }}>
                {card.ingredients.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ) : null}
          <button onClick={() => { setDone(null); router.refresh() }} className="text-sm py-2" style={{ color: C.muted }}>Back</button>
          <button onClick={undo} className="text-xs underline underline-offset-2" style={{ color: C.faint }}>I didn&apos;t eat this, undo</button>
        </div>
      </div>
      </div>
    )
  }

  // ---------- the decision screen ----------
  return (
    <div className="flex flex-col gap-3">
      <CalLine left={remainingCal} target={dayTarget} />
      <h1 className="text-[26px] font-bold -mb-1.5" style={{ color: C.ivory }}>{greeting}</h1>
      {/* The only setting: one sentence, tap a phrase to change it. */}
      <p className="text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
        You{' '}
        <button onClick={switchStyle} disabled={busy} className="font-semibold underline underline-offset-[3px] decoration-1" style={{ color: C.gold, textDecorationColor: 'rgba(229,169,60,0.5)' }}>
          {eatStyle === 'out' ? 'mostly eat out' : 'mostly cook'}
        </button>{' '}
        and spend about{' '}
        <button onClick={() => { setBudgetDraft(mealBudget); setEditingBudget((v) => !v) }} disabled={busy} className="font-semibold underline underline-offset-[3px] decoration-1" style={{ color: C.gold, textDecorationColor: 'rgba(229,169,60,0.5)' }}>
          ${mealBudget} a meal
        </button>. Both fit.
      </p>

      {editingBudget && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <button aria-label="Less" onClick={() => setBudgetDraft((b) => Math.max(2, b - 1))} className="w-10 h-10 rounded-full text-xl font-bold" style={{ border: `1px solid ${C.line}`, color: C.ivory }}>−</button>
          <p className="flex-1 text-center text-3xl font-bold tabular-nums" style={{ color: C.gold }}>${budgetDraft}</p>
          <button aria-label="More" onClick={() => setBudgetDraft((b) => Math.min(60, b + 1))} className="w-10 h-10 rounded-full text-xl font-bold" style={{ border: `1px solid ${C.line}`, color: C.ivory }}>+</button>
          <button onClick={saveBudget} disabled={busy} className="rounded-xl px-4 py-2.5 font-bold text-sm" style={{ background: C.gold, color: '#0A0A0F' }}>Save</button>
        </div>
      )}

      {note && <p className="text-xs" style={{ color: C.gold }}>{note}</p>}
      {wrapped && <p className="text-xs" style={{ color: C.faint }}>That&apos;s everything that fits right now, so we&apos;re starting over.</p>}

      {shown.length === 0 && (
        <div className="rounded-2xl p-5 text-sm" style={{ background: C.card, border: `1px solid ${C.line}`, color: C.muted }}>
          Nothing fits right now. Try {eatStyle === 'out' ? 'cooking' : 'eating out'} instead:{' '}
          <button onClick={switchStyle} className="underline" style={{ color: C.gold }}>switch</button>
        </div>
      )}

      {shown.map((c, i) => (
        <div key={c.key} className="rounded-[20px] overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <button onClick={() => choose(c)} disabled={busy} className="w-full text-left active:scale-[0.99] transition-transform disabled:opacity-60">
            <div className="px-4 pt-3.5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: c.kind === 'out' ? C.gold : C.green }}>
                Order {i === 0 ? 'A' : 'B'} · {c.kind === 'out' ? 'Eating out' : 'Cooking'}
              </span>
              <span className="text-[11px]" style={{ color: C.faint }}>leaves {Math.max(0, remainingCal - c.cal).toLocaleString()}</span>
            </div>
            <div className="px-4 pt-1.5 pb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[15px] leading-snug" style={{ color: C.ivory }}>{c.name}</p>
                <p className="text-[12px] mt-0.5" style={{ color: C.muted }}>{c.place}</p>
              </div>
              <p className="shrink-0 text-right leading-none">
                <span className="text-[26px] font-bold tabular-nums" style={{ color: C.ivory }}>{c.cal}</span>
                <span className="text-[11px] ml-0.5" style={{ color: C.muted }}>cal</span>
                {c.calSource === 'estimated' && <span className="block text-[9px] mt-1 uppercase tracking-wider" style={{ color: C.faint }}>estimated</span>}
              </p>
            </div>
            <div className="px-4 pb-1 flex items-center gap-2 text-[12px]" style={{ color: C.muted }}>
              {c.price != null && <span className="font-semibold" style={{ color: C.gold }}>about ${c.price}</span>}
              {c.price != null && <span>·</span>}
              <span>{c.protein}g protein</span>
            </div>
            <p className="px-4 pb-2 text-[12px]" style={{ color: C.green }}>{c.why}</p>
          </button>
          <div className="px-4 pb-3">
            <button onClick={() => setOpen(open === c.key ? null : c.key)} className="text-[11px] underline underline-offset-2" style={{ color: C.faint }}>
              {open === c.key ? 'Hide breakdown' : 'Full breakdown'}
            </button>
            {open === c.key && (
              <div className="mt-2 text-[12px] space-y-1.5" style={{ color: C.muted }}>
                <p>{c.protein}g protein · {c.carbs}g carbs · {c.fat}g fat</p>
                {c.ingredients && c.ingredients.length > 0 && <p>{c.ingredients.join(', ')}</p>}
                <p style={{ color: C.faint }}>
                  {c.kind === 'out' ? `Calories from ${c.place}'s published nutrition.` : 'Calories from The Menu cookbook.'}
                  {' '}Price is an estimate.
                </p>
                {reported[c.key] ? (
                  <p style={{ color: C.green }}>Thanks. We&apos;ll check it.</p>
                ) : (
                  <button onClick={() => { post({ action: 'report', key: `${c.place} — ${c.name}` }); setReported((r) => ({ ...r, [c.key]: true })) }} className="underline underline-offset-2" style={{ color: C.faint }}>
                    Report a problem
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {pairs > 1 && (
        <button onClick={showOthers} disabled={busy} className="self-center text-[12.5px] underline underline-offset-[3px] py-1" style={{ color: C.faint }}>
          Show me two others
        </button>
      )}
    </div>
  )
}

// For someone who finished intake before the 'eating' question existed: the
// same question, once, right here — one tap and her picks appear.
export function EatStyleAsk({ remainingCal, dayTarget }: { remainingCal: number; dayTarget: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function set(style: EatStyle) {
    setBusy(true)
    await fetch('/api/plan/meal-pick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'style', eatStyle: style }) }).catch(() => null)
    router.refresh()
  }
  return (
    <div className="flex flex-col gap-3">
      <CalLine left={remainingCal} target={dayTarget} />
      <p className="text-xl font-bold" style={{ color: C.ivory }}>How do you usually eat?</p>
      <p className="text-sm -mt-1" style={{ color: C.muted }}>One tap. We&apos;ll pick every meal to fit it.</p>
      {(['cook', 'out'] as EatStyle[]).map((s) => (
        <button key={s} onClick={() => set(s)} disabled={busy}
          className="w-full text-left rounded-2xl px-5 py-4 font-semibold active:scale-[0.99] transition-transform disabled:opacity-50"
          style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ivory }}>
          {s === 'cook' ? 'I mostly cook' : 'I mostly eat out'}
        </button>
      ))}
    </div>
  )
}
