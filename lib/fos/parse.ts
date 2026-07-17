import type { LifeSignal } from './recovery'

// Rule-based intent parser: turn what she types ("I only have 20 minutes", "I'm
// exhausted", "eating out with coworkers") into a LifeSignal the recovery engine can
// act on. Phase 2 will swap this for Claude; the surface stays identical.
export function parseSignal(text: string): LifeSignal | null {
  const t = ` ${text.toLowerCase()} `

  // Time crunch — "20 min", "only have 30 minutes", "short on time"
  const mMatch = t.match(/(\d{1,3})\s*(?:min|minute)/)
  if (mMatch || /short on time|only have|not much time|in a hurry|quick workout|no time/.test(t)) {
    return { kind: 'time_crunch', minutes: mMatch ? parseInt(mMatch[1], 10) : 20 }
  }
  if (/exhaust|drained|no energy|so tired|wiped|burnt out|burned out|worn out|low energy/.test(t)) return { kind: 'exhausted' }
  if (/didn'?t sleep|no sleep|couldn'?t sleep|bad sleep|slept (bad|poorly|terrible)|up all night|insomnia|barely slept/.test(t)) return { kind: 'poor_sleep' }
  if (/eat(ing)? out|lunch meeting|dinner out|restaurant|going out to (eat|lunch|dinner)|coworkers? for lunch|grabbing (lunch|dinner|food)|ordering out/.test(t)) return { kind: 'eat_out' }
  if (/schedule (chang|shift)|recital|appointment|meeting ran|got busy|working late|work from|kids?|daughter|son|family|pick up|drop off|errand|different today/.test(t)) return { kind: 'schedule_change' }
  if (/missed|skipped|fell off|haven'?t worked out|didn'?t work out|off track|been a few days|slacked/.test(t)) {
    const dMatch = t.match(/(\d{1,2})\s*days?/)
    return { kind: 'missed', days: dMatch ? parseInt(dMatch[1], 10) : 2 }
  }
  return null
}
