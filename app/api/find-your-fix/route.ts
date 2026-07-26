import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { diagnose, type QuizAnswers } from '@/lib/blocker-quiz'
import { sendFindYourFixEmail, sendCoachFixNotification } from '@/lib/email'

// Public lead magnet — no login. Diagnoses her real blocker (nutrition,
// movement, or both) from a handful of quick signals, captures the lead,
// emails her the result, and notifies the coach. Does NOT compute calorie
// numbers itself or generate a PDF — that's the Calorie Blueprint's job
// (app/api/blueprint/route.ts), which this hands off to when relevant.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, goal, weightLbs, confidence, movementDays, equipment, schedule, plateau, crashDietHistory } = body

    if (!email || !goal || !weightLbs || !confidence || !movementDays || !schedule) {
      return NextResponse.json({ error: 'Please answer every question so I can diagnose your blocker.' }, { status: 400 })
    }

    const answers: QuizAnswers = {
      goal, weightLbs: Number(weightLbs), confidence, movementDays, equipment: equipment || 'none',
      schedule, plateau: !!plateau, crashDietHistory: !!crashDietHistory,
    }
    const diagnosis = diagnose(answers)

    try {
      await sendFindYourFixEmail(email, name || '', diagnosis.blocker, diagnosis.diagnosticSentence)
    } catch (e) {
      console.error('Find Your Fix email failed:', e)
    }

    try {
      await sendCoachFixNotification({ name: name || '', email, phone, blocker: diagnosis.blocker, goal, weight_lbs: answers.weightLbs })
    } catch (e) {
      console.error('Coach fix notification failed:', e)
    }

    const svc = createServiceClient()
    const noteSummary = `Find Your Fix: ${diagnosis.blocker} · ${goal} · ${answers.weightLbs} lbs`
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
        name: name || null, email, phone: phone || null, service: 'fitness', source: 'find-your-fix',
        status: 'new', notes: noteSummary, last_email_at: new Date().toISOString(),
      })
    }

    try {
      await svc.from('events').insert({
        event_type: 'blocker_quiz_completed',
        source: 'find-your-fix',
        metadata: {
          name: name || '', email, phone: phone || '',
          goal, weight_lbs: answers.weightLbs, confidence, movementDays, equipment: answers.equipment,
          schedule, plateau: answers.plateau, crashDietHistory: answers.crashDietHistory,
          blocker: diagnosis.blocker, priorityFirst: diagnosis.priorityFirst || null,
        },
      })
    } catch (e) {
      console.error('Find Your Fix lead event failed:', e)
    }

    return NextResponse.json({ success: true, ...diagnosis })
  } catch (error) {
    console.error('Find Your Fix error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
