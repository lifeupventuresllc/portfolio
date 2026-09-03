// Testers should never see an incomplete feature and assume it's finished
// (Asa's ask, 2026-08-30, ahead of the workout/nutrition-engine test loop).
// Flip either back to true once the feature's actually ready — nothing else
// needs to change.
export const SHOW_COMMUNITY_TAB = true
// Flipped back on 2026-09-03 (Asa's beta-tester feedback, cross-checked):
// the quantity picker, zero-calorie guard, and workout/rest-day calorie
// chip this page needed were all already built and tested — the page was
// just still hidden behind this flag from the 2026-08-31 pass. This flag
// now ONLY gates /plan/nutrition + the Next Action circle's meal-kind
// expansion route (see the comment history above for what it used to gate).
export const SHOW_CALORIE_COUNTER = true
