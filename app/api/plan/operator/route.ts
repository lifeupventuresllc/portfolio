import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO, localHourNumber, localDayNumber, localMondayIndex, addDaysISO } from '@/lib/localdate'
import type { WeekPlan } from '@/lib/meal-plan'
import { recover, type LifeSignal, type RecoveryPlan } from '@/lib/fos/recovery'
import { parseSignal, parseSignalAI, detectWorkoutStyle, detectLocation } from '@/lib/fos/parse'
import { detectEatenFood } from '@/lib/food-estimate'
import { getProfile, recentEvents, upsertProfile, mergeProfilePatch } from '@/lib/fos/context'
import { extractProfileFacts, generateReply, describeDecision } from '@/lib/fos/memory'
import { assessGoalDrift } from '@/lib/fos/goal-drift'
import { detectPlanIntent } from '@/lib/fos/plan-intent'
import { buildInitialPlans } from '@/lib/plan-builder'
import type { FosEventKind, WorkoutChange } from '@/lib/fos/types'
import type { Injury } from '@/lib/workout-exercises'
import type { WorkoutProgram } from '@/lib/workout'

// Names today's actual exercises out of a freshly generated program, for Coach
// Asa's cold-start reply — she asked in chat, so she gets the real moves back in
// chat, not just a "check your dashboard" pointer. If she named a time budget,
// leads with only as many moves as roughly fit it (~6 min/exercise incl. rest);
// the full session is still saved either way.
function summarizeTodaysWorkout(program: WorkoutProgram, minutesAvailable?: number): string {
  const exercises: string[] = []
  if (program.track === 'gym' && program.gymDays?.length) {
    const day = program.gymDays[0]
    for (const s of day.supersets) { exercises.push(s.push.name, s.pull.name) }
    for (const a of day.accessory) exercises.push(a.name)
  } else if (program.home?.days.length) {
    for (const e of program.home.days[0].exercises) exercises.push(e.name)
  }
  if (!exercises.length) return 'your first session is ready'
  const cap = minutesAvailable ? Math.max(3, Math.min(exercises.length, Math.round(minutesAvailable / 6))) : exercises.length
  const picked = exercises.slice(0, cap)
  return picked.length < exercises.length
    ? `${picked.join(', ')} — the rest of today's full session is saved on your dashboard for next time`
    : picked.join(', ')
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
    if (body.adjustmentId) {
      const { data: updated } = await svc.from('fos_adjustments').update({ status }).eq('id', body.adjustmentId).eq('enrollment_id', eid).select('workout_change').maybeSingle()
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
    const reply = status === 'approved'
      ? withName(injuryPersisted ? "locked in — and I've noted it so every future workout stays safe for it automatically. You won't need to bring it up again. 💛" : "locked in. I've got the rest — go be great. 💛")
      : status === 'rejected' ? withName("no problem — we'll keep today as planned. You're always in control.")
      : withName("got it — tell me what you'd rather do and I'll rework it around your goal.")
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
  const { data: existingIntakeForPlan } = await svc.from('challenge_intake').select('id').eq('enrollment_id', eid).maybeSingle()
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
      const reply = `${namePrefix}let's do it — head to your plan page and tap "Build my plan." Takes about a minute, and I'll have your real numbers locked in from there. 💛`
      await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply })
      return NextResponse.json({ reply, offerIntake: true })
    }

    const conversationText = (history || []).map((h) => `${h.role}: ${h.content}`).join('\n')
    const intent = await detectPlanIntent(conversationText)

    if (intent) {
      // The only follow-up worth her time: injuries (a wrong guess can actually hurt
      // her) and target area (a wrong guess just misses what she wanted). Only asked
      // when she's asking for a workout AND genuinely hasn't addressed it anywhere in
      // the conversation yet — never re-asked once either is answered. Everything
      // else (weight, goal, days/week, experience) gets a silent, disclosed default
      // instead of another question.
      const needsInjuryAsk = intent.wantsWorkout && !intent.injuriesAddressed
      const needsFocusAsk = intent.wantsWorkout && !intent.focus_area
      if (needsInjuryAsk || needsFocusAsk) {
        const q = needsInjuryAsk && needsFocusAsk
          ? "Quick one before I build this — any injuries or areas I should work around, and is there a specific area you want to focus on, or just overall?"
          : needsInjuryAsk
            ? "Quick one — any injuries or areas I should work around today?"
            : "Quick one — a specific area you want to focus on, or just overall?"
        await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: q })
        return NextResponse.json({ reply: q })
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
      const training_location = intent.training_location ?? 'gym'
      const experience_level = intent.experience_level ?? 'beginner'
      const focus_area = intent.focus_area || 'overall'

      const { targets, program } = await buildInitialPlans({
        enrollmentId: eid, userId: user.id, name: enrollment.name || 'Your',
        age, sex, height_in, weight_lbs, goal, target_lbs: 10,
        activity_level: 'moderate', experience_level, training_location,
        days_per_week, workout_days_per_week: days_per_week, cook_days_per_week: 2,
        injuries: intent.injuries, postpartum: false, training_style: 'none', focus_area,
        autoFillMeals: true,
      })

      const namePrefix = enrollment.name ? `${enrollment.name}, ` : ''
      let reply: string
      if (intent.scope === 'today' && intent.wantsWorkout) {
        reply = `${namePrefix}here's what to do: ${summarizeTodaysWorkout(program, intent.minutesAvailable)}.`
        if (intent.wantsNutrition) reply += ` Calorie target's ${targets.calories}/day (${targets.protein_g}g protein) — full week's on your dashboard.`
      } else if (intent.wantsNutrition && !intent.wantsWorkout) {
        reply = `${namePrefix}built your week — target's ${targets.calories} cal/day (${targets.protein_g}g protein), meals are laid out on your dashboard.`
      } else {
        reply = `${namePrefix}built it — your ${days_per_week}x/week ${training_location} program is ready${intent.wantsNutrition ? `, target's ${targets.calories} cal/day (${targets.protein_g}g protein)` : ''}. Full breakdown's on your dashboard.`
      }
      if (usedDefaults.length) {
        const label = usedDefaults.join(' and ')
        reply += ` I used a starting ${label} estimate since you hadn't told me yet — give me your real ${label} anytime and I'll dial it in.`
      }
      await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply })
      return NextResponse.json({ reply, planBuilt: true })
    }
  }

  const aiResult = await parseSignalAI(message)
  const signal = aiResult.ok ? aiResult.signal : parseSignal(message)
  const signalSource: 'ai' | 'rule' = aiResult.ok ? 'ai' : 'rule'
  const workoutStyle = aiResult.ok ? aiResult.workoutStyle : detectWorkoutStyle(message)
  const location = aiResult.ok ? aiResult.location : detectLocation(message)

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
      const reply = `Logged it: ${summary}. Estimated, not exact — but it's counted toward today already. 💛`
      await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'message', summary: message, payload: { loggedFood: true, foods } })
      await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply })
      return NextResponse.json({ reply, loggedFood: true })
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

  // She told us where she's training today — never ask when she's already said it.
  // 'traveling' maps to the home/bodyweight track since that's the equipment-free
  // one; it has no dedicated track of its own (see app/plan/workout/page.tsx's
  // trackOverride, which only understands 'home' | 'gym'). If nothing else matched
  // above, her just naming her location is still enough on its own to act on.
  if (location) {
    const trackOverride: 'home' | 'gym' = location === 'gym' ? 'gym' : 'home'
    if (plan) {
      plan = { ...plan, workoutChange: { ...(plan.workoutChange || {}), trackOverride } }
    } else {
      plan = {
        message: location === 'traveling'
          ? "Got it — no equipment where you are, so I'll keep today's session bodyweight-only. Want me to lock that in?"
          : `Got it — switching today to your ${trackOverride} session. Want me to lock that in?`,
        workoutChange: { trackOverride, reason: location === 'traveling' ? 'traveling — no equipment' : `training at ${location}` },
      }
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
