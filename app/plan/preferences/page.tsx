import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import PreferencesForm from '@/components/PreferencesForm'

export const dynamic = 'force-dynamic'

// Real fix, live feedback (beta feedback Priority 1, 2026-08-25): the gear
// icon used to reopen the FULL intake wizard, starting at "what's your
// name?" — pointless when she's not changing her name, and buried the two
// things she actually asked to update (goal, workout style) behind five
// unrelated steps first. This page IS just those questions — nothing else —
// so "update your preferences" means exactly that, not "redo onboarding."
// Everything else she already answered (age/sex/height/weight/location/
// injuries/food/etc.) is read here and resubmitted unchanged alongside
// whatever she picks, through the same buildInitialPlans regeneration path
// the full intake form already uses — so saving here has the same real
// effect (a genuinely rebuilt workout/nutrition plan), just without
// re-asking anything she's not here to change.
export default async function PreferencesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/preferences')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id, name').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  const { data: intake } = await svc
    .from('challenge_intake')
    .select('age, sex, height_in, weight_lbs, goal, target_lbs, activity_level, experience_level, training_location, days_per_week, weekly_food_budget, food_preferences, dislikes_allergies, form_data')
    .eq('enrollment_id', enrollment.id)
    .maybeSingle()

  // No real intake yet — nothing to "update," send her through the real
  // first-time flow instead of a preferences screen with nothing to prefill.
  if (!intake) redirect('/plan/intake')

  const formData = (intake.form_data || {}) as Record<string, unknown>

  return (
    <PreferencesForm
      current={{
        name: enrollment.name || '',
        age: intake.age as number, sex: (intake.sex as string) || 'female',
        height_in: intake.height_in as number, weight_lbs: intake.weight_lbs as number,
        target_lbs: (intake.target_lbs as number) ?? null,
        activity_level: (intake.activity_level as string) || 'moderate',
        experience_level: (intake.experience_level as string) || 'beginner',
        training_location: (intake.training_location as string) || 'gym',
        days_per_week: (intake.days_per_week as number) || 3,
        weekly_food_budget: (intake.weekly_food_budget as number) ?? null,
        food_preferences: (intake.food_preferences as string) || '',
        dislikes_allergies: (intake.dislikes_allergies as string) || '',
        injuries: Array.isArray(formData.injuries) ? (formData.injuries as string[]) : [],
        postpartum: !!formData.postpartum,
        other_info: (formData.other_info as string) || '',
        cook_days_per_week: (formData.cook_days_per_week as number) ?? 2,
        focus_area: (formData.focus_area as string) || 'overall',
        goals: Array.isArray(formData.goals) && formData.goals.length ? (formData.goals as string[]) : [intake.goal as string].filter(Boolean),
        training_styles: Array.isArray(formData.training_styles) ? (formData.training_styles as string[]) : [],
      }}
    />
  )
}
