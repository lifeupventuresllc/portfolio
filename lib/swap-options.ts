// ============================================================
// Swap (2026-11-12, Asa): "if the machine isn't available at the gym, or the
// weights aren't, a button they can click and swap — at home too."
//
// Three moves that work the SAME muscles, at her level, safe for her
// injuries, and that she can do where she is. At least one needs no weights
// at all, so a swap always works even with nothing around. Pure function —
// the workout screen runs it right on her phone.
// ============================================================
import { ATOMIC_LIBRARY, isExerciseSafe } from './exercise-library'
import { COMBO_MOVES } from './combo-moves'
import { isContraindicated, type Injury } from './workout-exercises'
import { musclesWorked } from './muscle-tags'
import { weightLabel, type WeightTag } from './weight-tags'
import { howToFor } from './exercise-howto'

export interface SwapOption { name: string; tag: WeightTag | null; cue?: string; imageUrl?: string }
export type SwapWhy = 'taken' | 'none' | 'hurts'

const CARDIO = /treadmill|walk|march|running|jog|jacks|knees|butt kicks|climber|skater|jump|bike|row(er|ing machine)/i
const isCardio = (name: string) => !/bridge|lunge|row \+|bent-over/i.test(name) && (ATOMIC_LIBRARY.find((e) => e.name === name)?.movementPattern === 'cardio' || CARDIO.test(name) || /punch|jab|butt kick|front kick|kickboxing/i.test(name))

interface Cand { name: string; pattern?: string; tag: WeightTag | null; level: number; cue?: string; imageUrl?: string }

function candidates(location: 'gym' | 'home', level: number, injuries: Injury[]): Cand[] {
  const lib: Cand[] = ATOMIC_LIBRARY
    .filter((e) => e.locations.includes(location) && e.skillLevel <= level && isExerciseSafe(e, injuries))
    .map((e) => ({ name: e.name, pattern: e.movementPattern, tag: weightLabel(e.name), level: e.skillLevel, cue: e.cue, imageUrl: e.imageUrl }))
  const combos: Cand[] = COMBO_MOVES
    .filter((m) => m.level <= level && !m.avoid.some((a) => injuries.includes(a)) && !isContraindicated(m.name, injuries))
    .map((m) => ({ name: m.name, pattern: 'compound', tag: weightLabel(m.name), level: m.level, cue: m.cue }))
  const seen = new Set<string>()
  return [...lib, ...combos].filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)))
}

/** How alike two moves are: shared muscles (0–1), plus a little for the same kind of move. */
function closeness(a: string, aPattern: string | undefined, b: Cand): number {
  const all = musclesWorked(a)
  const ma = all.length > 1 ? all.filter((m) => m !== 'core') : all // an ab move matches ab moves; a squat doesn't match one on 'core'
  const mb = musclesWorked(b.name)
  if (!ma.length || !mb.length) return 0
  const shared = ma.filter((m) => mb.includes(m)).length
  const score = shared / new Set([...ma, ...mb]).size
  return score + (aPattern && aPattern === b.pattern ? 0.25 : 0)
}

/** Up to 3 swaps for `name`. `exclude` = moves already in today's workout. */
export function swapOptionsFor(name: string, opts: { location: 'gym' | 'home'; level: number; injuries: Injury[]; exclude?: string[]; why?: SwapWhy }): SwapOption[] {
  const { location, level, injuries, exclude = [], why = 'taken' } = opts
  const fromTag = weightLabel(name)
  const fromPattern = ATOMIC_LIBRARY.find((e) => e.name === name)?.movementPattern
  const skip = new Set([name, ...exclude])
  const pool = candidates(location, level, injuries).filter((c) => !skip.has(c.name))

  let ranked: { c: Cand; s: number }[]
  if (isCardio(name)) {
    ranked = pool.filter((c) => c.pattern === 'cardio' || isCardio(c.name)).map((c) => ({ c, s: (c.level <= 1 ? 1 : 0.8) + (/walk|march|running|jog/i.test(c.name) ? 0.3 : 0) }))
  } else {
    ranked = pool.filter((c) => !isCardio(c.name)).map((c) => ({ c, s: closeness(name, fromPattern, c) })).filter((x) => x.s >= 0.34)
  }
  // Different gear first (the machine or weight she's missing is the problem),
  // and when it hurts, the easiest no-weight moves first.
  ranked.forEach((x) => {
    if (x.c.tag !== fromTag) x.s += 0.3
    if (why === 'hurts') x.s += (x.c.tag === 'No weights' ? 0.4 : 0) - x.c.level * 0.1
    if (why === 'none' && x.c.tag === fromTag && fromTag === 'Machine') x.s -= 0.5
  })
  ranked.sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name))

  const out: Cand[] = []
  for (const { c } of ranked) {
    if (out.length >= 3) break
    if (out.some((o) => o.tag === c.tag) && out.length < 2 && ranked.some((r) => !out.some((o) => o.tag === r.c.tag) && r.c.tag !== c.tag)) continue // mix the gear when we can
    out.push(c)
  }
  for (const { c } of ranked) { if (out.length >= 3) break; if (!out.includes(c)) out.push(c) }
  // Always one that needs nothing at all.
  if (!out.some((o) => o.tag === 'No weights')) {
    const bw = ranked.find((r) => r.c.tag === 'No weights')
    if (bw) out[Math.min(out.length, 2)] = bw.c
  }
  return out.slice(0, 3).map((c) => ({ name: c.name, tag: c.tag, cue: howToFor(c.name) || c.cue, imageUrl: c.imageUrl }))
}
