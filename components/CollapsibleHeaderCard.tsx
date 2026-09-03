'use client'

import { useState } from 'react'
import Link from 'next/link'
import StreakChip from '@/components/StreakChip'
import { GoalProgressCompact } from '@/components/GoalProgressBar'

// Collapsible header card (Asa's ask, 2026-08-31): the merged greeting +
// self-talk + progress card can fold down to a thin strip on demand, so a
// viewer who wants maximum feed can have it, without losing the info for
// anyone who doesn't collapse it. `page.tsx` is a server component and
// can't hold this toggle state itself, so the whole card lives here as its
// own small client component instead of inline JSX in the page.
export default function CollapsibleHeaderCard({
  firstName, affirmation, statsProvided, startWeight, currentWeight, goalWeight, goalDirection, loggedCaloriesToday, calBudget,
}: {
  firstName: string
  affirmation: string | null
  statsProvided: boolean
  startWeight: number
  currentWeight: number
  goalWeight: number
  goalDirection: 'lose' | 'gain' | 'maintain'
  loggedCaloriesToday: number
  calBudget: number | null
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <div className="mt-2 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2" style={{ background: 'rgba(6,35,26,0.35)', border: '1px solid rgba(15,122,83,0.4)', backdropFilter: 'blur(3px)' }}>
        <h1 className="text-white" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 16, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>Hey {firstName}</h1>
        <div className="flex items-center gap-2">
          <StreakChip />
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand"
            aria-expanded={false}
            className="rounded-full shrink-0 flex items-center justify-center active:scale-90 transition-transform"
            style={{ width: 18, height: 18, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(229,169,60,0.5)' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#E5A93C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mt-2 rounded-xl px-2.5 py-2" style={{ background: 'rgba(6,35,26,0.35)', border: '1px solid rgba(15,122,83,0.4)', backdropFilter: 'blur(3px)', paddingBottom: 26 }}>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-white" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 20, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>Hey {firstName}</h1>
        <StreakChip />
      </div>
      {affirmation && (
        <div className="mt-1.5">
          <p className="text-[#E5A93C] text-[9px] font-bold uppercase" style={{ fontFamily: 'var(--font-poppins)', letterSpacing: '0.18em' }}>Today&apos;s self-talk</p>
          <p className="text-white/90 italic text-[11px] leading-snug mt-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>&ldquo;{affirmation}&rdquo;</p>
        </div>
      )}
      {statsProvided ? (
        <div className="mt-2">
          <GoalProgressCompact startWeight={startWeight} currentWeight={currentWeight} goalWeight={goalWeight} goal={goalDirection} calorieLoggedToday={loggedCaloriesToday} calorieBudgetToday={calBudget} embedded />
        </div>
      ) : (
        // Was plain text inside a <Link> — technically tappable, but nothing
        // about it looked like a button, so a brand-new user had no visual
        // cue to press it (Asa's catch, 2026-09-03, comparing against the
        // "For You" tab's now-obvious "Build my plan" button). Same real
        // destination, now with an actual button underneath so it reads as
        // a clear next step instead of a caption.
        <Link href="/plan/intake" className="flex items-center justify-between gap-2 mt-2 rounded-lg px-2.5 py-2 active:scale-[0.98] transition-transform" style={{ fontFamily: 'var(--font-poppins)', background: 'rgba(229,169,60,0.1)', border: '1px solid rgba(229,169,60,0.5)' }}>
          <div>
            <p className="text-white font-bold text-xs">Add your starting weight & goal</p>
            <p className="text-white/60 text-[11px] mt-0.5">90 seconds — then your real progress shows up here.</p>
          </div>
          <span className="shrink-0 bg-[#E5A93C] text-[#0A0A0F] text-[11px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap">Get started →</span>
        </Link>
      )}
      <button
        onClick={() => setCollapsed(true)}
        aria-label="Collapse"
        aria-expanded={true}
        className="absolute right-2 bottom-1.5 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{ width: 20, height: 20, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(229,169,60,0.5)' }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E5A93C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>
      </button>
    </div>
  )
}
