import { createServiceClient } from '@/lib/supabase/server'
import { buildInitialPlans } from '@/lib/plan-builder'
import { assessLifePattern } from '@/lib/fos/pattern'
import { assessEarlyStruggle } from '@/lib/fos/early-struggle'

// ============================================================
// The re-pace engine (2026-09-22, Asa's direct ask): what a real trainer
// does that this app never did — when a client's real life genuinely can't
// sustain the current plan, a real trainer doesn't just soften ONE day
// (lib/workout-short.ts's dip card already does that) and doesn't wait
// weeks to notice either. They rebuild the WEEK to fit where the person
// actually is, right then, tell them about it in plain words, and keep the
// same goal with a longer runway — never silence, never "you failed."
//
// Two speeds, matching Asa's own trainer analogy:
//  - A brand-new account (first ~9 days) gets the FAST read
//    (assessEarlyStruggle) — she can't have 21 days of baseline yet, and
//    per the successful-app checklist, the first week is exactly when most
//    people who ever leave, leave. Fires on the FIRST real sign of trouble.
//  - An established account reuses the SLOWER, already-built pattern
//    engine (assessLifePattern) — its own 7-28 day windows already ARE the
//    "sustained, not a blip" check; only riskBand 'high' (a real cluster of
//    signals, not one) triggers a rebuild here.
//
// Deliberately NOT built: an auto re-acceleration back up when things are
// going great — a real ask, but a different, separate feature; this pass
// only closes the "plan doesn't bend when life gets hard" gap.
// ============================================================

export type ReplanReason = 'early_struggle' | 'sustained_dip'
export type ReplanResult = { replanned: boolean; reason: ReplanReason | null; detail: string | null }

// Never more than one real rebuild a week — the goal is a plan that bends
// with her, not one that lurches on every rough day. The daily dip card
// (lib/workout-short.ts) still covers the in-between days.
const REPLAN_COOLDOWN_DAYS = 7
const NEW_ACCOUNT_MAX_AGE_DAYS = 9
// Never below 2 real days/week — a "rebuild" that quietly asked less and
// less of her forever wouldn't be pacing her toward the goal any more, it'd
// be abandoning it. Floor matches the same minimum the intake form itself allows.
const MIN_DAYS_PER_WEEK = 2

function daysBetween(fromISO: string, toISO: string): number {
  return (new Date(toISO).getTime() - new Date(fromISO).getTime()) / 86400000
}

// Plain, coach-voiced, never a number-of-days-missed report — same
// "presence, not a report" rule messageForPattern (lib/fos/pattern.ts)
// already follows. Always names what's unchanged (the goal) before what
// changed (the pace), so it reads as support, never a downgrade.
function messageForReplan(reason: ReplanReason, fromDays: number, toDays: number): string {
  const paceLine = `I've eased your plan to ${toDays} day${toDays === 1 ? '' : 's'} a week instead of ${fromDays} — same goal, just paced to fit right now.`
  if (reason === 'early_struggle') {
    return `Hey — the start's been a lot, and that's real. ${paceLine} We'll build back up together whenever you're ready.`
  }
  return `The last while has been heavier than usual. ${paceLine} You're still making real progress — this just gives you more room to get there.`
}

export async function maybeReplan(enrollmentId: string, userId: string, todayISO: string): Promise<ReplanResult> {
  const svc = createServiceClient()

  const { data: intake } = await svc.from('challenge_intake').select('*').eq('enrollment_id', enrollmentId).maybeSingle()
  if (!intake) return { replanned: false, reason: null, detail: null } // no real intake yet — nothing to re-pace

  const formData = (intake.form_data as Record<string, unknown>) || {}
  const lastReplanAt = formData.last_replan_at as string | undefined
  if (lastReplanAt && daysBetween(lastReplanAt, todayISO) < REPLAN_COOLDOWN_DAYS) return { replanned: false, reason: null, detail: null }

  const { data: enrollment } = await svc.from('challenge_enrollments').select('created_at, name').eq('id', enrollmentId).maybeSingle()
  const createdAt = enrollment?.created_at as string | undefined
  if (!createdAt) return { replanned: false, reason: null, detail: null }
  const ageDays = daysBetween(createdAt.slice(0, 10), todayISO)

  let reason: ReplanReason | null = null
  let detail: string | null = null
  if (ageDays <= NEW_ACCOUNT_MAX_AGE_DAYS) {
    const early = await assessEarlyStruggle(enrollmentId, todayISO)
    if (early.struggling) { reason = 'early_struggle'; detail = early.reason }
  } else {
    const pattern = await assessLifePattern(enrollmentId, todayISO)
    if (pattern.riskBand === 'high') { reason = 'sustained_dip'; detail = pattern.signals.join(',') }
  }
  if (!reason) return { replanned: false, reason: null, detail: null }

  const currentDays = (intake.days_per_week as number) || 3
  const newDays = Math.max(MIN_DAYS_PER_WEEK, currentDays - 1)
  // Already at the floor — nothing left to soften. Don't rebuild an
  // identical plan or send a message that promises a change that isn't real.
  if (newDays >= currentDays) return { replanned: false, reason: null, detail: null }

  await buildInitialPlans({
    enrollmentId,
    userId: (intake.user_id as string) || userId,
    name: (enrollment?.name as string) || 'Your',
    age: intake.age as number,
    sex: intake.sex as 'female' | 'male' | 'other',
    height_in: intake.height_in as number,
    weight_lbs: intake.weight_lbs as number,
    goal: intake.goal as 'lose' | 'gain' | 'maintain' | 'recomp',
    target_lbs: intake.target_lbs as number,
    activity_level: intake.activity_level as 'none' | 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
    experience_level: intake.experience_level as 'beginner' | 'intermediate' | 'advanced',
    training_location: intake.training_location as 'home' | 'gym',
    days_per_week: newDays,
    workout_days_per_week: newDays,
    cook_days_per_week: (formData.cook_days_per_week as number) ?? 2,
    injuries: (formData.injuries as never[]) || [],
    postpartum: !!formData.postpartum,
    training_style: (formData.training_style as never) || 'none',
    focus_area: (formData.focus_area as never) || 'overall',
    autoFillMeals: true,
  })

  // buildInitialPlans rewrites form_data wholesale from these same inputs
  // (same reason app/api/plan/quickstart-workout/route.ts re-attaches its
  // own quickstart_built marker as a follow-up write, not inline) — so the
  // replan marker goes on right after, never lost to that rewrite.
  const { data: freshIntake } = await svc.from('challenge_intake').select('form_data').eq('enrollment_id', enrollmentId).maybeSingle()
  const mergedFormData = { ...((freshIntake?.form_data as Record<string, unknown>) || {}), last_replan_at: todayISO, last_replan_reason: reason, last_replan_detail: detail }
  await svc.from('challenge_intake').update({ form_data: mergedFormData }).eq('enrollment_id', enrollmentId)

  await svc.from('fos_messages').insert({
    enrollment_id: enrollmentId,
    user_id: (intake.user_id as string) || userId,
    role: 'operator',
    content: messageForReplan(reason, currentDays, newDays),
  })

  return { replanned: true, reason, detail }
}
