'use client'

import { useState, useEffect } from 'react'

type DayTask = {
  day: string
  pillar: 'marketing' | 'acquisition' | 'sales'
  task: string
  example: string
}

const WEEKLY_SCHEDULE: DayTask[] = [
  { day: 'Monday', pillar: 'marketing', task: 'Before/After Edit', example: 'Show a side-by-side of raw footage vs your edited version' },
  { day: 'Tuesday', pillar: 'acquisition', task: 'Free Offer Post', example: '"I\'ll edit your first Reel free — DM me" with a portfolio clip' },
  { day: 'Wednesday', pillar: 'sales', task: 'Testimonial / Result', example: 'Client result, DM screenshot, or engagement stats from your edits' },
  { day: 'Thursday', pillar: 'marketing', task: 'Quick Tip / Tutorial', example: '30-sec editing tip, CapCut trick, or content strategy insight' },
  { day: 'Friday', pillar: 'acquisition', task: 'Behind the Scenes', example: 'Screen recording of you editing, your setup, or your workflow' },
  { day: 'Saturday', pillar: 'sales', task: 'Package Breakdown', example: 'Explain what\'s included in your Starter/Growth/VIP package' },
  { day: 'Sunday', pillar: 'marketing', task: 'Trending Audio Post', example: 'Jump on a trending sound with your own creative spin' },
]

const DAILY_TASKS = [
  { id: 'content', label: 'Post 1 piece of content', time: '15 min' },
  { id: 'dms', label: 'Send 15-25 DMs to prospects', time: '30-45 min' },
  { id: 'sdr', label: 'Run SDR agent for cold emails', time: '5 min' },
  { id: 'admin', label: 'Check admin — reply to leads, update projects', time: '15 min' },
  { id: 'engage', label: 'Engage on 10-15 posts in your niche', time: '15 min' },
]

const PILLAR_COLORS = {
  marketing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  acquisition: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  sales: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const PILLAR_LABELS = {
  marketing: 'Marketing',
  acquisition: 'Client Acquisition',
  sales: 'Sales',
}

function getWeekKey() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `schedule_${now.getFullYear()}_w${weekNum}`
}

function getTodayKey() {
  return `daily_${new Date().toISOString().split('T')[0]}`
}

