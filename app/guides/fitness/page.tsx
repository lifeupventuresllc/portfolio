'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const DAYS = [1, 2, 3, 4, 5] as const
const CLASSES = [
  { id: 1, label: 'Class 1', desc: 'Under 150 lbs' },
  { id: 2, label: 'Class 2', desc: '150-200 lbs' },
  { id: 3, label: 'Class 3', desc: '200+ lbs' },
] as const

const WORKOUTS = [
  {
    day: 'Day 1', focus: 'Push (Chest, Shoulders, Triceps)',
    exercises: [
      { name: 'Barbell Bench Press', sets: '4 x 8', note: 'Compound. Flat bench, full range of motion. Start with a weight you can do for 8 clean reps.' },
      { name: 'Overhead Press', sets: '3 x 10', note: 'Compound. Standing or seated. Builds shoulder mass and pressing strength.' },
      { name: 'Dips', sets: '3 x max', note: 'Compound. Bodyweight or weighted. Lean forward = more chest, upright = more triceps.' },
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
  const [weightClass, setWeightClass] = useState(1)

  return (
    <div className="min-h-[100dvh] bg-paper">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block bg-emerald-500 text-white text-xs font-bold uppercase px-4 py-1 rounded-full tracking-wider mb-4">100% FREE</span>
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">3 Free Digital Assets</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-ink mb-2 leading-tight">
            <span className="text-gold">The Fast Food Flip</span>
          </h1>
          <p className="text-ink/50 text-lg mb-1">+</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-ink mb-2 leading-tight">
            <span className="text-gold">The Compound Comeback</span>
          </h1>
          <p className="text-ink/50 text-lg mb-1">+</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-ink mb-6 leading-tight">
            <span className="text-gold">The Protein Cheat Sheet</span>
          </h1>
          <p className="text-ink/70 max-w-lg mx-auto mb-6">5-day fast food meal plans for 3 weight classes, a 7-day progressive overload program, and the top 20 cheapest protein sources ranked by cost per gram.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 border-2 border-gold text-gold px-6 py-3 font-bold text-sm uppercase tracking-wider rounded-2xl hover:bg-gold/10 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Save / Download Guide
            </button>
            <Link href="/challenge" className="inline-block bg-gold text-obsidian px-6 py-3 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
              Ready for a coach? See the Challenge
            </Link>
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* ASSET 1: THE FAST FOOD FLIP            */}
        {/* ═══════════════════════════════════════ */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gold text-obsidian rounded-xl flex items-center justify-center font-bold text-sm">1</div>
            <div>
              <h2 className="text-2xl font-bold text-ink">The Fast Food Flip</h2>
              <p className="text-ink/50 text-sm">No time to cook? No problem.</p>
            </div>
          </div>

          <div className="bg-charcoal border border-smoke rounded-2xl p-6 mb-6">
            <p className="text-ivory/60 text-sm leading-relaxed">5 days of fast food alternatives customized for your weight class. Breakfast, lunch, snack, and dinner — all from places you already eat at. Pick your weight class below.</p>
          </div>

          {/* Weight Class Selector */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {CLASSES.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setWeightClass(cls.id)}
                className={`p-6 sm:p-8 rounded-3xl border-2 text-center transition-all duration-500 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_0_60px_rgba(201,168,76,0.3)] ${
                  weightClass === cls.id
                    ? 'border-gold bg-gold/15 shadow-[0_0_50px_rgba(201,168,76,0.25)] scale-[1.03]'
                    : 'border-smoke bg-charcoal hover:border-gold/60'
                }`}
              >
                <p className="text-gold text-3xl sm:text-4xl font-bold mb-2">{cls.id}</p>
                <p className={`font-bold text-base sm:text-lg ${weightClass === cls.id ? 'text-ink' : 'text-white'}`}>{cls.label}</p>
                <p className={`text-sm mt-1 ${weightClass === cls.id ? 'text-ink/60' : 'text-ivory/40'}`}>{cls.desc}</p>
              </button>
            ))}
          </div>

          {/* Meal Plan Images */}
          <div className="space-y-6">
            {DAYS.map((day) => (
              <div key={day} className="rounded-2xl overflow-hidden border border-smoke/50">
                <Image
                  src={`/guides/meal-plan/day${day}-class${weightClass}.png`}
                  alt={`Day ${day} - Weight Class ${weightClass} meal plan`}
                  width={800}
                  height={1200}
                  className="w-full h-auto"
                  priority={day <= 2}
                />
              </div>
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
              <h2 className="text-2xl font-bold text-ink">The Compound Comeback</h2>
              <p className="text-ink/50 text-sm">7-day progressive overload — compound movements only</p>
            </div>
          </div>

          <div className="bg-charcoal border border-smoke rounded-2xl p-6 mb-6">
            <h3 className="text-white font-bold text-sm mb-2">The Progressive Overload Rule</h3>
            <p className="text-ivory/60 text-sm leading-relaxed">Every week, increase by ONE of these: <span className="text-gold font-semibold">+5 lbs</span>, <span className="text-gold font-semibold">+1 rep</span>, or <span className="text-gold font-semibold">+1 set</span>. Small jumps compound into massive gains.</p>
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

        {/* ═══════════════════════════════════════ */}
        {/* ASSET 3: THE PROTEIN CHEAT SHEET        */}
        {/* ═══════════════════════════════════════ */}
        <div className="mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gold text-obsidian rounded-xl flex items-center justify-center font-bold text-sm">3</div>
            <div>
              <h2 className="text-2xl font-bold text-ink">The Protein Cheat Sheet</h2>
              <p className="text-ink/50 text-sm">Top 20 cheapest protein sources ranked by cost per gram</p>
            </div>
          </div>

          <div className="bg-charcoal border border-smoke rounded-2xl p-6 mb-6">
            <p className="text-ivory/60 text-sm leading-relaxed">Top 20 cheapest protein sources ranked by cost per gram. Budget tiers, swap guide, and 5 rules to spend less and eat more protein.</p>
          </div>

          <div className="mb-8">
            <a href="/cheat-sheet.html" target="_blank" rel="noopener noreferrer" className="inline-block bg-gold text-obsidian px-6 py-3 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
              View the Cheat Sheet
            </a>
          </div>

          <div className="space-y-6">
            <section className="bg-charcoal border border-smoke rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">Tier 1 — Under $0.04/g Protein</h3>
              <div className="space-y-3">
                {[
                  { name: 'Lentils (dry)', cost: '~$0.01/g', note: 'Cheapest protein on Earth. 18g protein per cup cooked. Buy in bulk.' },
                  { name: 'Black Beans (dry/canned)', cost: '~$0.02/g', note: '15g protein per cup. Versatile — burritos, bowls, soups, dips.' },
                  { name: 'Eggs', cost: '~$0.02/g', note: '6g protein each. Complete amino acid profile. Buy 60-packs at Costco.' },
                  { name: 'Chicken Thighs (bone-in)', cost: '~$0.03/g', note: '26g protein per thigh. Cheaper and juicier than breast. Buy family packs.' },
                  { name: 'Peanut Butter', cost: '~$0.03/g', note: '8g protein per 2 tbsp. Get natural — just peanuts and salt.' },
                  { name: 'Whey Protein (bulk tub)', cost: '~$0.03/g', note: '25g protein per scoop. Buy 5 lb tubs, never single-serve packets.' },
                ].map((item, j) => (
                  <div key={j} className="bg-obsidian rounded-xl p-4 border border-smoke/50">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-white font-semibold text-sm">{item.name}</p>
                      <span className="text-gold font-bold text-sm">{item.cost}</span>
                    </div>
                    <p className="text-ivory/50 text-xs">{item.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-charcoal border border-smoke rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">Tier 2 — $0.04-$0.08/g Protein</h3>
              <div className="space-y-3">
                {[
                  { name: 'Greek Yogurt (large tub)', cost: '~$0.04/g', note: '15-20g protein per serving. Always buy the big tub, never single-serve cups.' },
                  { name: 'Ground Turkey (85/15)', cost: '~$0.05/g', note: '22g protein per 4 oz. Great for meal prep — tacos, bowls, burgers.' },
                  { name: 'Ground Beef (80/20)', cost: '~$0.06/g', note: '20g protein per 4 oz. Buy in bulk, portion and freeze.' },
                  { name: 'Tofu (extra firm)', cost: '~$0.04/g', note: '20g protein per block. Press it, season it, bake or pan-fry.' },
                ].map((item, j) => (
                  <div key={j} className="bg-obsidian rounded-xl p-4 border border-smoke/50">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-white font-semibold text-sm">{item.name}</p>
                      <span className="text-gold font-bold text-sm">{item.cost}</span>
                    </div>
                    <p className="text-ivory/50 text-xs">{item.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-charcoal border border-smoke rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">5 Rules — Spend Less, Eat More Protein</h3>
              <div className="space-y-3">
                {[
                  { rule: 'Rule 1', text: 'Build meals around beans + eggs + chicken thighs. These three cover most of your protein for pennies.' },
                  { rule: 'Rule 2', text: 'Buy whey in bulk tubs (5 lb+). Cost per serving drops by 40-60% vs. single-serve packets.' },
                  { rule: 'Rule 3', text: 'Use whole milk for easy protein. 8g per glass. Cheapest liquid protein source.' },
                  { rule: 'Rule 4', text: 'Large tubs of yogurt, never single-serve. Same product, half the price per gram.' },
                  { rule: 'Rule 5', text: 'Shop sales, buy bulk, freeze portions. Protein doesn\'t expire if you freeze it the day you buy it.' },
                ].map((item, j) => (
                  <div key={j} className="bg-obsidian rounded-xl p-4 border border-smoke/50">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-gold font-semibold text-sm">{item.rule}</p>
                    </div>
                    <p className="text-ivory/50 text-xs">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-charcoal bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-3">Ready for the real thing?</h3>
          <p className="text-ivory/60 mb-8 max-w-md mx-auto">Get a custom workout, done-for-you weekly meals built around food you love, and me coaching you every week — the Snatched Without Starving 6-week challenge.</p>
          <Link href="/challenge" className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            See the Challenge →
          </Link>
        </div>

        <p className="text-center text-ink/40 text-xs mt-10">&copy; {new Date().getFullYear()} Life-Up Fitness. All rights reserved.</p>
      </div>
    </div>
  )
}
