import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildBlueprint, type Sex, type Goal, type Activity, type WorkoutLength } from '@/lib/nutrition'
import { generateBlueprintPDF } from '@/lib/blueprint-pdf'
import { sendBlueprintEmail, sendCoachBlueprintNotification } from '@/lib/email'

// Public lead magnet — no login. Computes the full Calorie Blueprint,
// generates the 7-page PDF, emails it, captures the lead, and returns
// the PDF (base64) so the browser downloads it instantly.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name, email, phone, age, sex, height_in, weight_lbs, goal_weight_lbs,
      goal, activity, workout_days_per_week, workout_length, cardio,
    } = body

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

    // Email summary (representative daily numbers; full detail is in the PDF)
    const summary = {
      calories: Math.round(bp.current.weeklyEat / 7),
      protein_g: bp.current.workout.macros.protein_g,
      carbs_g: bp.current.workout.macros.carbs_g,
      fats_g: bp.current.workout.macros.fats_g,
    }

    // Send it (attachment) — non-blocking failure
    try {
      await sendBlueprintEmail(email, name || '', summary, goal, { base64: pdfBase64, filename })
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
    const svc = createServiceClient()
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
