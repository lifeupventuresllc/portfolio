import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Your Program - FitPro',
}

export default async function ContentPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/content')

  // Check if user has purchased
  const { data: purchases } = await supabase
    .from('purchases')
    .select('id, product_id, status')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const hasPurchased = purchases && purchases.length > 0

  if (!hasPurchased) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Content Locked</h1>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Purchase the Complete Fitness Program to unlock all content, workout plans, and nutrition guides.
          </p>
          <Link
            href="/#pricing"
            className="inline-block bg-black text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Get Access Now — $29.99
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Fitness Program</h1>
        <p className="text-gray-500">Welcome back! Here&apos;s your complete 12-week program.</p>
      </div>

      {/* Program Weeks */}
      <div className="space-y-6">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => (
          <div
            key={week}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Week {week}
                  {week <= 4 && ' — Foundation'}
                  {week > 4 && week <= 8 && ' — Building'}
                  {week > 8 && ' — Peak'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {week <= 4 && 'Build your base with fundamental movements and habits.'}
                  {week > 4 && week <= 8 && 'Progressive overload and increased intensity.'}
                  {week > 8 && 'Maximum effort and advanced techniques.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                  {week <= 4 ? 'Beginner' : week <= 8 ? 'Intermediate' : 'Advanced'}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['Mon', 'Wed', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="bg-gray-50 rounded-lg p-3 text-center"
                >
                  <div className="text-xs text-gray-400 mb-1">{day}</div>
                  <div className="text-sm font-medium text-gray-700">
                    {day === 'Sat' ? 'Active Recovery' : 'Workout'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Nutrition Guide Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nutrition Guide</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Macro Targets</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Protein</span>
                <span className="font-medium">1g per lb bodyweight</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Carbs</span>
                <span className="font-medium">40-50% of calories</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fats</span>
                <span className="font-medium">25-30% of calories</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Meal Timing</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Pre-workout</span>
                <span className="font-medium">1-2 hrs before</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Post-workout</span>
                <span className="font-medium">Within 1 hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Meals per day</span>
                <span className="font-medium">4-5 recommended</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
