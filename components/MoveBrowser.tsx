'use client'

import { useMemo, useState } from 'react'
import { GYM_POOL, AB_POOL, HOME_POOL } from '@/lib/workout-exercises'

// The Workout Library — every move across gym, abs, and home, browsable by
// muscle group. Split out of the Cookbook (which is recipes-only now) into
// its own dedicated Workout Plans section.

type Move = { name: string; group: string; tag: string; cue: string }
const GROUP: Record<string, string> = { glutes: 'Legs', hamstrings: 'Legs', quads: 'Legs', calves: 'Legs', back: 'Upper', shoulders: 'Upper', chest: 'Upper', biceps: 'Upper', triceps: 'Upper' }
const ALL_MOVES: Move[] = [
  ...GYM_POOL.map((e) => ({ name: e.name, group: GROUP[e.muscle] || 'Upper', tag: `${e.muscle} · ${e.equip}`, cue: e.cue })),
  ...AB_POOL.map((a) => ({ name: a.name, group: 'Core', tag: `abs · ${a.zone}`, cue: a.cue })),
  ...HOME_POOL.map((h) => ({ name: h.name, group: 'Home', tag: `home · ${h.type}`, cue: '' })),
]
const MOVE_GROUPS = ['All', 'Legs', 'Upper', 'Core', 'Home']

export default function MoveBrowser() {
  const [group, setGroup] = useState('All')
  const [q, setQ] = useState('')

  const moves = useMemo(() => ALL_MOVES.filter((m) => (group === 'All' || m.group === group) && m.name.toLowerCase().includes(q.toLowerCase())), [group, q])
  const pill = (active: boolean) => `px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${active ? 'bg-gold text-obsidian' : 'bg-charcoal border border-smoke text-ivory/60'}`

  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search moves…"
        className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-sm mb-4 focus:outline-none focus:border-gold" />
      <div className="flex gap-2 mb-4 flex-wrap">
        {MOVE_GROUPS.map((g) => <button key={g} onClick={() => setGroup(g)} className={pill(group === g)}>{g}</button>)}
      </div>
      <div className="space-y-2">
        {moves.map((m) => (
          <div key={m.name} className="bg-charcoal border border-smoke rounded-xl px-4 py-3">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-white font-semibold text-sm">{m.name}</span>
              <span className="text-ivory/40 text-[10px] uppercase tracking-wider whitespace-nowrap">{m.tag}</span>
            </div>
            {m.cue && <p className="text-ivory/45 text-xs mt-1 leading-relaxed">{m.cue}</p>}
          </div>
        ))}
      </div>
      {moves.length === 0 && <p className="text-ink/50 text-sm text-center py-8">No moves match &ldquo;{q}&rdquo;.</p>}
    </div>
  )
}
