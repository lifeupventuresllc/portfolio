// Her day plan (2026-11-05, Asa's first real user test): she picks every
// meal for today up front — breakfast, lunch, snack, dinner — taps "Confirm
// my day", and sees the whole day. Picking only PLANS a meal; it counts
// toward her calories when she taps "Ate it" (or orders it). She can go back
// and change any meal she hasn't eaten yet. Saved on her intake row
// (form_data.day_plan), so it's there when she comes back later today and
// starts fresh tomorrow.

export type PlanStopId = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'snack2' | 'snack3'

export interface PlanStopDef { id: PlanStopId; slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'; label: string; share: number; meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' }

// The four meals of her day, in order. Shares split her calories (sum 1).
export const PLAN_STOPS: PlanStopDef[] = [
  { id: 'breakfast', slot: 'Breakfast', label: 'breakfast', share: 0.25, meal: 'breakfast' },
  { id: 'lunch', slot: 'Lunch', label: 'lunch', share: 0.35, meal: 'lunch' },
  { id: 'snack', slot: 'Snack', label: 'snack', share: 0.08, meal: 'snack' },
  { id: 'dinner', slot: 'Dinner', label: 'dinner', share: 0.32, meal: 'dinner' },
]
// "Add a snack" on her day plan (at most two more).
export const EXTRA_SNACKS: PlanStopDef[] = [
  { id: 'snack2', slot: 'Snack', label: 'extra snack', share: 0, meal: 'snack' },
  { id: 'snack3', slot: 'Snack', label: 'extra snack', share: 0, meal: 'snack' },
]
export const ALL_STOP_IDS: PlanStopId[] = [...PLAN_STOPS, ...EXTRA_SNACKS].map((s) => s.id)

/** One planned meal — just what the day plan needs to show and count it. */
export interface PlannedPick {
  key: string
  kind: 'out' | 'cook'
  name: string
  short: string
  place: string
  photo: string
  cal: number; protein: number; carbs: number; fat: number
  price: number | null
  ingredients?: string[]    // cook-it meals: what she needs, portioned
  eatenId?: string | null   // her food-log row once she ate / ordered it
}

export interface SavedDayPlan {
  date: string                                   // her local YYYY-MM-DD
  confirmed: boolean
  picks: Partial<Record<PlanStopId, PlannedPick | null>>   // null = she skipped that meal
  extras: number                                 // extra snacks added (0–2)
}

export const emptyPlan = (date: string): SavedDayPlan => ({ date, confirmed: false, picks: {}, extras: 0 })

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0)

/** A pick from the phone, cleaned before it's saved. */
export function cleanPick(raw: unknown): PlannedPick | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const key = str(p.key, 140), name = str(p.name, 300)
  if (!key || !name) return null
  return {
    key, name,
    kind: p.kind === 'cook' ? 'cook' : 'out',
    short: str(p.short, 120) || name.slice(0, 120),
    place: str(p.place, 80),
    photo: str(p.photo, 200).startsWith('/') ? str(p.photo, 200) : '',
    cal: num(p.cal), protein: num(p.protein), carbs: num(p.carbs), fat: num(p.fat),
    price: p.price == null || !Number.isFinite(Number(p.price)) ? null : Math.round(Number(p.price) * 100) / 100,
    ...(Array.isArray(p.ingredients) ? { ingredients: p.ingredients.filter((i): i is string => typeof i === 'string').slice(0, 30).map((i) => i.slice(0, 120)) } : {}),
    eatenId: typeof p.eatenId === 'string' ? p.eatenId.slice(0, 64) : null,
  }
}

/** Today's saved plan, or a fresh one when it's from another day / missing. */
export function readPlan(raw: unknown, todayIso: string): SavedDayPlan {
  if (!raw || typeof raw !== 'object') return emptyPlan(todayIso)
  const p = raw as Record<string, unknown>
  if (p.date !== todayIso) return emptyPlan(todayIso)
  const picks: SavedDayPlan['picks'] = {}
  const rawPicks = (p.picks || {}) as Record<string, unknown>
  for (const id of ALL_STOP_IDS) {
    if (!(id in rawPicks)) continue
    picks[id] = rawPicks[id] === null ? null : cleanPick(rawPicks[id])
  }
  return { date: todayIso, confirmed: p.confirmed === true, picks, extras: Math.min(2, num(p.extras)) }
}
