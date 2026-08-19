// Dashboard hero photo, on a rotation. Add more paths to this array (drop the
// files in public/images/brand/) and rotation picks them up automatically —
// no code change needed per photo. CYCLE_DAYS controls how long each photo
// stays up before advancing (2 = every other day; bump to 7+ for weekly).
export const DASHBOARD_PHOTOS: string[] = [
  '/images/brand/sculpt-session-hero.jpg',
]

export const CYCLE_DAYS = 2

// Same epoch-day-bucket rotation already used for the eating-out picks
// (app/plan/eating-out/page.tsx) — stable within a day, advances on a fixed
// cadence, cycles through every photo before repeating.
export function pickDashboardPhoto(): string {
  const epochDays = Math.floor(Date.now() / 86400000)
  const idx = Math.floor(epochDays / CYCLE_DAYS) % DASHBOARD_PHOTOS.length
  return DASHBOARD_PHOTOS[idx]
}
