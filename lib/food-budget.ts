// Her food money for today (2026-10-30, Asa's "Budget display" prompt).
// She sets a weekly food budget at intake; today's budget is that ÷ 7.
// Money spent = the prices of the meals she accepted today (eat-out and
// home picks). Anything she logged by hand without a price counts $0.
// Pure functions only, so the math can be tested on its own.

/** Today's food money from her weekly budget. null = she never set one. */
export function dailyFoodBudget(weekly: number | null | undefined): number | null {
  const w = Number(weekly)
  return Number.isFinite(w) && w > 0 ? cents(w / 7) : null
}

/** What she spent today: the sum of the prices on today's food-log rows. */
export function spentToday(rows: { price?: number | string | null }[]): number {
  return cents(rows.reduce((s, r) => s + (Number(r.price) > 0 ? Number(r.price) : 0), 0))
}

/** Money left today — never below $0 on screen. */
export function moneyLeft(daily: number, spent: number): number {
  return Math.max(0, cents(daily - spent))
}

export type MoneyTone = 'green' | 'yellow' | 'red'
// The app's own emerald / gold / coral.
export const MONEY_COLOR: Record<MoneyTone, string> = { green: '#1EE38A', yellow: '#E5A93C', red: '#FF5A4E' }

/** Green when more than half is left, yellow under half, red under 20%. */
export function moneyTone(left: number, daily: number): MoneyTone {
  if (!(daily > 0)) return 'red'
  const share = left / daily
  return share > 0.5 ? 'green' : share < 0.2 ? 'red' : 'yellow'
}

/** "$10" for whole dollars, "$14.29" otherwise. */
export function money(n: number): string {
  const c = cents(n)
  return `$${Number.isInteger(c) ? c : c.toFixed(2)}`
}

/** Money is a hard rule for picks: only meals that fit what's left today.
 * Nothing fits → the single cheapest one (most protein breaks a tie), and
 * `over` says so. A meal with no known price counts as fitting. */
export function fitToMoney<T extends { price: number | null; protein: number }>(options: T[], left: number | null): { options: T[]; over: boolean } {
  if (left == null) return { options, over: false }
  const fit = options.filter((o) => o.price == null || o.price <= left)
  if (fit.length || !options.length) return { options: fit, over: false }
  const cheapest = [...options].sort((a, b) => (a.price ?? 0) - (b.price ?? 0) || b.protein - a.protein)[0]
  return { options: [cheapest], over: true }
}

function cents(n: number): number { return Math.round(n * 100) / 100 }
