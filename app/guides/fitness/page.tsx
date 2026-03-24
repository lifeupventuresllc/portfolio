import Link from 'next/link'

export const metadata = {
  title: 'Free 7-Day Starter Program — Asa Luke',
  description: 'A free 7-day workout + nutrition kickstart program to build momentum and see results fast.',
}

export default function FitnessGuide() {
  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Free Program</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            7-Day Fitness<br /><span className="text-gold">Kickstart</span>
          </h1>
          <p className="text-ivory/60 max-w-lg mx-auto">A complete week of workouts + nutrition to build momentum. No gym required. By Asa Luke.</p>
        </div>

        {/* Workout Plan */}
        <div className="space-y-6">
          {[
            { day: 'Day 1', focus: 'Upper Body', exercises: ['Push-ups: 4 x 15', 'Pike push-ups: 3 x 10', 'Diamond push-ups: 3 x 12', 'Plank shoulder taps: 3 x 20', 'Tricep dips (chair): 3 x 15'] },
            { day: 'Day 2', focus: 'Lower Body', exercises: ['Squats: 4 x 20', 'Lunges: 3 x 12 each leg', 'Glute bridges: 4 x 15', 'Calf raises: 3 x 25', 'Wall sit: 3 x 45 seconds'] },
            { day: 'Day 3', focus: 'Active Recovery', exercises: ['20-minute walk or light jog', '10-minute full body stretch', 'Foam roll any tight areas', 'Hydrate: minimum 80oz water today'] },
            { day: 'Day 4', focus: 'Core + Cardio', exercises: ['Plank: 3 x 60 seconds', 'Bicycle crunches: 3 x 20', 'Mountain climbers: 3 x 30 seconds', 'Burpees: 3 x 10', 'High knees: 3 x 30 seconds'] },
            { day: 'Day 5', focus: 'Full Body', exercises: ['Push-ups: 3 x 15', 'Squats: 3 x 20', 'Plank: 3 x 45 seconds', 'Lunges: 3 x 10 each leg', 'Burpees: 3 x 8'] },
            { day: 'Day 6', focus: 'HIIT', exercises: ['30 seconds on / 15 seconds off — 6 rounds:', 'Jump squats', 'Push-ups', 'High knees', 'Mountain climbers', 'Rest 2 min between rounds'] },
            { day: 'Day 7', focus: 'Rest + Reflect', exercises: ['Full rest day — your muscles grow during rest', 'Take progress photo', 'Write down how you feel vs. Day 1', 'Plan your next week'] },
          ].map((day, i) => (
            <section key={i} className="bg-charcoal border border-smoke rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</div>
                <div>
                  <h2 className="text-white font-bold">{day.day}</h2>
                  <p className="text-gold text-xs font-semibold uppercase tracking-wider">{day.focus}</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {day.exercises.map((ex, j) => (
                  <li key={j} className="text-ivory/60 text-sm flex items-start gap-2">
                    <span className="text-gold/60 mt-1">&bull;</span>
                    {ex}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Nutrition */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Quick Nutrition Guide</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-charcoal border border-smoke rounded-2xl p-6">
              <p className="text-gold font-bold text-sm mb-3">Protein Goal</p>
              <p className="text-ivory/60 text-sm leading-relaxed">Aim for 0.8-1g per pound of body weight. Chicken, fish, eggs, Greek yogurt, protein shakes. This is non-negotiable for results.</p>
            </div>
            <div className="bg-charcoal border border-smoke rounded-2xl p-6">
              <p className="text-gold font-bold text-sm mb-3">Hydration</p>
              <p className="text-ivory/60 text-sm leading-relaxed">Minimum 80oz of water daily. More if you sweat. Start your morning with 16oz before anything else. This alone changes how you feel.</p>
            </div>
            <div className="bg-charcoal border border-smoke rounded-2xl p-6">
              <p className="text-gold font-bold text-sm mb-3">Simple Meal Template</p>
              <p className="text-ivory/60 text-sm leading-relaxed">Every meal: 1 palm protein + 1 fist carbs + 1 thumb fat + unlimited vegetables. Keep it simple. Consistency beats perfection.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-3">Ready for the Full 12-Week Program?</h3>
          <p className="text-ivory/60 mb-8 max-w-md mx-auto">Structured progressive overload, full nutrition plan, and progress tracking. One-time purchase, lifetime access.</p>
          <Link href="/#fitness" className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            View Fitness Program — $29.99
          </Link>
        </div>

        <p className="text-center text-ivory/20 text-xs mt-10">&copy; {new Date().getFullYear()} Asa Luke. All rights reserved.</p>
      </div>
    </div>
  )
}
