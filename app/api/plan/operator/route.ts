import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO, localHourNumber, localDayNumber, localMondayIndex, addDaysISO } from '@/lib/localdate'
import type { WeekPlan } from '@/lib/meal-plan'
import { recover, injurySafetyClause, type LifeSignal, type RecoveryPlan } from '@/lib/fos/recovery'
import { parseSignal, parseSignalAI, detectWorkoutStyle, detectLocation, detectFocusAreas, injuriesGenuinelyAddressed } from '@/lib/fos/parse'
import { detectEatenFood } from '@/lib/food-estimate'
import { getProfile, recentEvents, upsertProfile, mergeProfilePatch, getApprovedTodayAdjustment } from '@/lib/fos/context'
import { extractProfileFacts, generateReply, generateDeclineFollowUp, describeDecision, answerGeneralQuestion } from '@/lib/fos/memory'
import { assessGoalDrift } from '@/lib/fos/goal-drift'
import { detectPlanIntent } from '@/lib/fos/plan-intent'
import { buildInitialPlans } from '@/lib/plan-builder'
import { getUserState } from '@/lib/next-action'
import type { FosEventKind, WorkoutChange, NutritionChange } from '@/lib/fos/types'
import type { Injury } from '@/lib/workout-exercises'
import type { WorkoutProgram, FocusArea } from '@/lib/workout'

// Names the week's actual training days for the "built your whole plan" reply —
// without this, a week-scope build only ever said "your Nx/week program is
// ready" with zero real content, unlike the today-scope reply which names actual
// exercises. Found live-testing: she should see a taste of what she got, not a
// pure pointer to the dashboard.
function summarizeWeekProgram(program: WorkoutProgram): string {
  const titles = program.track === 'gym' && program.gymDays?.length
    ? program.gymDays.map((d) => d.title)
    : program.home?.days.length ? program.home.days.map((d) => d.title) : []
  return titles.length ? titles.join(', ') : `your ${program.daysPerWeek}x/week ${program.track} program`
}

// Same idea for meals — names a real day's actual meals instead of only stating
// the calorie number.
function summarizeWeekMeals(weekPlan: WeekPlan): string {
  const day = weekPlan.days.find((d) => !d.eatOut) || weekPlan.days[0]
  const names = (day?.meals ?? []).map((m) => m.name)
  return names.slice(0, 3).join(', ')
}

// Names today's actual exercises out of a freshly generated program, for Coach
// Asa's cold-start reply — she asked in chat, so she gets the real moves back in
// chat, not just a "check your dashboard" pointer. If she named a time budget,
// leads with only as many moves as roughly fit it (~6 min/exercise incl. rest);
// the full session is still saved either way.
function summarizeTodaysWorkout(program: WorkoutProgram, minutesAvailable?: number, dayIndex = 0, focusAreas?: FocusArea[]): string {
  const exercises: string[] = []
  const wantsCore = !!focusAreas?.includes('core')
  if (program.track === 'gym' && program.gymDays?.length) {
    const day = program.gymDays[dayIndex] || program.gymDays[0]
    // Real gap found live: ab/core work lives in its own `day.ab` field (not
    // `accessory`), so it never showed up in a gym-track chat summary at
    // all — a "focus on my core" request could correctly generate a bonus
    // ab set server-side (see coreFocus in generateGym) and still read as
    // "zero core exercises" in the reply she actually sees.
    const abNames: string[] = []
    if (day.ab) { abNames.push(day.ab.upper.name, day.ab.lower.name); if (day.ab.bonus) abNames.push(day.ab.bonus.name) }
    // Second real gap, found chasing the first one live: even after adding ab
    // names above, a time-capped request ("25 minutes") still showed zero core
    // work — the cap below just slices the first N names, and ab work was
    // always appended dead last, after every superset AND accessory. For a
    // 'core' focus specifically, that's exactly backwards: the one thing she
    // asked for was the least likely to survive the cap. Front-load it only
    // when core is among what she actually asked for; every other focus
    // already gets what it needs first via the day's own supersets.
    if (wantsCore) exercises.push(...abNames)
    for (const s of day.supersets) { exercises.push(s.push.name, s.pull.name) }
    for (const a of day.accessory) exercises.push(a.name)
    if (!wantsCore) exercises.push(...abNames)
  } else if (program.home?.days.length) {
    for (const e of (program.home.days[dayIndex] || program.home.days[0]).exercises) exercises.push(e.name)
  }
  if (!exercises.length) return 'your first session is ready'
  const cap = minutesAvailable ? Math.max(3, Math.min(exercises.length, Math.round(minutesAvailable / 6))) : exercises.length
  const picked = exercises.slice(0, cap)
  return picked.length < exercises.length
    ? `${picked.join(', ')} — the rest of today's full session is saved on your dashboard for next time`
    : picked.join(', ')
}

function joinAreas(areas: string[]): string {
  if (areas.length <= 1) return areas[0] || ''
  if (areas.length === 2) return `${areas[0]} and ${areas[1]}`
  return `${areas.slice(0, -1).join(', ')}, and ${areas[areas.length - 1]}`
}

// A short, always-accurate one-line description of what she just approved —
// built directly from the structured workout_change/nutrition_change fields,
// the same source the recommendation card's adjLines() (OperatorChat.tsx/
// CoachHero.tsx) already reads for its bullets. Used for the post-approval
// confirmation instead of mutating the original proposal's prose (real bug,
// 2026-08-31: that approach — stripping "Want me to lock that in?" off the
// end of the stored proposal message — only ever matched the deterministic
// fallback wording; Claude's personalized version of the same proposal
// rarely ends with that exact phrase, so the swap silently no-op'd and the
// "confirmation" ended up just echoing the entire original proposal message
// back verbatim, an even more confusing repeat than the generic line it
// replaced). This is deterministic and short by construction — no prose to
// parse, nothing that can drift out of sync with what Claude wrote.
function describeApprovedChange(workoutChange?: WorkoutChange | null, nutritionChange?: NutritionChange | null): string | null {
  const w = workoutChange, n = nutritionChange
  if (w?.injuryBodyPart) return `protecting your ${w.injuryBodyPart.replace('_', ' ')} from now on`
  if (w?.contentSwap === 'cardio') return 'cardio today'
  if (w?.trackOverride && w?.focusOverride?.length) return `a ${w.trackOverride === 'home' ? 'bodyweight home' : 'gym'} session focused on ${joinAreas(w.focusOverride)} today`
  if (w?.trackOverride) return `a ${w.trackOverride === 'home' ? 'bodyweight home' : 'gym'} session today${w.toMinutes ? `, ${w.toMinutes} min` : ''}`
  if (w?.focusOverride?.length) return `today focused on ${joinAreas(w.focusOverride)}`
  if (w?.toMinutes) return `a ${w.toMinutes}-min ${w.swapTo || 'session'} today`
  if (n?.dinnerSuggestion) return n.dinnerSuggestion
  if (n?.calorieDelta) return `${n.calorieDelta > 0 ? '+' : ''}${n.calorieDelta} calories today`
  if (n?.eatingOut) return "eating out today"
  return null
}

