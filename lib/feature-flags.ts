// Testers should never see an incomplete feature and assume it's finished
// (Asa's ask, 2026-08-30, ahead of the workout/nutrition-engine test loop).
// Flip either back to true once the feature's actually ready — nothing else
// needs to change.
export const SHOW_COMMUNITY_TAB = true
// Narrowed 2026-08-31 — Asa asked for the dashboard's own $ calorie readout
// back (GoalProgressBar.tsx no longer reads this flag at all) while
// /plan/nutrition itself stays hidden as still-incomplete. This flag now
// ONLY gates that page + the Next Action circle's meal-kind expansion route.
export const SHOW_CALORIE_COUNTER = false
