// Renders a built WeekPlan ("What to Eat This Week"). Presentational — server or client.
import type { WeekPlan, Slot } from '@/lib/meal-plan'
import Ring from '@/components/Ring'

const SLOT_LABEL: Record<Slot, string> = { BF: 'Breakfast', LN: 'Lunch', SN: 'Snack', DN: 'Dinner', DS: 'Dessert' }

export default function WeekPlanView({ plan }: { plan: WeekPlan }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] bg-gold/15 text-gold px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">{plan.cookDays} cook {plan.cookDays === 1 ? 'day' : 'days'}</span>
        <span className="text-[10px] bg-obsidian border border-smoke text-ivory/60 px-2.5 py-1 rounded-full uppercase tracking-wider">~{plan.avgCal.toLocaleString()} cal/day avg</span>
        <span className="text-[10px] bg-obsidian border border-smoke text-ivory/60 px-2.5 py-1 rounded-full uppercase tracking-wider">~{plan.avgProtein}g protein/day</span>
      </div>
      <p className="text-ink/50 text-xs">Protein-forward on purpose — it keeps you full longer and cuts the sugar/carb cravings that derail a good day.</p>

      {/* Cook schedule */}
      <div className="bg-charcoal border border-gold/30 rounded-2xl p-5">
        <p className="text-gold text-xs uppercase tracking-wider font-semibold mb-3">Your cook schedule</p>
        <div className="space-y-3">
          {plan.batches.map((b, i) => (
            <div key={i}>
              <p className="text-white text-sm font-semibold">{b.label} <span className="text-ivory/40 font-normal">· covers {b.covers}</span></p>
              <p className="text-ivory/50 text-xs mt-0.5">Batch: {b.meals.join(' · ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Days */}
      {plan.days.map((d, i) => (
        <div key={i} className="bg-charcoal border border-smoke rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{d.dayName}</h3>
              <span className={`inline-block mt-1 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${d.eatOut ? 'bg-blue-500/15 text-blue-400' : d.dayType === 'workout' ? 'bg-gold/15 text-gold' : 'bg-green-500/15 text-green-400'}`}>
                {d.eatOut ? '🍔 Eating out' : d.dayType === 'workout' ? '💪🏽 Workout' : '😌 Rest'} · {d.target.toLocaleString()} cal
              </span>
            </div>
            <Ring pct={Math.min(100, Math.round((d.totalCal / (d.target || 1)) * 100))} size={54} stroke={5}
              color={d.eatOut ? '#4A9FE0' : d.dayType === 'workout' ? '#C9A84C' : '#46c46f'}>
              <span className="text-[11px] font-bold text-white tabular-nums">{Math.round((d.totalCal / (d.target || 1)) * 100)}%</span>
            </Ring>
          </div>
          <div className="space-y-2">
            {d.meals.map((m, j) => (
              <div key={j} className="bg-obsidian border border-smoke rounded-xl px-4 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ivory/40 text-[10px] uppercase tracking-wider">{SLOT_LABEL[m.slot]}{(m.slot === 'BF' || m.slot === 'LN' || m.slot === 'DN') && m.portion !== 'Regular' ? ` · ${m.portion} portion` : ''}</p>
                    <p className="text-white text-sm leading-tight">{m.name}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-gold text-sm font-semibold">{m.cal} cal</p>
                    <p className="text-green-400 text-xs">{m.protein}g P</p>
                  </div>
                </div>
                {m.ingredients.length > 0 && (
                  <p className="text-ivory/45 text-xs mt-1.5 leading-relaxed">{m.ingredients.map((g) => g.amount).join(' · ')}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-smoke text-xs">
            <span className="text-ivory/50">Day total</span>
            <span className="text-white font-semibold">{d.totalCal.toLocaleString()} cal · {d.totalProtein}g protein</span>
          </div>
        </div>
      ))}

      {/* Grocery list — aggregated for the week, by aisle */}
      {plan.grocery.length > 0 && (
        <div className="bg-charcoal border border-gold/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gold text-xs uppercase tracking-wider font-semibold">Your grocery list</p>
            {plan.groceryCost > 0 && <p className="text-white text-sm font-bold">~${plan.groceryCost} <span className="text-ivory/40 text-xs font-normal">est.</span></p>}
          </div>
          <p className="text-ivory/40 text-xs mb-4">Everything for the week, portioned to your calories. One store run — walk the aisles in order.</p>
          <div className="space-y-4">
            {plan.grocery.map((sec) => (
              <div key={sec.aisle}>
                <p className="text-white text-sm font-semibold mb-1.5">{sec.aisle}</p>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                  {sec.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-xs border-b border-smoke/60 py-1">
                      <span className="text-ivory/60">{it.item}</span>
                      <span className="text-white font-medium whitespace-nowrap">{it.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-ivory/30 text-[11px] mt-4">Snacks & any budget-friendly picks aren&apos;t itemized here yet. Already have pantry staples? Subtract ~$50–65.</p>
        </div>
      )}
    </div>
  )
}
