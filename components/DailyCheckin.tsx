'use client'

import { useEffect, useState } from 'react'
import Ring from '@/components/Ring'
import SessionExpiredNotice from '@/components/SessionExpiredNotice'

type Today = { workout?: boolean; nutrition?: boolean } | null

export default function DailyCheckin() {
  const [streak, setStreak] = useState(0)
  const [today, setToday] = useState<Today>(null)
  const [loading, setLoading] = useState(true)
  const [pop, setPop] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    fetch('/api/plan/daily').then((r) => {
      if (r.status === 401) { setExpired(true); setLoading(false); return null }
      return r.json()
    }).then((d) => { if (d) { setStreak(d.streak || 0); setToday(d.today) }; setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function set(key: 'workout' | 'nutrition') {
    const prev = today
    const now = !today?.[key]
    const next = { workout: !!today?.workout, nutrition: !!today?.nutrition, [key]: now }
    setToday(next)
    if (now) { setPop(key); setTimeout(() => setPop(null), 700) }
    const res = await fetch('/api/plan/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
    if (res.status === 401) { setToday(prev); setExpired(true); return }
    const d = await res.json()
    setStreak(d.streak || 0); setToday(d.today)
  }

  if (expired) return <SessionExpiredNotice />

  const both = !!today?.workout && !!today?.nutrition
  const items: { k: 'workout' | 'nutrition'; label: string; icon: string }[] = [
    { k: 'workout', label: 'Workout', icon: '💪🏽' },
    { k: 'nutrition', label: 'Nutrition', icon: '🍽️' },
  ]

  return (
    <div className="bg-charcoal border border-smoke rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-semibold text-sm">Did you show up today?</p>
        <span className="text-gold font-bold text-sm"><span className="luf-flame">🔥</span> {loading ? '—' : streak} day{streak === 1 ? '' : 's'}</span>
      </div>
      <div className="flex justify-around">
        {items.map(({ k, label, icon }) => {
          const done = !!today?.[k]
          return (
            <button key={k} onClick={() => set(k)} disabled={loading} className="flex flex-col items-center gap-2 group">
              <div className={pop === k ? 'luf-pop' : ''}>
                <Ring pct={done ? 100 : 0} size={72} stroke={7} color={done ? '#46c46f' : '#3a3a44'} track="rgba(255,255,255,0.06)">
                  <span className={`text-2xl transition-transform group-hover:scale-110 ${done ? '' : 'opacity-50 grayscale'}`}>{done ? '✓' : icon}</span>
                </Ring>
              </div>
              <span className={`text-xs font-semibold ${done ? 'text-green-400' : 'text-ivory/50'}`}>{label}</span>
            </button>
          )
        })}
      </div>
      <p className={`text-xs mt-4 text-center transition-colors ${both ? 'text-green-400 font-semibold' : 'text-ivory/40'}`}>
        {both ? "That's a full day, and I saw it. Proud of you. 💛" : "Tap what you hit — I'm watching, and every day counts."}
      </p>
    </div>
  )
}
