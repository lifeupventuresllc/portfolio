// Plain-language wording for the Home "first screen" (Asa's strip-down,
// 2026-09-28): the engine's workout instruction is `${title} today, love —
// your body's worth it.` where title is the plan's internal day label ("Day 1:
// Quads & Hamstrings & Glutes"). That reads like a gym schedule, not a
// sentence a person can act on. This only ever REWORDS what the engine
// already decided — never invents a workout, and never a number (no minutes:
// the real duration isn't known on Home without building the workout).

const LEG = /\b(leg|legs|quad|quads|hamstring|hamstrings|glute|glutes|calf|calves|lower)\b/
const UPPER = /\b(upper|chest|back|shoulder|shoulders|arm|arms|bicep|biceps|tricep|triceps|push|pull)\b/

function withArticle(label: string): string {
  return /^[aeiou]/i.test(label) ? `An ${label}` : `A ${label}`
}

// "Day 1: Quads & Hamstrings & Glutes" -> "A leg workout today."
// Unknown/mixed labels fall back to the cleaned label itself, never a guess.
export function plainWorkoutLine(rawTitle: string): string {
  const cleaned = rawTitle.replace(/^\s*day\s*\d+\s*[:\-–—]\s*/i, '').trim()
  const t = cleaned.toLowerCase()
  const isLeg = LEG.test(t)
  const isUpper = UPPER.test(t)
  const hasCore = /\b(core|abs)\b/.test(t)

  // A single named area ("Arms Focus", "Core Focus") says exactly that, not a
  // broader bucket than what she asked for.
  const single = t.replace(/\s*focus$/, '').trim()
  const SINGLE: Record<string, string> = { arms: 'arms', chest: 'chest', back: 'back', shoulders: 'shoulders', core: 'core', legs: 'leg' }
  if (SINGLE[single]) return `${withArticle(SINGLE[single])} workout today.`

  let label: string | null = null
  if (/\bfull[\s-]?body\b/.test(t)) label = 'full-body'
  else if (/\bcardio\b/.test(t)) label = 'cardio'
  else if (isLeg && !isUpper) label = hasCore ? 'leg and core' : 'leg'
  else if (isUpper && !isLeg) label = hasCore ? 'upper-body and core' : 'upper-body'
  if (label) return `${withArticle(label)} workout today.`
  return cleaned ? `${cleaned} today.` : 'Your workout today.'
}

export type HeroCopy = { headline: string; warm: string | null }

// Splits the engine's instruction into a big headline + a small warm line.
// Only the workout template is reworded (it's the one with the gym-label
// problem); every other kind (water, eating-out pick, coach, partner...) is
// already a plain sentence and shows exactly as the engine wrote it.
export function heroCopy(kind: string, instruction: string): HeroCopy {
  if (kind === 'workout') {
    const m = instruction.match(/^(.+?) today, love — ([\s\S]*)$/)
    if (m) {
      const rest = m[2].trim()
      return {
        headline: plainWorkoutLine(m[1]),
        warm: rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : null,
      }
    }
  }
  return { headline: instruction, warm: null }
}
