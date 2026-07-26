// ============================================================
// The Weight Loss Blocker Assessment — diagnosis/routing logic
// Pure function, no side effects. "Lose weight" isn't one problem for this
// avatar — it's nutrition confusion for some, movement/consistency for
// others, both for some. This picks which one applies from her real
// answers, so the result page can route her to the exact resource she
// needs instead of a one-size-fits-all funnel.
// ============================================================

export type Blocker = 'nutrition' | 'movement' | 'both'

export type Confidence = 'confident' | 'unsure' | 'confusing'
export type MovementDays = 'low' | 'mid' | 'high' // 0-2 / 3-4 / 5+
export type ScheduleType = 'single_mom' | 'desk_job' | 'shift_work' | 'nurse_teacher' | 'other'

export interface QuizAnswers {
  goal: 'lose' | 'gain'
  weightLbs: number
  confidence: Confidence
  movementDays: MovementDays
  schedule: ScheduleType
  plateau: boolean // changed eating, scale hasn't moved
  crashDietHistory: boolean
}

export interface Diagnosis {
  blocker: Blocker
  diagnosticSentence: string
  priorityFirst?: Blocker // only set when blocker === 'both'
}

function diagnosticSentence(a: QuizAnswers, nutritionSignal: boolean): string {
  if (!nutritionSignal) return "You're already doing a lot right — let's tighten up the structure so it actually sticks."
  if (a.crashDietHistory) {
    return 'Past crash or yo-yo dieting can make your body hold onto weight defensively — your metabolism needs rebuilding trust, not another restrictive diet.'
  }
  if (a.plateau) {
    return "If you've changed what you eat but the scale hasn't moved, you're likely under-eating without realizing it — your metabolism adapts and stalls when intake drops too low for too long."
  }
  if (a.confidence === 'confusing' && a.movementDays !== 'low') {
    return 'Your activity level means your real maintenance is probably higher than you think — you may be able to eat more than you assume and still see progress.'
  }
  return "You don't need to guess anymore — let's get you your real number."
}

export function diagnose(a: QuizAnswers): Diagnosis {
  const nutritionSignal = a.confidence === 'confusing' || a.plateau || a.crashDietHistory
  const movementSignal = a.movementDays === 'low'

  const diagnosticSentence_ = diagnosticSentence(a, nutritionSignal)

  if (nutritionSignal && movementSignal) {
    return { blocker: 'both', diagnosticSentence: diagnosticSentence_, priorityFirst: 'nutrition' }
  }
  if (nutritionSignal) return { blocker: 'nutrition', diagnosticSentence: diagnosticSentence_ }
  if (movementSignal) return { blocker: 'movement', diagnosticSentence: diagnosticSentence_ }
  // Neither signal fired strongly — she's confident in food and moving 3+ days/week.
  // Default to 'both', light-touch framing (see diagnosticSentence's !nutritionSignal branch).
  return { blocker: 'both', diagnosticSentence: diagnosticSentence_, priorityFirst: 'nutrition' }
}

export const SCHEDULE_LABEL: Record<ScheduleType, string> = {
  single_mom: 'a single mom balancing everything',
  desk_job: 'stuck at a desk most of the day',
  shift_work: 'working unpredictable retail/service shifts',
  nurse_teacher: 'on a nursing or teaching schedule',
  other: 'juggling a packed schedule',
}
