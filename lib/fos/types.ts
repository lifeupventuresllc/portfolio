import type { Injury } from '@/lib/workout-exercises'

// The Fitness Operating System — shared types + the principles the operator obeys.
// It OPERATES her fitness life; it does not just track it.

export const FOS_PRINCIPLES = {
  category: 'A Fitness Operating System — it operates her fitness life, it does not just track it.',
  goalConstant: 'The goal never changes. The path changes.',
  removeADecision: 'Remove one more decision every time.',
  recommendDontControl: 'Recommend, never control — she approves, modifies, or rejects.',
  recoveryNotPunishment: 'Never "you failed" — always "life happened, here is your adjusted path forward."',
  understoodNotGuilty: 'Make her feel understood, not guilty.',
} as const

export type FosProfile = {
  enrollmentId: string
  goalSummary?: string | null
  workSchedule?: Record<string, { start?: string; end?: string }> | null
  energyPatterns?: Record<string, unknown> | null
  foodsLoved: string[]
  foodsAvoided: string[]
  motivators: string[]
  discouragers: string[]
  barriers: string[]
  cycleTracking: boolean
  preferences: Record<string, unknown>
}

export type FosEventKind =
  | 'message' | 'adjustment' | 'win' | 'miss' | 'excuse'
  | 'schedule_change' | 'eat_out' | 'travel' | 'low_energy' | 'poor_sleep' | 'note'
  | 'craving' | 'stressed' | 'injury'

export type FosEvent = {
  id?: string
  occurredOn: string // YYYY-MM-DD (user-local)
  kind: FosEventKind
  summary?: string | null
  payload?: Record<string, unknown>
}

export type AdjustmentStatus = 'recommended' | 'approved' | 'modified' | 'rejected'
export type WorkoutChange = { fromMinutes?: number; toMinutes?: number; swapTo?: string; reason?: string; trackOverride?: 'gym' | 'home'; injuryBodyPart?: Injury; contentSwap?: 'cardio' }
export type NutritionChange = { calorieDelta?: number; dinnerSuggestion?: string; reason?: string }

export type FosAdjustment = {
  id?: string
  forDate: string
  trigger?: string
  workoutChange?: WorkoutChange | null
  nutritionChange?: NutritionChange | null
  message: string
  status: AdjustmentStatus
  source: 'ai' | 'rule'
}

export type FosMessage = {
  id?: string
  role: 'user' | 'operator'
  content: string
  adjustmentId?: string | null
  createdAt?: string
}
