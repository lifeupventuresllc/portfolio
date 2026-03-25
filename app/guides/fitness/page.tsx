import Link from 'next/link'

export const metadata = {
  title: 'Free: The Fast Food Flip + The Compound Comeback — Asa Luke',
  description: 'Two free fitness assets: 7-day healthy fast food swaps and a 7-day progressive overload compound movement program.',
}

const SWAPS = [
  { day: 'Day 1', craving: "McDonald's Big Mac Meal", swap: 'Chipotle Chicken Bowl', details: 'Chicken, white rice, black beans, fajita veggies, fresh tomato salsa, lettuce', macros: '665 cal | 52g protein', tip: 'Skip tortilla, sour cream, cheese. Add double protein for $3 more = 80g+ protein.' },
  { day: 'Day 2', craving: "Chick-fil-A Deluxe Meal", swap: 'Chick-fil-A Grilled Nuggets + Side', details: '12-count grilled nuggets, fruit cup, side salad with light dressing', macros: '380 cal | 42g protein', tip: 'Grilled nuggets = best fast food protein source. 25g protein for 140 cal.' },
  { day: 'Day 3', craving: 'Taco Bell Crunchwrap', swap: 'Taco Bell Power Bowl', details: 'Chicken power bowl with black beans, lettuce, tomato, guac', macros: '470 cal | 26g protein', tip: 'Add extra chicken ($1.50). Only item on the menu worth eating for macros.' },
  { day: 'Day 4', craving: "Wendy's Baconator", swap: "Wendy's Grilled Chicken Wrap + Chili", details: 'Grilled chicken wrap (light sauce) + small chili', macros: '520 cal | 43g protein', tip: "Wendy's chili = underrated. 23g protein for 250 cal." },
  { day: 'Day 5', craving: 'Subway Footlong Meatball', swap: 'Subway Protein Bowl', details: 'Double chicken breast, all veggies, mustard or oil & vinegar. No bread.', macros: '350 cal | 46g protein', tip: 'Protein bowls = cheat code. Double meat, all veggies, skip 200+ bread calories.' },
  { day: 'Day 6', craving: 'Panda Express Orange Chicken', swap: 'Panda Grilled Teriyaki + Super Greens', details: 'Grilled teriyaki chicken, super greens, half white rice', macros: '420 cal | 36g protein', tip: 'Orange chicken = 490 cal with 25g sugar. Teriyaki grilled = half the calories.' },
  { day: 'Day 7', craving: 'Pizza (2 slices pepperoni)', swap: 'Build-Your-Own Cauliflower Crust', details: 'Cauliflower or keto crust, red sauce, grilled chicken, veggies, light cheese', macros: '480 cal | 32g protein', tip: "Build your own. Load protein, go light on cheese. Or just eat the pizza — one meal won't ruin you if the other 20 that week are locked in." },
]

const WORKOUTS = [
  {
    day: 'Day 1', focus: 'Push (Chest, Shoulders, Triceps)',
    exercises: [
      { name: 'Barbell Bench Press', sets: '4 x 8', note: 'Compound. Flat bench, full range of motion. Start with a weight you can do for 8 clean reps.' },
      { name: 'Overhead Press', sets: '3 x 10', note: 'Compound. Standing or seated. Builds shoulder mass and pressing strength.' },
      { name: 'Dips', sets: '3 x max', note: 'Compound. Bodyweight or weighted. Leans forward = more chest, upright = more triceps.' },
    ],
  },
  {
    day: 'Day 2', focus: 'Pull (Back, Biceps)',
    exercises: [
      { name: 'Deadlift', sets: '4 x 6', note: 'Compound king. Hits back, glutes, hamstrings, core. Start light, nail the form first.' },
      { name: 'Pull-ups / Lat Pulldown', sets: '4 x 8', note: 'Compound. Full dead hang to chin over bar. Use lat pulldown if you can\'t do pull-ups yet.' },
      { name: 'Barbell Row', sets: '3 x 10', note: 'Compound. Bend at hips, pull to lower chest. Squeeze your back at the top.' },
    ],
  },
  {
    day: 'Day 3', focus: 'Legs (Quads, Hamstrings, Glutes)',
    exercises: [
      { name: 'Barbell Squat', sets: '4 x 8', note: 'Compound. The foundation. Below parallel or as deep as mobility allows. Keep chest up.' },
      { name: 'Romanian Deadlift', sets: '3 x 10', note: 'Compound. Hinge at hips, feel the stretch in hamstrings. Don\'t round your back.' },
      { name: 'Walking Lunges', sets: '3 x 12 each leg', note: 'Compound. Builds single-leg strength and stability. Hold dumbbells for extra load.' },
    ],
  },
  {
    day: 'Day 4', focus: 'Rest + Recovery',
    exercises: [
      { name: 'Active recovery', sets: '20-30 min', note: 'Walk, light stretching, foam roll. Your muscles grow during rest, not during the workout.' },
    ],
  },
  {
    day: 'Day 5', focus: 'Upper Body (Push + Pull)',
    exercises: [
      { name: 'Incline Dumbbell Press', sets: '4 x 10', note: 'Compound. Targets upper chest. 30-45 degree incline. Full range of motion.' },
      { name: 'Weighted Pull-ups / Rows', sets: '4 x 8', note: 'Compound. Add weight if bodyweight pull-ups are easy. Or do heavy dumbbell rows.' },
      { name: 'Dumbbell Overhead Press', sets: '3 x 10', note: 'Compound. Seated or standing. Press from shoulders to full lockout overhead.' },
    ],
  },
  {
    day: 'Day 6', focus: 'Legs + Core',
    exercises: [
      { name: 'Front Squat or Goblet Squat', sets: '4 x 10', note: 'Compound. More quad-dominant than back squat. Keeps you upright.' },
      { name: 'Hip Thrust', sets: '4 x 12', note: 'Compound. Best glute builder. Barbell across hips, drive through heels, squeeze at top.' },
      { name: 'Hanging Leg Raises', sets: '3 x 15', note: 'Compound core. Hang from a bar, bring knees to chest (or straight legs for advanced).' },
    ],
  },
  {
    day: 'Day 7', focus: 'Full Rest',
    exercises: [
      { name: 'Complete rest', sets: '—', note: 'No gym. Eat well, sleep 7-9 hours, hydrate. Take a progress photo. Week 1 done.' },
    ],
  },
]