// The Fitness OS operator. She tells it about her day; it replies in Coach Asa's
// voice with a goal-protecting adjustment she can approve / modify / reject.
// Reading her message runs Claude first (parseSignalAI), falling back to the
// zero-dependency regex parser if the key's unconfigured or the call fails —
// the response copy itself (recover()) is untouched either way.

async function resolve() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, enrollment: null, svc: null }
  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id, name').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  return { user, enrollment, svc }
}

const eventKindFor = (s: LifeSignal): FosEventKind =>
  s.kind === 'missed' ? 'miss'
  : s.kind === 'eat_out' ? 'eat_out'
  : s.kind === 'schedule_change' ? 'schedule_change'
  : s.kind === 'exhausted' ? 'low_energy'
  : s.kind === 'poor_sleep' ? 'poor_sleep'
  : s.kind === 'craving' ? 'craving'
  : s.kind === 'stressed' ? 'stressed'
  : s.kind === 'injury' ? 'injury'
  : 'message'

export async function GET() {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ messages: [] })
  const { data } = await svc.from('fos_messages').select('role, content, created_at').eq('enrollment_id', enrollment.id).order('created_at', { ascending: true }).limit(60)
  return NextResponse.json({ messages: data || [] })
}

export async function POST(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }
  const today = localDateISO()
  const eid = enrollment.id as string

  // Action: she approved / modified / rejected a recommended adjustment.
  if (body.adjustmentId !== undefined && body.status) {
    const status = ['approved', 'modified', 'rejected'].includes(body.status) ? body.status : 'approved'
    let injuryPersisted: Injury | null = null
    let changeSummary: string | null = null
    if (body.adjustmentId) {
      const { data: updated } = await svc.from('fos_adjustments').update({ status }).eq('id', body.adjustmentId).eq('enrollment_id', eid).select('workout_change, nutrition_change').maybeSingle()
      changeSummary = describeApprovedChange(updated?.workout_change as WorkoutChange | null, updated?.nutrition_change as NutritionChange | null)
      // An approved injury signal doesn't just adjust today — it teaches the app
      // permanently, so she never has to mention the same injury again. Written to
      // her real intake record, the same field the workout engine already reads.
      const injuryBodyPart = status === 'approved' ? (updated?.workout_change as WorkoutChange | null)?.injuryBodyPart : undefined
      if (injuryBodyPart) {
        const { data: intake } = await svc.from('challenge_intake').select('form_data').eq('enrollment_id', eid).maybeSingle()
        if (intake) {
          const fd = (intake.form_data || {}) as Record<string, unknown>
          const existing = Array.isArray(fd.injuries) ? (fd.injuries as Injury[]) : []
          if (!existing.includes(injuryBodyPart)) {
            await svc.from('challenge_intake').update({ form_data: { ...fd, injuries: [...existing, injuryBodyPart] } }).eq('enrollment_id', eid)
          }
          injuryPersisted = injuryBodyPart
        }
      }
    }
    await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'adjustment', summary: `Adjustment ${status}`, payload: { adjustmentId: body.adjustmentId, status } })
    const withName = (lower: string) => enrollment.name ? `${enrollment.name}, ${lower}` : `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
    let reply: string
    if (status === 'approved') {
      // Real gap Asa caught live, 2026-08-31: the approved reply used to be a
      // generic "locked in, go be great" regardless of WHAT was actually
      // approved. Now states the real, current, already-persisted result —
      // freshState re-reads it via getUserState the normal way (same source
      // the dashboard circle itself reads), not a re-derived guess — so
      // "here's your updated workout" always names what she'll actually see,
      // never stale or approximate.
      const freshState = await getUserState(eid, today)
      const updatedLine = freshState.workoutCandidate?.title
        ? `Here's your updated workout: ${freshState.workoutCandidate.title} today.`
        : changeSummary ? `Here's your update: ${changeSummary}.` : 'Locked in.'
      reply = withName(injuryPersisted
        ? `${updatedLine.charAt(0).toLowerCase()}${updatedLine.slice(1)} I've noted it so every future workout stays safe for it automatically. You won't need to bring it up again.`
        : `${updatedLine.charAt(0).toLowerCase()}${updatedLine.slice(1)} I've got the rest — go be great.`)
    } else if (status === 'rejected') {
      // Real gap, Asa's direct ask 2026-08-31: declining used to be a dead
      // end ("no problem, we'll keep today as planned") — never actually
      // tried to find something that WOULD work. Now asks one real,
      // goal-grounded follow-up instead, via a purpose-built prompt (see
      // generateDeclineFollowUp — deliberately NOT generateReply, whose
      // system prompt assumes DECISION describes something already decided,
      // not a decline).
      const [profile, events, { data: intakeGoal }] = await Promise.all([
        getProfile(eid),
        recentEvents(eid, addDaysISO(today, -60)),
        svc.from('challenge_intake').select('goal').eq('enrollment_id', eid).maybeSingle(),
      ])
      const goal = (intakeGoal?.goal === 'gain' || intakeGoal?.goal === 'maintain' ? intakeGoal.goal : 'lose') as string
      const followUp = await generateDeclineFollowUp({ declined: changeSummary || 'the proposed change', goal, profile, events, name: (enrollment.name as string) || null })
      reply = followUp || withName("no problem — what would actually work better for you today?")
    } else {
      reply = withName("got it — tell me what you'd rather do and I'll rework it around your goal.")
    }
    await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply })
    return NextResponse.json({ reply })
  }

  // Message flow: parse → recover → recommend an adjustment.
  const message = (body.message || '').toString().trim().slice(0, 800)
  if (!message) return NextResponse.json({ error: 'Say something first.' }, { status: 400 })
  await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'user', content: message })

  // Cold-start plan build: she has no plan on file yet (never did the structured
  // intake) and is asking Coach Asa for one right here. Only runs at all before her
  // first real intake — once challenge_intake exists, this is skipped forever and
  // the normal adjustment-flow below behaves exactly as it always has.
  // Widened to form_data (not just id) so the injury-safety clause below can
  // reuse this same fetch for post-intake users instead of a second round trip.
  const { data: existingIntakeForPlan } = await svc.from('challenge_intake').select('id, experience_level, goal, sex, days_per_week, training_location, form_data').eq('enrollment_id', eid).maybeSingle()
  const recordedInjuries: Injury[] = Array.isArray((existingIntakeForPlan?.form_data as Record<string, unknown> | null)?.injuries)
    ? ((existingIntakeForPlan!.form_data as { injuries: Injury[] }).injuries) : []
  // True only if she was genuinely asked (the structured intake form's required
  // step, or a prior chat cold-start build's injury question) — NOT true just
  // because a challenge_intake row exists. The Quickstart fast lane creates one
  // with injuries defaulted to [] and never actually asks. See lib/plan-builder.ts.
  const injuriesAddressed = !!(existingIntakeForPlan?.form_data as Record<string, unknown> | null)?.injuries_addressed
  if (!existingIntakeForPlan) {
    const { data: history } = await svc
      .from('fos_messages').select('role, content').eq('enrollment_id', eid)
      .order('created_at', { ascending: true }).limit(30)

    // She's answering a build-offer Coach Asa made a moment ago ("want me to build
    // your personalized workout/meal plan?"). Now that she's opted in and receptive,
    // send her into the real structured intake for accurate numbers, rather than
    // the defaulted cold-start build below — that's the right tool for an explicit
    // in-chat "give me a workout" ask, not for someone who just said yes to a form.
    const lastOperatorMsg = [...(history || [])].reverse().find((h) => h.role === 'operator')
    const justOffered = !!lastOperatorMsg && /personalized (workout|meal) plan/i.test(String(lastOperatorMsg.content))
    const isAffirmative = /^(yes|yeah|yep|yup|sure|ok(ay)?|please|do it|let'?s do it|go for it|sounds good|i'?d love that)\b/i.test(message.trim())
    if (justOffered && isAffirmative) {
      const namePrefix = enrollment.name ? `${enrollment.name}, ` : ''
      const reply = `${namePrefix}let's do it — head to your plan page and tap "Build my plan." Takes about a minute, and I'll have your real numbers locked in from there.`
      await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply })
      return NextResponse.json({ reply, offerIntake: true })
    }

    const conversationText = (history || []).map((h) => `${h.role}: ${h.content}`).join('\n')
    const intent = await detectPlanIntent(conversationText)
    // Real gap found live: the AI classifier was told named areas beat a
    // generic "full body" mention, but didn't reliably follow that
    // instruction, and separately could still miss a real area entirely.
    // Prompt instructions alone aren't reliable enough for something this
    // important, so back it with a deterministic check: any real area found
    // by the plain keyword scan that the AI didn't already capture gets
    // added in — this only ever adds areas she genuinely named, never
    // removes ones the AI already found.
    if (intent && intent.wantsWorkout && !intent.focusOverall) {
      const ruleFocuses = detectFocusAreas(message)
      const existing = new Set(intent.focus_areas || [])
      const merged = [...(intent.focus_areas || [])]
      for (const a of ruleFocuses) if (!existing.has(a)) merged.push(a)
      if (merged.length) intent.focus_areas = merged
    }
    // Real, reproducible bug found via a live stress test: the AI classifier
    // can self-report injuries_addressed: true even when injuries were NEVER
    // mentioned anywhere in the conversation — a plain "build me a workout"
    // sailed straight through level/location/focus quick-replies to a built
    // plan with the injury question never asked at all. This is the one
    // question where a wrong guess can actually hurt her, so it never gets
    // to rest on the model's own say-so — only a real, grounded check of the
    // stored conversation can mark it addressed.
    if (intent) intent.injuriesAddressed = injuriesGenuinelyAddressed(history || [])

    if (intent) {
      // The always-ask essentials: injuries (a wrong guess can actually hurt her),
      // training location (a wrong guess builds the wrong equipment pool entirely —
      // barbell squats for someone with zero equipment at home), and target area (a
      // wrong guess just misses what she wanted). Only asked when she's asking for a
      // workout AND genuinely hasn't addressed it anywhere in the conversation yet —
      // never re-asked once answered, and never asked at all for a returning user
      // whose intake already has it on file (see existingIntakeForPlan elsewhere in
      // this route). Everything else (weight, goal, days/week) gets a silent,
      // disclosed default instead of another question.
      const needsInjuryAsk = intent.wantsWorkout && !intent.injuriesAddressed
      // Real gap found live: this used to silently default to 'gym' the moment she
      // asked for a workout without naming a location — the exact "it never asks if
      // I'm home or at the gym" complaint. Equipment availability isn't a cosmetic
      // detail like weight/goal; it determines which entire exercise pool gets used,
      // so it gets a real question same as injuries, not a guess.
      const needsLocationAsk = intent.wantsWorkout && !intent.training_location
      const needsFocusAsk = intent.wantsWorkout && !intent.focus_areas?.length && !intent.focusOverall
      // A wrong guess here isn't unsafe like injuries, but it silently determines
      // rep/set schemes and day structure (see lib/workout.ts's level-aware split
      // and repScheme) — worth one real question instead of a silent 'beginner'
      // default with no disclosure, unlike weight/goal which stay silent defaults.
      const needsLevelAsk = intent.wantsWorkout && !intent.experience_level
      if (needsInjuryAsk || needsLocationAsk || needsFocusAsk || needsLevelAsk) {
        // Real gap found live: a brand-new cold-start chat almost always has
        // several of these unknown at once (the common case, not the rare
        // one), which used to combine into one multi-part sentence with no
        // tappable buttons at all — exactly the case she hit. Ask ONE thing
        // at a time instead, each always paired with real buttons, so
        // tapping through a few quick questions replaces typing a combined
        // answer. A few extra round trips in the worst case, never a dead end.
        const q = needsLevelAsk ? "Quick one — what experience level you're at?"
          : needsLocationAsk ? 'Quick one — training at home or the gym today?'
          : needsFocusAsk ? 'Quick one — a specific area you want to focus on, or just overall?'
          : 'Quick one — any injuries or areas I should work around today?'
        const quickReplies = needsLevelAsk ? ['New to this', 'Some experience', 'Advanced']
          : needsLocationAsk ? ['Home', 'Gym']
          : needsFocusAsk ? ['Core', 'Legs', 'Arms', 'Overall']
          : ['No injuries']
        await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: q })
        return NextResponse.json({ reply: q, quickReplies })
      }

      // Defaults are only disclosed when they're actually relevant to what she asked
      // for — mentioning a "weight estimate" alongside a pure workout reply that
      // never states a calorie number would just be confusing noise.
      const usedDefaults: string[] = []
      const weight_lbs = intent.weight_lbs ?? (intent.wantsNutrition && usedDefaults.push('weight'), 165)
      const goal = intent.goal ?? (intent.wantsNutrition && usedDefaults.push('goal'), 'lose')
      const age = intent.age ?? 30
      const sex = intent.sex ?? 'female'
      const height_in = intent.height_in ?? 64
      const days_per_week = intent.days_per_week ?? 3
      // Gated above by needsLocationAsk same as injuries/level/focus — by the time
      // we reach here she's either just answered it or the conversation already
      // covered it, so this is a genuine value now, not a silent guess. The ??
      // 'gym' is just a type-safety fallback, not expected to actually fire.
      const training_location = intent.training_location ?? 'gym'
      // Gated above by needsLevelAsk same as injuries/location/focus — by the time
      // we reach here she's either just answered it or the conversation already
      // covered it, so this is a genuine value, not a silent guess. The ?? 'beginner'
      // is just a type-safety fallback, not expected to actually fire in practice.
      const experience_level = intent.experience_level ?? 'beginner'
      // Real fix, root cause: focus_area used to be a single value, so "arms,
      // legs, and core" could only ever keep one of the three. focus_areas is
      // the full list of everything she actually named — override_areas below
      // builds a real day from ALL of them (see daySpecFromAreas in
      // lib/workout.ts), not just the first. focus_area (singular) stays only
      // as the permanent-preference fallback when she named nothing specific.
      // Real gap found live: this used to pass undefined for an explicit
      // "overall" answer, which meant day 0 fell through to whatever the
      // normal weekly rotation's first day happened to be (a female plan's
      // rotation opens on a leg day) — an "overall" ask could still come
      // back looking leg-specific. Always a real array now: empty means
      // exactly "overall," which daySpecFromAreas/generateHome now both
      // build as a genuine full-body day, not a rotation coincidence.
      const focus_areas = intent.focus_areas?.length ? intent.focus_areas : []
      const focus_area = focus_areas[0] || 'overall'

      const { targets, program, weekPlan } = await buildInitialPlans({
        enrollmentId: eid, userId: user.id, name: enrollment.name || 'Your',
        age, sex, height_in, weight_lbs, goal, target_lbs: 10,
        activity_level: 'moderate', experience_level, training_location,
        days_per_week, workout_days_per_week: days_per_week, cook_days_per_week: 2,
        injuries: intent.injuries, postpartum: false, training_style: 'none', focus_area,
        override_areas: focus_areas,
        autoFillMeals: true,
        // Gated above by needsInjuryAsk — by the time we reach here she's either
        // just answered the explicit question or the conversation already covered
        // it (intent.injuriesAddressed), so this is a genuine ask, not a default.
        injuriesAddressed: true,
      })

      const namePrefix = enrollment.name ? `${enrollment.name}, ` : ''
      const mealSample = weekPlan ? summarizeWeekMeals(weekPlan) : ''
      // Day 0 is already the correct day by construction now — when
      // override_areas was passed above, generateGym/generateHome build day 0
      // directly from those exact areas (see lib/workout.ts), so there's
      // nothing left to search for the way pickFocusDayIndex used to.
      const dayIndex = 0
      let reply: string
      if (intent.scope === 'today' && intent.wantsWorkout) {
        reply = `${namePrefix}here's what to do: ${summarizeTodaysWorkout(program, intent.minutesAvailable, dayIndex, focus_areas)}.`
        if (intent.wantsNutrition) reply += ` Calorie target's ${targets.calories}/day (${targets.protein_g}g protein)${mealSample ? ` — try ${mealSample}` : ''}. Full week's on your dashboard.`
      } else if (intent.wantsNutrition && !intent.wantsWorkout) {
        reply = `${namePrefix}built your week — target's ${targets.calories} cal/day (${targets.protein_g}g protein)${mealSample ? `. First up: ${mealSample}` : ''}. Full week's on your dashboard.`
      } else {
        reply = `${namePrefix}built it — ${summarizeWeekProgram(program)}${intent.wantsNutrition ? `, target's ${targets.calories} cal/day (${targets.protein_g}g protein)` : ''}. Full breakdown's on your dashboard.`
      }
      // Injury-safe confirmation — she may have just told us about an injury
      // via the ask above (needsInjuryAsk), and buildInitialPlans already
      // filtered every exercise against it (lib/workout.ts's isContraindicated
      // call sites) — this just says so in the reply, every time a workout is
      // part of what got built, not only the first time she mentions it.
      if (intent.wantsWorkout) reply += injurySafetyClause(intent.injuries || [])
      if (usedDefaults.length) {
        const label = usedDefaults.join(' and ')
        reply += ` I used a starting ${label} estimate since you hadn't told me yet — give me your real ${label} anytime and I'll dial it in.`
      }
      await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply })
      // Lets the client route her straight to the specific thing built — the
      // workout page, the nutrition/today page, or the dashboard when both —
      // instead of always dropping her on the generic dashboard regardless of
      // what she actually asked for.
      return NextResponse.json({ reply, planBuilt: true, builtWorkout: !!intent.wantsWorkout, builtNutrition: !!intent.wantsNutrition })
    }
  }

  // Root cause found live: parseSignalAI used to only ever see her single
  // latest message, so anything she'd said a message or two earlier (a
  // stated location/equipment situation, a focus area) vanished the instant
  // she sent anything else — approving a change, a follow-up question, even
  // just "yes." Pulling a real recent window and formatting it the same way
  // the cold-start classifier already does (which never had this problem)
  // gives it actual conversational memory instead of message-by-message amnesia.
  const { data: recentHistory } = await svc
    .from('fos_messages').select('role, content').eq('enrollment_id', eid)
    .order('created_at', { ascending: false }).limit(10)
  const conversationText = [...(recentHistory || [])].reverse().map((h) => `${h.role}: ${h.content}`).join('\n')
  const aiResult = await parseSignalAI(conversationText)
  const signal = aiResult.ok ? aiResult.signal : parseSignal(message)
  const signalSource: 'ai' | 'rule' = aiResult.ok ? 'ai' : 'rule'
  const workoutStyle = aiResult.ok ? aiResult.workoutStyle : detectWorkoutStyle(message)
  const location = aiResult.ok ? aiResult.location : detectLocation(message)
  // Real gap found live: "build me an arm workout" (no location, no other
  // signal) matched NOTHING above, so it fell all the way through to
  // answerGeneralQuestion() further down — which treated a build REQUEST as a
  // QUESTION and had Claude freely invent a plausible-sounding workout in
  // prose (real example: push-ups/pike push-ups/tricep dips it made up on the
  // spot), with no real adjustment card, nothing sourced from the actual
  // exercise engine, and no way to approve it into her real plan. Detecting
  // focus_area here routes it into the real plan/workoutChange path below instead.
  // Same AI-instruction-following gap as the cold-start path above: back the
  // model's read with a deterministic keyword check rather than trusting a
  // prompt instruction alone to survive a compound phrasing like "full body
  // and also my core."
  // The current message's own explicit areas win outright over anything the
  // AI carried forward from earlier in the conversation — a genuine bug found
  // live via the exact case this comment describes: she asked for "arms, legs,
  // and core" in one turn, then a later turn asked for "back" specifically,
  // and got a workout for all four areas merged together, because this used to
  // ALWAYS union the AI's conversation-aware read with the current message's
  // keyword scan, regardless of recency. parseSignalAI's own carry-forward
  // (see its system prompt) exists for a message that doesn't restate her
  // focus at all ("yes", a follow-up question) — once she names something
  // concrete in THIS message, that's a real, deliberate replacement, not an
  // addition, so it's trusted alone. Only fall back to the AI's (possibly
  // carried-forward) read when this message names nothing on its own.
  const currentMessageAreas = detectFocusAreas(message)
  const focusAreas = currentMessageAreas.length
    ? currentMessageAreas
    : (aiResult.ok ? aiResult.focusAreas || [] : [])

  // Nothing situational matched — check whether she's actually just telling us
  // what she ate ("I had a slice of pizza"). Real Claude detection (see
  // lib/food-estimate.ts), not a keyword guess — degrades to nothing (falls
  // through to the generic reply below) when ANTHROPIC_API_KEY isn't set yet.
  // Logs immediately, no approve/reject step: same as tapping a food-search
  // result, and a mislogged item is a one-tap delete in the food log.
  if (!signal) {
    const foods = await detectEatenFood(message)
    if (foods.length > 0) {
      const hour = localHourNumber()
      const meal = hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 21 ? 'dinner' : 'snack'
      for (const f of foods) {
        await svc.from('challenge_food_log').insert({
          enrollment_id: eid, user_id: user.id, logged_on: today, meal, name: f.name,
          brand: f.brand, servings: f.servings, serving_label: f.serving_label,
          calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g, fats_g: f.fats_g,
          source: 'estimated',
        })
      }
      const summary = foods.map((f) => `${f.name} (~${f.calories} cal)`).join(', ')
      const reply = `Logged it: ${summary}. Estimated, not exact — but it's counted toward today already.`
      await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'message', summary: message, payload: { loggedFood: true, foods } })
      // Same travel-goes-missing gap as the main insert further down (see its comment)
      // — this early return has its own fos_events insert, so it needs its own copy of
      // the fix: "traveling, grabbed an airport sandwich" has no other signal, so it
      // hits this branch and used to drop the travel context entirely.
      if (location === 'traveling') {
        await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'travel', summary: message, payload: { location } })
      }
      await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply })
      return NextResponse.json({ reply, loggedFood: true })
    }
  }

  // Real gap, Asa's direct ask 2026-08-31: "the system never checks if
  // they're at home or gym — if the user doesn't say, the chat should
  // never assume." Every trackOverride fallback in this app
  // (`intake.training_location === 'home' ? 'home' : 'gym'`, in state.ts
  // and workout/page.tsx) silently treats a stored 'both' the same as a
  // plain 'gym' — so a real "trains at both" user who just says "give me
  // an ab workout" without naming where she is gets gym silently assumed,
  // wrong exactly as often as it's right. Only asks when it's genuinely
  // ambiguous (stored preference really is 'both') AND she hasn't already
  // told us today (an approved trackOverride already on file for today
  // answers it without asking twice) AND this message is actually about
  // to produce a track-determining workout swap — a plain cardio ask or an
  // explicit focus-area ask are the two paths that regenerate the whole
  // program by track; other signal kinds (energy, time, injury, etc.) via
  // recover() don't need a track decided to answer.
  //
  // Real bug found live, same day: this originally checked `!location`
  // (the blended `aiResult.location`), which is NOT scoped to this one
  // message — parseSignalAI deliberately carries location forward from
  // earlier in the conversation (same mechanism as its focus-area carry-
  // forward, by design, for messages like "yes" that restate nothing on
  // their own). Once she'd said "at the gym" even once, EVERY later
  // message silently inherited it as `location`, so the ask never fired
  // again for the rest of the conversation — exactly the kind of stale
  // assumption she asked never to happen. `detectLocation(message)` here
  // is the deterministic, THIS-MESSAGE-ONLY check — no carry-forward — so
  // only an explicit statement in the current message counts as "she said."
  const statedThisMessage = detectLocation(message)
  const wouldNeedTrack = focusAreas.length > 0 || workoutStyle === 'cardio'
  if (wouldNeedTrack && !statedThisMessage && existingIntakeForPlan?.training_location === 'both') {
    const todayTrack = await getApprovedTodayAdjustment(eid, today)
    if (!todayTrack?.workoutChange?.trackOverride) {
      const q = 'Quick one — training at home or the gym today?'
      await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: q })
      return NextResponse.json({ reply: q, quickReplies: ['Home', 'Gym'] })
    }
  }

  // She asked for a workout-style swap (e.g. "can I get cardio today?") with no
  // other situational content — recover() needs a real LifeSignal to switch on,
  // but "just wants cardio" isn't one of its 9 kinds, so signal comes back null
  // even though workoutStyle is set. Without this, the request silently vanished
  // into the generic fallback reply below — a real gap, not an edge case, given
  // this is exactly how someone would naturally ask.
  let plan: RecoveryPlan | null = signal ? recover(signal, 45, workoutStyle, localDayNumber())
    : workoutStyle === 'cardio' ? {
        message: "Cardio it is — let's get your heart rate up today. Want me to lock that in?",
        workoutChange: { contentSwap: 'cardio', swapTo: 'cardio & conditioning session', reason: 'requested cardio' },
      }
    : null

  // A one-off "focus on X today" request — merges onto whatever plan already
  // exists (e.g. "exhausted, but just arms today"), or creates one on its own
  // (bare "build me an arm workout") so it gets a real adjustment card and
  // real engine-sourced content instead of falling through to the generic
  // Q&A path below.
  if (focusAreas.length) {
    const label = focusAreas.length === 1 ? focusAreas[0]
      : focusAreas.length === 2 ? `${focusAreas[0]} and ${focusAreas[1]}`
      : `${focusAreas.slice(0, -1).join(', ')}, and ${focusAreas[focusAreas.length - 1]}`
    plan = plan
      ? { ...plan, workoutChange: { ...(plan.workoutChange || {}), focusOverride: focusAreas } }
      : { message: `Got it — ${label} today. Want me to lock that in?`, workoutChange: { focusOverride: focusAreas, reason: `requested ${label} focus` } }
  }

  // She told us where she's training today — never ask when she's already said it.
  // 'traveling' maps to the home/bodyweight track since that's the equipment-free
  // one; it has no dedicated track of its own (see app/plan/workout/page.tsx's
  // trackOverride, which only understands 'home' | 'gym'). If nothing else matched
  // above, her just naming her location is still enough on its own to act on.
  // Held separately from plan.message and appended to `reply` further down, after
  // generateReply() has had its chance to run — NOT baked into plan.message here.
  // Real gap found on review: describeDecision() (what generateReply()'s DECISION
  // context is built from) only ever reads plan.workoutChange/nutritionChange, never
  // plan.message. Whenever Claude successfully personalizes the reply, `reply =
  // generated` throws plan.message away completely — so text appended to it here
  // (like this travel line used to be) silently never reached her the moment the AI
  // path was actually working, which is the common case, not the fallback. Confirmed
  // via describeDecision() output on 2026-08-19: it never mentions "travel" for this
  // merge case even though the fallback plan.message did.
  let travelMergeAck = ''
  if (location) {
    const trackOverride: 'home' | 'gym' = location === 'gym' ? 'gym' : 'home'
    if (plan) {
      // Real gap, found live-testing: when she names a situation AND a
      // location in the same message ("only have 20 min, I'm traveling"),
      // this branch already correctly merged trackOverride into
      // workoutChange — the swap itself was always real — but silently
      // dropped location from the REPLY TEXT, since recover()'s message for
      // the other signal was already set and this only ever touched
      // workoutChange. She'd get a bodyweight session with zero acknowledgment
      // she'd said she was traveling. Every detected context element gets
      // named in the reply, not just the loudest one.
      plan = { ...plan, workoutChange: { ...(plan.workoutChange || {}), trackOverride } }
      if (location === 'traveling') travelMergeAck = " Hope the trip's going well, by the way."
    } else {
      plan = {
        message: (location === 'traveling'
          ? "Hope the trip's going well — no equipment where you are, so I'll keep today's session bodyweight-only."
          : `Got it — switching today to your ${trackOverride} session.`) + ' Want me to lock that in?',
        workoutChange: { trackOverride, reason: location === 'traveling' ? 'traveling — no equipment' : `training at ${location}` },
      }
    }
  }

  // First chat-triggered workout swap for someone whose injuries were never
  // actually asked (see injuriesAddressed above — the Quickstart fast lane is
  // the common case: it creates a real intake row with injuries defaulted to
  // [] and never asks). Asked once, folded right into this same reply instead
  // of a separate round trip, then marked addressed immediately so it's never
  // repeated. Skipped when this message itself IS an injury report — the
  // recover() 'injury' case already has its own complete sentence for that.
  let injuryAsk = ''
  if (plan?.workoutChange && !injuriesAddressed && signal?.kind !== 'injury') {
    injuryAsk = " Also — I don't have any injuries on file for you yet. Anything I should always work around, or are you all clear?"
    if (existingIntakeForPlan) {
      const fd = (existingIntakeForPlan.form_data || {}) as Record<string, unknown>
      await svc.from('challenge_intake').update({ form_data: { ...fd, injuries_addressed: true } }).eq('id', existingIntakeForPlan.id)
    }
  }

  // eat_out was replying with a platitude ("balance the rest of the day") and
  // never actually looked at her real numbers or logged anything, even when
  // she named a specific order — "I was eating out at Chipotle" got a generic
  // reply instead of a real logged estimate + her actual remaining calories.
  // Runs detectEatenFood() here too (not just the bare-food-mention path
  // above, which only fires when signal is null and eat_out isn't) so a named
  // order gets logged for real, then always states her real remaining
  // calories either way — never a made-up "you're fine" without the number.
  let eatOutContext = ''
  if (signal?.kind === 'eat_out') {
    const foods = await detectEatenFood(message)
    let loggedSummary = ''
    if (foods.length > 0) {
      const hour = localHourNumber()
      const meal = hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 21 ? 'dinner' : 'snack'
      for (const f of foods) {
        await svc.from('challenge_food_log').insert({
          enrollment_id: eid, user_id: user.id, logged_on: today, meal, name: f.name,
          brand: f.brand, servings: f.servings, serving_label: f.serving_label,
          calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g, fats_g: f.fats_g,
          source: 'estimated',
        })
      }
      loggedSummary = foods.map((f) => `${f.name} (~${f.calories} cal)`).join(', ')
    }
    const [{ data: nutritionPlan }, { data: foodRows }] = await Promise.all([
      svc.from('challenge_nutrition_plans').select('calories, meals').eq('enrollment_id', eid).eq('week_number', 1).maybeSingle(),
      svc.from('challenge_food_log').select('calories').eq('enrollment_id', eid).eq('logged_on', today),
    ])
    const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals) ? (nutritionPlan.meals as WeekPlan) : null
    const mealIdx = localMondayIndex()
    const todayTarget = (weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx]?.target : null) || Number(nutritionPlan?.calories) || 0
    const loggedToday = (foodRows || []).reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
    const remainingCal = Math.max(0, todayTarget - loggedToday)
    eatOutContext = loggedSummary
      ? ` She just logged ${loggedSummary} from eating out. Real number: she has ${remainingCal} calories left for the rest of today — state this exact number.`
      : todayTarget
        ? ` She hasn't said exactly what she ordered yet. Real number: she has ${remainingCal} calories left for the rest of today — state this exact number, and ask what she's getting or point her to logging it.`
        : ''
  }

  let reply = plan ? plan.message
    : "I hear you. Tell me what today looks like — how much time you've got, your energy, or what changed — and I'll adjust your plan around it while protecting your goal."

  // Personalize the wording (never the workoutChange/nutritionChange decision itself —
  // that stays fully deterministic from recover() above) using accumulated memory, and
  // pull out any durable new facts from this message. Both degrade to nothing on any
  // failure — reply stays plan.message, profile stays untouched. See lib/fos/memory.ts.
  if (plan) {
    const profile = await getProfile(eid)
    const [events, goalDrift] = await Promise.all([
      recentEvents(eid, addDaysISO(today, -60)),
      assessGoalDrift(eid, today),
    ])
    const [generated, extracted] = await Promise.all([
      generateReply({ herMessage: message, decision: describeDecision(signal, plan) + eatOutContext, profile, events, goalContext: goalDrift?.note ?? null, name: (enrollment.name as string) || null }),
      extractProfileFacts(message, profile),
    ])
    if (generated) reply = generated
    // Claude unavailable/failed — reply falls back to recovery.ts's fixed
    // sentence, which never includes her name at all. She should still be
    // addressed by name every reply, so prefix it here rather than send a
    // name-less fallback.
    else if (enrollment.name) reply = `${enrollment.name}, ${reply.charAt(0).toLowerCase()}${reply.slice(1)}`
    if (extracted) {
      const patch = mergeProfilePatch(profile, extracted)
      if (Object.keys(patch).length > 0) await upsertProfile(eid, user.id, patch)
    }
  } else {
    // Nothing situational, food-related, or plan-building matched — she most
    // likely just asked a real question ("how many days a week should I train?",
    // "is it bad to eat carbs at night?"). Answer it directly instead of
    // defaulting straight to the generic "tell me what today looks like" line,
    // which used to fire on every genuine question with zero attempt to actually
    // answer it — found via live testing, a real hole in the primary feature.
    const profile = await getProfile(eid)
    const events = await recentEvents(eid, addDaysISO(today, -60))
    const [answered, extracted] = await Promise.all([
      answerGeneralQuestion({ herMessage: message, profile, events, name: (enrollment.name as string) || null }),
      extractProfileFacts(message, profile),
    ])
    if (answered) reply = answered
    else if (enrollment.name) reply = `${enrollment.name}, ${reply.charAt(0).toLowerCase()}${reply.slice(1)}`
    if (extracted) {
      const patch = mergeProfilePatch(profile, extracted)
      if (Object.keys(patch).length > 0) await upsertProfile(eid, user.id, patch)
    }
  }

  // Deterministic, applied AFTER generateReply() above has already had its shot —
  // not folded into plan.message beforehand. Required to be true every single
  // time regardless of whether Claude personalized the reply or the rule-based
  // fallback fired, and describeDecision() (Claude's only window into what
  // happened) never carries it: it reads plan.workoutChange/nutritionChange
  // only, so text baked only into plan.message before the generateReply() call
  // above was silently discarded the moment Claude succeeded. Appending here —
  // after reply is already whatever it's going to be — guarantees it survives
  // regardless of which path produced `reply`.
  //
  // Real simplification, 2026-08-31 (Asa's direct ask: chat replies were
  // "confusing," should be "simple explanation"): this used to also append a
  // full "Today: <every exercise in the day, comma-separated>" recitation
  // here (built from a throwaway `previewProgram`, see git history) — for a
  // home-track swap that list wasn't even scoped to what she asked for (the
  // underlying day object mixes leg/upper/core regardless of focus — a
  // separate, deeper gap, see [[luf-coach-asa-workout-matching-deep-dive]]),
  // so an "arm workout" reply could recite squats and glute bridges right
  // alongside the real arm moves. Removed outright rather than filtered: the
  // plain-language reply above already names the change on its own ("Got it —
  // core workout at home today..."), and the structured recommendation card
  // rendered right below it (OperatorChat.tsx/CoachHero.tsx's `adjLines()`)
  // already gives the accurate, focus-correct one-line summary — reciting the
  // full exercise list a third time, unfiltered, only added noise.
  if (travelMergeAck) reply += travelMergeAck
  if (injuryAsk) reply += injuryAsk
  if (plan?.workoutChange && signal?.kind !== 'injury') {
    const clause = injurySafetyClause(recordedInjuries)
    if (clause) reply += clause
  }

  // Real gap, Asa's direct ask 2026-08-31: "the option has to be more
  // clearly state[d] — would you like to approve the change, yes or no —
  // and it should tell them in that same message... we're changing X to Y."
  // Appended here for the same reason as travelMergeAck/injuryAsk above —
  // after AI personalization has already run, so it survives regardless of
  // which path produced `reply`; describeDecision() (Claude's only window
  // into what happened) never carries an explicit from/to comparison or a
  // forced yes/no ask on its own. First strips whatever generic "want to
  // lock (that/it) in?" phrasing plan.message (or its AI rewrite) already
  // ends with — asking twice in one message reads as confused, not clear.
  if (plan?.workoutChange || plan?.nutritionChange) {
    reply = reply.replace(/\s*want (me )?to lock (that|it) in\??\s*$/i, '')
    const [beforeState, afterState] = await Promise.all([
      getUserState(eid, today),
      getUserState(eid, today, { workoutChangeOverride: plan.workoutChange ?? undefined, nutritionChangeOverride: plan.nutritionChange ?? undefined }),
    ])
    const fromTitle = beforeState.workoutCandidate?.title
    const toTitle = afterState.workoutCandidate?.title
    const fromCal = beforeState.calorieBudget
    const toCal = afterState.calorieBudget
    let ask = ''
    if (plan.workoutChange?.injuryBodyPart) {
      ask = ` I'd adjust today's workout to protect your ${plan.workoutChange.injuryBodyPart.replace('_', ' ')} — want to approve this? Yes or no.`
    } else if (fromTitle && toTitle && fromTitle !== toTitle) {
      ask = ` I'd be changing your workout from ${fromTitle} to ${toTitle} today — want to approve this? Yes or no.`
    } else if (toTitle && plan.workoutChange) {
      ask = ` I'd set today's workout to ${toTitle} — want to approve this? Yes or no.`
    } else if (plan.nutritionChange?.calorieDelta && fromCal != null && toCal != null && fromCal !== toCal) {
      ask = ` I'd be adjusting your calorie target from ${fromCal} to ${toCal} today — want to approve this? Yes or no.`
    } else if (plan.nutritionChange?.dinnerSuggestion) {
      ask = ` I'd suggest ${plan.nutritionChange.dinnerSuggestion} for dinner today — want to approve this? Yes or no.`
    } else if (plan.nutritionChange?.eatingOut) {
      ask = " I'll build today's plan around eating out — want to approve this? Yes or no."
    }
    if (ask) reply += ask
  }

  // Post-answer nudges — only for someone with no real plan on file yet, never
  // stacked with each other in the same reply, and each only ever offered once.
  // She gets the substantive answer she actually asked for first; this is
  // appended, not a replacement for it.
  if (!existingIntakeForPlan) {
    const isNutritionMoment = signal?.kind === 'eat_out' || eatOutContext !== ''
    const isWorkoutMoment = !isNutritionMoment && (!!workoutStyle || !!location || !!signal)
    const nudgeProfile = await getProfile(eid)
    const prefs = (nudgeProfile?.preferences ?? {}) as Record<string, unknown>

    if (isNutritionMoment) {
      // Allergies/restrictions are the nutrition-side equivalent of injuries on the
      // fitness side — the one wrong guess that can actually hurt her, worth asking
      // once, up front, before she's asked twice about a real plan.
      const dietaryAddressed = !!nudgeProfile?.foodsAvoided.length || !!prefs.dietary_addressed
      if (!dietaryAddressed) {
        reply += ' Quick one for next time — any allergies or foods you avoid?'
        await upsertProfile(eid, user.id, { preferences: { ...prefs, dietary_addressed: true } })
      } else if (!prefs.meal_plan_offered) {
        reply += ' By the way — want me to build your personalized meal plan? Real numbers every time instead of estimates.'
        await upsertProfile(eid, user.id, { preferences: { ...prefs, meal_plan_offered: true } })
      }
    } else if (isWorkoutMoment && !prefs.workout_plan_offered) {
      reply += " By the way — want me to build your personalized workout plan? A real program to follow instead of me winging it each time."
      await upsertProfile(eid, user.id, { preferences: { ...prefs, workout_plan_offered: true } })
    }
  }

  await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: signal ? eventKindFor(signal) : 'message', summary: message, payload: signal ? { signal } : {} })
  // location (parsed above, independent of signal — see parse.ts) never made it into
  // fos_events at all: this insert only ever looked at `signal`'s kind. That meant a
  // client who just said "I'm traveling this week, no gym access" — no other signal —
  // got the trackOverride swap in her reply (the `if (location)` block above), but the
  // event log recorded kind='message', so lib/fos/pattern.ts's `traveling` check (which
  // scans fos_events for kind==='travel') never saw it — only the structured
  // daily-context check-in ever wrote that kind. Real gap: the natural, most-common way
  // she'd mention travel (just saying it in chat) silently never registered. Written as
  // its own row, not folded into the primary kind above, so a message that's both e.g.
  // "stressed" AND "traveling" still records both signals rather than one clobbering
  // the other. Found + fixed 2026-08-19.
  if (location === 'traveling') {
    await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'travel', summary: message, payload: { location } })
  }

  let adjustmentId: string | null = null
  if (plan) {
    const { data: adj } = await svc.from('fos_adjustments').insert({
      enrollment_id: eid, user_id: user.id, for_date: today, trigger: message,
      workout_change: plan.workoutChange ?? null, nutrition_change: plan.nutritionChange ?? null,
      message: reply, status: 'recommended', source: signalSource,
    }).select('id').maybeSingle()
    adjustmentId = (adj?.id as string) ?? null
  }
  await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply, adjustment_id: adjustmentId })

  return NextResponse.json({
    reply,
    adjustment: plan ? { id: adjustmentId, ...plan } : null,
  })
}
