import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildBlueprint, averageDayTargets, type Sex, type Goal, type Activity, type WorkoutLength } from '@/lib/nutrition'
import { generateBlueprintPDF } from '@/lib/blueprint-pdf'
import { sendBlueprintEmail, sendCoachBlueprintNotification } from '@/lib/email'
import { buildInitialPlans } from '@/lib/plan-builder'

// Public lead magnet — no login. Computes the full Calorie Blueprint,
// generates the 7-page PDF, emails it, captures the lead, and returns
// the PDF (base64) so the browser downloads it instantly.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name, email, phone, age, sex, height_in, weight_lbs, goal_weight_lbs,
      goal, activity, workout_days_per_week, workout_length, cardio, bundle,
    } = body
    // Seamless handoff from Find Your Fix — she gets the Craving Swap and/or
    // Lifestyle-Fit Workout Guide bundled into this same email, no second stop.
    const bundleList = (Array.isArray(bundle) ? bundle : []).filter(
      (b): b is 'craving-swap' | 'lifestyle-workout' => b === 'craving-swap' || b === 'lifestyle-workout'
    )

    if (!email || !age || !height_in || !weight_lbs || !goal || !activity) {
      return NextResponse.json({ error: 'Please fill out all fields.' }, { status: 400 })
    }

    // Guardrail: reject out-of-range inputs so a typo can't generate nonsense numbers
    const ageN = Number(age), heightN = Number(height_in), weightN = Number(weight_lbs)
    if (!(ageN >= 13 && ageN <= 100) || !(heightN >= 36 && heightN <= 90) || !(weightN >= 60 && weightN <= 700)) {
      return NextResponse.json({ error: 'Please double-check your age, height, and weight — those values look off.' }, { status: 400 })
    }

    // Allow an explicit 0 (person doesn't work out) — || would wrongly coerce 0 back to 4.
    const workoutDaysN = Number(workout_days_per_week)
    const bp = buildBlueprint({
      name: name || '',
      age: Number(age),
      sex: (sex || 'female') as Sex,
      height_in: Number(height_in),
      weight_lbs: Number(weight_lbs),
      goal_weight_lbs: goal_weight_lbs ? Number(goal_weight_lbs) : undefined,
      goal: goal as Goal,
      activity: activity as Activity,
      workout_days_per_week: Number.isFinite(workoutDaysN) ? workoutDaysN : 4,
      workout_length: (workout_length || '45_60_both') as WorkoutLength,
      cardio: !!cardio,
    })

    // Generate the PDF
    const pdfBytes = await generateBlueprintPDF(bp)
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
    const safeName = (name || 'Your').replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${safeName}_Calorie_Blueprint.pdf`

    const svc = createServiceClient()

    // Real feature, 2026-09-07 (Asa's ask): a Blueprint lead used to have to
    // re-answer every one of these same questions again from scratch if she
    // later created a real account — pure duplicate work for someone who
    // already gave us this exact info. Now the plan gets built immediately,
    // under a GUEST enrollment (challenge_enrollments row with email set,
    // user_id null) — the exact same "no account yet" shape the Stripe
    // purchase webhook already uses. The existing by-email linking logic
    // (lib/auth-onboarding.ts's ensureEnrollmentAndWelcome, plus the
    // fallback in app/api/challenge/intake/route.ts) already looks up
    // `.eq('email', ...).is('user_id', null)` and attaches it the moment
    // she signs up with the same email — zero changes needed there. Never
    // lets this touch a REAL member's existing account/plan: if this email
    // already belongs to a signed-up user, skip entirely rather than
    // silently overwriting something she's since customized.
    try {
      const { data: existingEnrollment } = await svc
        .from('challenge_enrollments')
        .select('id, user_id')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .maybeSingle()

      if (!existingEnrollment || !existingEnrollment.user_id) {
        let enrollmentId = existingEnrollment?.id
        if (!enrollmentId) {
          const { data: created } = await svc.from('challenge_enrollments').insert({
            user_id: null, email, name: name || null,
            tier: 'inner_circle', status: 'active', amount: 0,
            tier_started_at: new Date().toISOString(), started_at: new Date().toISOString(),
          }).select('id').single()
          enrollmentId = created?.id
        }

        // Fields the Blueprint form never asks (it's a nutrition-only lead
        // magnet — no workout-location/experience/injuries questions) get a
        // safe, clearly-a-default value here; she can correct any of them
        // in "Edit my intake answers" the moment she's in the app, same as
        // Quickstart's already-established defaulted-fields pattern.
        if (enrollmentId) {
          const goalWeightN = goal_weight_lbs ? Number(goal_weight_lbs) : undefined
          await buildInitialPlans({
            enrollmentId, userId: null,
            name: name || 'Your',
            age: Number(age), sex: sex === 'male' ? 'male' : 'female',
            height_in: Number(height_in), weight_lbs: Number(weight_lbs),
            goal: goal as Goal, target_lbs: goalWeightN ? Math.abs(Number(weight_lbs) - goalWeightN) : 10,
            activity_level: activity as Activity,
            experience_level: 'beginner', training_location: 'gym', focus_area: 'overall',
            days_per_week: Number.isFinite(workoutDaysN) ? workoutDaysN : 4,
            workout_days_per_week: Number.isFinite(workoutDaysN) ? workoutDaysN : 4,
            requiredTierCompleted: true, autoFillMeals: true,
          })
        }
      }
    } catch (e) {
      console.error('Blueprint guest-plan build failed (PDF/email still send):', e)
    }

    // Email summary (representative daily numbers; full detail is in the PDF)
    const t = averageDayTargets(bp)
    const summary = {
      calories: t.calories,
      protein_g: t.protein_g,
      carbs_g: t.carbs_g,
      fats_g: t.fats_g,
    }

    // Send it (attachment) — non-blocking failure
    try {
      await sendBlueprintEmail(email, name || '', summary, goal, { base64: pdfBase64, filename }, bundleList)
    } catch (e) {
      console.error('Blueprint email failed:', e)
    }

    // Notify the coach to follow up on IG within 24 hours
    try {
      await sendCoachBlueprintNotification({
        name: name || '', email, phone,
        goal, weight_lbs: Number(weight_lbs), age: Number(age),
        activity, workout_days: Number(workout_days_per_week) || 0,
        workoutEat: bp.current.workout.eat, restEat: bp.current.rest.eat,
      })
    } catch (e) {
      console.error('Coach notification failed:', e)
    }

    // Capture / refresh the lead
    const noteSummary = `Blueprint: ${goal} · workout ${fmtSafe(bp.current.workout.eat)} / rest ${fmtSafe(bp.current.rest.eat)} cal · ${bp.protein_g}g protein`
    const { data: existingLead } = await svc
      .from('funnel_leads')
      .select('id')
      .eq('email', email)
      .eq('service', 'fitness')
      .maybeSingle()

    if (existingLead) {
      await svc.from('funnel_leads')
        .update({ name: name || null, phone: phone || null, notes: noteSummary, last_email_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', existingLead.id)
    } else {
      await svc.from('funnel_leads').insert({
        name: name || null, email, phone: phone || null, service: 'fitness', source: 'blueprint',
        status: 'new', notes: noteSummary, last_email_at: new Date().toISOString(),
      })
    }

    await svc.from('events').insert({
      event_type: 'blueprint_completed',
      metadata: { goal, workout_eat: bp.current.workout.eat, rest_eat: bp.current.rest.eat },
      source: 'blueprint',
    })

    // Full lead record (every input + every computed number) so the coach can see
    // each client's complete blueprint in the admin. Non-blocking — never breaks the funnel.
    try {
      const sw = bp.current.workout.macros
      await svc.from('events').insert({
        event_type: 'blueprint_lead',
        source: 'blueprint',
        metadata: {
          name: name || '', email, phone: phone || '',
          age: Number(age), sex: (sex || 'female'),
          height_in: Number(height_in), weight_lbs: Number(weight_lbs),
          goal_weight_lbs: goal_weight_lbs ? Number(goal_weight_lbs) : null,
          goal, activity,
          workout_days: workoutDaysN, workout_length: workout_length || '45_60_both', cardio: !!cardio,
          bmr: bp.bmr, rest_maintenance: bp.restMaintenance, workout_maintenance: bp.workoutMaintenance,
          protein_g: bp.protein_g, carbs_g: sw.carbs_g, fats_g: sw.fats_g, split: bp.splitLabel,
          steady_workout: bp.current.workout.eat, steady_rest: bp.current.rest.eat,
          faster_workout: bp.aggressive.workout.eat, faster_rest: bp.aggressive.rest.eat,
          est_weekly_change_lbs: bp.current.estWeeklyChangeLbs,
          bundle: bundleList.length ? bundleList : null,
        },
      })
    } catch (e) {
      console.error('Blueprint lead event failed:', e)
    }

    return NextResponse.json({
      success: true,
      filename,
      pdfBase64,
      summary,
      preview: {
        workoutEat: bp.current.workout.eat,
        restEat: bp.current.rest.eat,
        protein_g: bp.protein_g,
        splitLabel: bp.splitLabel,
      },
    })
  } catch (error) {
    console.error('Blueprint error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

function fmtSafe(n: number) {
  return Math.round(n).toLocaleString('en-US')
}