export default function FitnessGuide() {
  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">2 Free Digital Assets</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 leading-tight">
            <span className="text-gold">The Fast Food Flip</span>
          </h1>
          <p className="text-ivory/40 text-lg mb-1">+</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
            <span className="text-gold">The Compound Comeback</span>
          </h1>
          <p className="text-ivory/60 max-w-lg mx-auto mb-8">7-day healthy fast food swaps + a 7-day progressive overload program built on compound movements. By Asa Luke.</p>
          <Link href="/#fitness" className="inline-block bg-gold text-obsidian px-8 py-3 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            Want the Full 12-Week Program? View Now
          </Link>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* ASSET 1: THE FAST FOOD FLIP            */}
        {/* ═══════════════════════════════════════ */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gold text-obsidian rounded-xl flex items-center justify-center font-bold text-sm">1</div>
            <div>
              <h2 className="text-2xl font-bold text-white">The Fast Food Flip</h2>
              <p className="text-ivory/40 text-sm">Same restaurants. Way better macros.</p>
            </div>
          </div>

          <div className="bg-charcoal border border-smoke rounded-2xl p-6 mb-6">
            <p className="text-ivory/60 text-sm leading-relaxed">Every swap below hits <span className="text-gold font-semibold">26g+ protein</span> and stays under <span className="text-gold font-semibold">700 calories</span>. No cooking. Same drive-throughs you already go to.</p>
          </div>

          <div className="space-y-4">
            {SWAPS.map((day, i) => (
              <section key={i} className="bg-charcoal border border-smoke rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</div>
                  <div>
                    <h3 className="text-white font-bold text-sm">{day.day}: {day.swap}</h3>
                    <p className="text-ivory/40 text-xs">Instead of: {day.craving}</p>
                  </div>
                </div>
                <p className="text-ivory/50 text-sm mb-2">{day.details}</p>
                <p className="text-gold/80 text-xs font-semibold mb-2">{day.macros}</p>
                <p className="text-ivory/30 text-xs italic">* {day.tip}</p>
              </section>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* ASSET 2: THE COMPOUND COMEBACK          */}
        {/* ═══════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gold text-obsidian rounded-xl flex items-center justify-center font-bold text-sm">2</div>
            <div>
              <h2 className="text-2xl font-bold text-white">The Compound Comeback</h2>
              <p className="text-ivory/40 text-sm">7-day progressive overload — compound movements only</p>
            </div>
          </div>

          <div className="bg-charcoal border border-smoke rounded-2xl p-6 mb-6">
            <h3 className="text-white font-bold text-sm mb-2">The Progressive Overload Rule</h3>
            <p className="text-ivory/60 text-sm leading-relaxed">Every week, increase by ONE of these: <span className="text-gold font-semibold">+5 lbs</span>, <span className="text-gold font-semibold">+1 rep</span>, or <span className="text-gold font-semibold">+1 set</span>. Small jumps compound into massive gains. This is how muscle is actually built — not by going heavy once, but by going heavier over time.</p>
          </div>

          <div className="space-y-6">
            {WORKOUTS.map((day, i) => (
              <section key={i} className="bg-charcoal border border-smoke rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</div>
                  <div>
                    <h3 className="text-white font-bold">{day.day}</h3>
                    <p className="text-gold text-xs font-semibold uppercase tracking-wider">{day.focus}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {day.exercises.map((ex, j) => (
                    <div key={j} className="bg-obsidian rounded-xl p-4 border border-smoke/50">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-white font-semibold text-sm">{ex.name}</p>
                        <span className="text-gold font-bold text-sm">{ex.sets}</span>
                      </div>
                      <p className="text-ivory/50 text-xs">{ex.note}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-3">Want the Full 12-Week Program?</h3>
          <p className="text-ivory/60 mb-8 max-w-md mx-auto">Progressive overload periodization, full nutrition plan, and tracking. One-time purchase, lifetime access.</p>
          <Link href="/#fitness" className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            View Fitness Program — $29.99
          </Link>
        </div>

        <p className="text-center text-ivory/20 text-xs mt-10">&copy; {new Date().getFullYear()} Asa Luke. All rights reserved.</p>
      </div>
    </div>
  )
}
