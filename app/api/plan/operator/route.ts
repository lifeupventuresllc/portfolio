import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO, localHourNumber, localDayNumber, addDaysISO } from '@/lib/localdate'
import { recover, type LifeSignal, type RecoveryPlan } from '@/lib/fos/recovery'
import { parseSignal, parseSignalAI, detectWorkoutStyle, detectLocation } from '@/lib/fos/parse'
import { detectEatenFood } from '@/lib/food-estimate'
import { getProfile, recentEvents, upsertProfile, mergeProfilePatch } from '@/lib/fos/context'
import { extractProfileFacts, generateReply, describeDecision } from '@/lib/fos/memory'
import { assessGoalDrift } from '@/lib/fos/goal-drift'
import type { FosEventKind, WorkoutChange } from '@/lib/fos/types'
import type { Injury } from '@/lib/workout-exercises'

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
    const reply = status === 'approved'
      ? (injuryPersisted ? "Locked in — and I've noted it so every future workout stays safe for it automatically. You won't need to bring it up again. 💛" : "Locked in. I've got the rest — go be great. 💛")
      : status === 'rejected' ? "No problem — we'll keep today as planned. You're always in control."
      : "Got it — tell me what you'd rather do and I'll rework it around your goal."
    await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply })
    return NextResponse.json({ reply })
  }

  // Message flow: parse → recover → recommend an adjustment.
  const message = (body.message || '').toString().trim().slice(0, 800)
  if (!message) return NextResponse.json({ error: 'Say something first.' }, { status: 400 })
  await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'user', content: message })

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
      generateReply({ herMessage: message, decision: describeDecision(signal, plan), profile, events, goalContext: goalDrift?.note ?? null, name: (enrollment.name as string) || null }),
      extractProfileFacts(message, profile),
    ])
    if (generated) reply = generated
    if (extracted) {
      const patch = mergeProfilePatch(profile, extracted)
      if (Object.keys(patch).length > 0) await upsertProfile(eid, user.id, patch)
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
