// Gamified challenges — badges + milestones, all DERIVED from a member's real
// activity (no new tables). Coach Asa's voice throughout: every badge is framed
// as him noticing her effort. Feeds /plan/achievements + the dashboard strip.

export type BadgeState = {
  streak: number // current consecutive-day streak
  daysShowedUp: number // total days she logged a daily check-in
  workoutsDone: number // total workouts finished
  checkins: number // weekly check-ins submitted
  photos: number // progress photos uploaded
  mealPlanBuilt: boolean // she built her week of meals
  daysEnrolled: number // days since she joined (challenge is 42 = 6 weeks)
}

export type Badge = {
  id: string
  icon: string
  title: string
  blurb: string // earned → celebration; locked → what unlocks it (Asa's voice)
  earned: boolean
  current: number // progress toward goal
  goal: number // threshold (1 for one-shot badges)
}

export const CHALLENGE_DAYS = 42 // 6-week Snatched Without Starving challenge

type Def = {
  id: string
  icon: string
  title: string
  goal: number
  value: (s: BadgeState) => number
  earnedBlurb: string
  lockedBlurb: string
}

// Ordered easiest → hardest within each track so "next up" surfaces sensibly.
const DEFS: Def[] = [
  { id: 'day-one', icon: '🌱', title: 'Day One', goal: 1, value: (s) => s.daysShowedUp,
    earnedBlurb: 'You started. That was the hardest rep — proud of you.',
    lockedBlurb: 'Log your first day and this one is yours.' },
  { id: 'plan-built', icon: '📋', title: 'Plan Locked In', goal: 1, value: (s) => (s.mealPlanBuilt ? 1 : 0),
    earnedBlurb: 'Your week of food is built. No more guessing — just eat.',
    lockedBlurb: 'Build your meals for the week to earn this.' },
  { id: 'first-workout', icon: '💪', title: 'First Sweat', goal: 1, value: (s) => s.workoutsDone,
    earnedBlurb: 'One workout down. You showed up and finished — that’s the whole game.',
    lockedBlurb: 'Finish your first guided workout to unlock this.' },
  { id: 'first-checkin', icon: '📈', title: 'First Check-In', goal: 1, value: (s) => s.checkins,
    earnedBlurb: 'You checked in with me. This is where the real results come from.',
    lockedBlurb: 'Send me your first weekly check-in to earn this.' },
  { id: 'first-photo', icon: '📸', title: 'Proof in Progress', goal: 1, value: (s) => s.photos,
    earnedBlurb: 'First progress photo saved. Future you is going to love this.',
    lockedBlurb: 'Upload your first progress photo to unlock this.' },
  { id: 'streak-3', icon: '🔥', title: '3-Day Streak', goal: 3, value: (s) => s.streak,
    earnedBlurb: 'Three days straight. Momentum is real now — keep it lit.',
    lockedBlurb: 'Show up 3 days in a row to light this up. (One off day won’t reset you — I’ve got a grace day built in.)' },
  { id: 'streak-7', icon: '🔥', title: 'One Week Strong', goal: 7, value: (s) => s.streak,
    earnedBlurb: 'A full week without missing. This is who you are now.',
    lockedBlurb: 'Keep your streak going to 7 days.' },
  { id: 'workouts-10', icon: '🏋️', title: '10 Workouts', goal: 10, value: (s) => s.workoutsDone,
    earnedBlurb: 'Ten sessions in the books. Your body is already answering.',
    lockedBlurb: 'Finish 10 workouts total to earn this.' },
  { id: 'checkins-3', icon: '🤝', title: 'In the Rhythm', goal: 3, value: (s) => s.checkins,
    earnedBlurb: 'Three check-ins. You and me, every week — that’s the difference.',
    lockedBlurb: 'Check in with me 3 weeks to earn this.' },
  { id: 'streak-14', icon: '⚡', title: 'Two Weeks Locked', goal: 14, value: (s) => s.streak,
    earnedBlurb: 'Fourteen days straight. Habits don’t break like yours anymore.',
    lockedBlurb: 'Hold your streak to 14 days.' },
  { id: 'streak-21', icon: '💎', title: '21-Day Reset', goal: 21, value: (s) => s.streak,
    earnedBlurb: 'Twenty-one days. That’s a new default. You reset your whole normal.',
    lockedBlurb: 'Reach a 21-day streak — the habit-forming mark.' },
  { id: 'workouts-25', icon: '🥇', title: '25 Workouts', goal: 25, value: (s) => s.workoutsDone,
    earnedBlurb: 'Twenty-five workouts. This isn’t a phase — it’s your lifestyle.',
    lockedBlurb: 'Finish 25 workouts total to earn this.' },
  { id: 'checkins-6', icon: '🏆', title: 'Full Six Weeks', goal: 6, value: (s) => s.checkins,
    earnedBlurb: 'Six check-ins — every single week. You finished what most quit.',
    lockedBlurb: 'Check in all 6 weeks to earn this.' },
  { id: 'finisher', icon: '🏁', title: 'Challenge Finisher', goal: CHALLENGE_DAYS, value: (s) => s.daysEnrolled,
    earnedBlurb: 'Six weeks done. You didn’t just try it — you finished it. Snatched.',
    lockedBlurb: 'Stay with the 6-week challenge to the finish line.' },
]

export function computeBadges(s: BadgeState): Badge[] {
  return DEFS.map((d) => {
    const value = d.value(s)
    const earned = value >= d.goal
    return {
      id: d.id, icon: d.icon, title: d.title, goal: d.goal,
      current: Math.min(value, d.goal),
      earned,
      blurb: earned ? d.earnedBlurb : d.lockedBlurb,
    }
  })
}

export function earnedCount(badges: Badge[]): number {
  return badges.filter((b) => b.earned).length
}

// The closest unearned badges (fewest steps left), for the "next up" nudge.
// Absolute remaining — not %, so a barely-started long badge (e.g. the 42-day
// finisher) never outranks an actionable one that's a single step away.
export function nextUp(badges: Badge[], n = 3): Badge[] {
  return badges
    .filter((b) => !b.earned)
    .sort((a, b) => (a.goal - a.current) - (b.goal - b.current))
    .slice(0, n)
}
