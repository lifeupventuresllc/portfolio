import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildBlueprint } from '@/lib/nutrition'
import MealBuilder from '@/components/MealBuilder'
import GroceryPricing from '@/components/GroceryPricing'

export const dynamic = 'force-dynamic'

export default async function MealsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/meals')

  const svc = createServiceClient()
  let { data: enrollment } = await svc
    .from('challenge_enrollments').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc
      .from('challenge_enrollments').select('*')
      .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }

  const { data: intake } = enrollment
    ? await svc.from('challenge_intake').select('*').eq('enrollment_id', enrollment.id).maybeSingle()
    : { data: null }

  // Needs intake to know her calorie targets — no forced form though. Coach Asa can
  // build a real meal plan straight from a chat message (see app/api/plan/operator/
  // route.ts's cold-start build), so that's offered first.
  if (!enrollment || !intake) {
    return (
      <div className="min-h-[100dvh] bg-obsidian px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Let&apos;s get your numbers first</h1>
          <p className="text-ivory/60 text-sm mb-6">Tell Coach Asa what you&apos;re looking for and she&apos;ll build it right there — or fill in your stats yourself.</p>
          <Link href="/plan/coach" className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl mb-3">Talk to Coach Asa</Link>
          <Link href="/plan/intake" className="block text-ivory/50 text-sm underline underline-offset-4">Or build it myself</Link>
        </div>
      </div>
    )
  }

  const bp = buildBlueprint({
    age: Number(intake.age), sex: intake.sex === 'male' ? 'male' : 'female',
    height_in: Number(intake.height_in), weight_lbs: Number(intake.weight_lbs),
    goal: intake.goal === 'gain' || intake.goal === 'maintain' ? intake.goal : 'lose',
    activity: intake.activity_level || 'moderate',
    workout_days_per_week: Number(intake.days_per_week) || 4,
    workout_length: '45_60_both',
  })
  const cookDays = ([1, 2, 3].includes(Number(intake.form_data?.cook_days_per_week)) ? Number(intake.form_data.cook_days_per_week) : 2) as 1 | 2 | 3

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Home</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Meal Builder</p>
        <h1 className="text-3xl font-bold text-white mb-2">Build your week</h1>
        <p className="text-ivory/60 text-sm mb-8">Pick meals you love — we portion each day to your calories and organize your cook schedule.</p>
        <MealBuilder initial={{
          name: enrollment.name || 'Your',
          workoutCal: bp.current.workout.eat,
          restCal: bp.current.rest.eat,
          protein: bp.protein_g,
          cookDays,
          budget: Number(intake.weekly_food_budget) || undefined,
          weightLbs: Number(intake.weight_lbs) || undefined,
          foodPreferences: intake.food_preferences || undefined,
          dislikesAllergies: intake.dislikes_allergies || undefined,
        }} />

        <div className="mt-8">
          <GroceryPricing />
        </div>
      </div>
    </div>
  )
}