export default function ContentSchedule() {
  const weekKey = getWeekKey()
  const todayKey = getTodayKey()
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const [weekChecked, setWeekChecked] = useState<Record<string, boolean>>({})
  const [dailyChecked, setDailyChecked] = useState<Record<string, boolean>>({})
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const savedWeek = JSON.parse(localStorage.getItem(weekKey) || '{}')
    const savedDaily = JSON.parse(localStorage.getItem(todayKey) || '{}')
    setWeekChecked(savedWeek)
    setDailyChecked(savedDaily)

    // Calculate streak
    let s = 0
    const today = new Date()
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today.getTime() - i * 86400000)
      const key = `daily_${d.toISOString().split('T')[0]}`
      const data = JSON.parse(localStorage.getItem(key) || '{}')
      const completed = Object.values(data).filter(Boolean).length
      if (completed >= 3) s++
      else break
    }
    setStreak(s)
  }, [weekKey, todayKey])

  function toggleWeek(day: string) {
    const updated = { ...weekChecked, [day]: !weekChecked[day] }
    setWeekChecked(updated)
    localStorage.setItem(weekKey, JSON.stringify(updated))
  }

  function toggleDaily(id: string) {
    const updated = { ...dailyChecked, [id]: !dailyChecked[id] }
    setDailyChecked(updated)
    localStorage.setItem(todayKey, JSON.stringify(updated))
  }

  const weekCompleted = Object.values(weekChecked).filter(Boolean).length
  const dailyCompleted = Object.values(dailyChecked).filter(Boolean).length
  const dailyProgress = (dailyCompleted / DAILY_TASKS.length) * 100
  const todayTask = WEEKLY_SCHEDULE.find(t => t.day === todayName)

  return (
    <div className="space-y-6">
      {/* Today's Focus */}
      {todayTask && (
        <div className={`rounded-xl border p-6 ${weekChecked[todayTask.day] ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-charcoal border-smoke'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-white">Today&apos;s Content — {todayName}</h2>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${PILLAR_COLORS[todayTask.pillar]}`}>
                {PILLAR_LABELS[todayTask.pillar]}
              </span>
            </div>
            <button
              onClick={() => toggleWeek(todayTask.day)}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl transition-all ${
                weekChecked[todayTask.day]
                  ? 'bg-emerald-500 border-emerald-500 text-white scale-110'
                  : 'border-smoke hover:border-gold text-ivory/30 hover:text-gold'
              }`}
            >
              {weekChecked[todayTask.day] ? '✓' : ''}
            </button>
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">{todayTask.task}</h3>
          <p className="text-ivory/50 text-sm">{todayTask.example}</p>
        </div>
      )}

      {/* Daily Checklist */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Daily Tasks</h2>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <span className="text-xs text-orange-400">{streak} day streak</span>
            )}
            <span className={`text-xs font-medium ${dailyCompleted === DAILY_TASKS.length ? 'text-emerald-400' : 'text-ivory/40'}`}>
              {dailyCompleted}/{DAILY_TASKS.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-obsidian rounded-full h-2 mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              dailyProgress >= 100 ? 'bg-emerald-500' : dailyProgress >= 60 ? 'bg-gold' : 'bg-yellow-500'
            }`}
            style={{ width: `${dailyProgress}%` }}
          />
        </div>

        <div className="space-y-2">
          {DAILY_TASKS.map(task => (
            <button
              key={task.id}
              onClick={() => toggleDaily(task.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                dailyChecked[task.id]
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-obsidian border border-smoke/50 hover:border-smoke'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                dailyChecked[task.id]
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-smoke'
              }`}>
                {dailyChecked[task.id] && <span className="text-xs">✓</span>}
              </div>
              <span className={`text-sm flex-1 ${dailyChecked[task.id] ? 'text-ivory/40 line-through' : 'text-ivory/80'}`}>
                {task.label}
              </span>
              <span className="text-[10px] text-ivory/30">{task.time}</span>
            </button>
          ))}
        </div>

        {dailyCompleted === DAILY_TASKS.length && (
          <div className="mt-4 text-center py-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <span className="text-emerald-400 font-semibold">All tasks complete! You crushed it today.</span>
          </div>
        )}
      </div>

      {/* Weekly Schedule */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">This Week&apos;s Content</h2>
          <span className="text-xs text-ivory/40">{weekCompleted}/7 posted</span>
        </div>

        <div className="space-y-2">
          {WEEKLY_SCHEDULE.map(item => {
            const isToday = item.day === todayName
            return (
              <button
                key={item.day}
                onClick={() => toggleWeek(item.day)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  weekChecked[item.day]
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : isToday
                    ? 'bg-gold/5 border border-gold/20'
                    : 'bg-obsidian border border-smoke/50 hover:border-smoke'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  weekChecked[item.day]
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isToday
                    ? 'border-gold'
                    : 'border-smoke'
                }`}>
                  {weekChecked[item.day] && <span className="text-xs">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${weekChecked[item.day] ? 'text-ivory/40 line-through' : 'text-white'}`}>
                      {item.day}
                    </span>
                    {isToday && !weekChecked[item.day] && (
                      <span className="text-[10px] text-gold font-medium">TODAY</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${PILLAR_COLORS[item.pillar]}`}>
                      {PILLAR_LABELS[item.pillar]}
                    </span>
                  </div>
                  <span className={`text-xs ${weekChecked[item.day] ? 'text-ivory/20' : 'text-ivory/50'}`}>
                    {item.task} — {item.example}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
