'use client'

import { useEffect, useState } from 'react'

type Today = { workout?: boolean; nutrition?: boolean } | null

export default function DailyCheckin() {
  const [streak, setStreak] = useState(0)
  const [today, setToday] = useState<Today>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/plan/daily').then((r) => r.json()).then((d) => { setStreak(d.streak || 0); setToday(d.today); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function set(key: 'workout' | 'nutrition') {
    const next = { workout: !!today?.workout, nutrition: !!today?.nutrition, [key]: !today?.[key] }
    setToday(next) // optimistic
    const res = await fetch('/api/plan/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
    const d = await res.json()
    setStreak(d.streak || 0); setToday(d.today)
  }

  const chip = (active: boolean) => `flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-green-500/15 text-green-400 border border-green-500/40' : 'bg-obsidian border border-smoke text-ivory/50'}`

  return (
    <div className="bg-charcoal border border-smoke rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-semibold text-sm">Did you show up today?</p>
        <span className="text-gold font-bold text-sm">🔥 {loading ? '—' : streak} day{streak === 1 ? '' : 's'}</span>
      </div>
      <div className="flex gap-3">
        <button onClick={() => set('workout')} disabled={loading} className={chip(!!today?.workout)}>{today?.workout ? '✅' : ''} Workout</button>
        <button onClick={() => set('nutrition')} disabled={loading} className={chip(!!today?.nutrition)}>{today?.nutrition ? '✅' : ''} Nutrition</button>
      </div>
      <p className="text-ivory/40 text-xs mt-3">Tap what you hit. Keep the streak alive — I&apos;m watching, and I&apos;m proud of every day you show up.</p>
    </div>
  )
}
