import Link from 'next/link'

export const metadata = {
  title: 'Free 7-Day Fast Food Swap Guide — Asa Luke',
  description: 'Healthy high-protein alternatives to your favorite fast food meals. Eat better without giving up convenience.',
}

const DAYS = [
  {
    day: 'Day 1',
    craving: "McDonald's Big Mac Meal",
    swap: 'Chipotle Chicken Bowl',
    details: 'Chicken, white rice, black beans, fajita veggies, fresh tomato salsa, lettuce',
    macros: '665 cal | 52g protein | 72g carbs | 17g fat',
    tip: 'Skip the tortilla, sour cream, and cheese. Add double protein for $3 more and you hit 80g+ protein in one meal.',
  },
  {
    day: 'Day 2',
    craving: "Chick-fil-A Deluxe Meal",
    swap: 'Chick-fil-A Grilled Nuggets + Side',
    details: '12-count grilled nuggets, fruit cup, side salad with light dressing',
    macros: '380 cal | 42g protein | 32g carbs | 8g fat',
    tip: 'Grilled nuggets are one of the best fast food protein sources. 25g protein for 140 cal (8-count). Double it.',
  },
  {
    day: 'Day 3',
    craving: 'Taco Bell Crunchwrap',
    swap: 'Taco Bell Power Bowl',
    details: 'Chicken power bowl with black beans, lettuce, tomato, guac. Ask for no rice to cut carbs, or keep it for fuel.',
    macros: '470 cal | 26g protein | 50g carbs | 18g fat',
    tip: 'Add extra chicken ($1.50). The power bowl is the only item on the menu worth eating for macros.',
  },
  {
    day: 'Day 4',
    craving: "Wendy's Baconator",
    swap: "Wendy's Grilled Chicken Wrap + Chili",
    details: 'Grilled chicken wrap (no sauce or light sauce) + small chili',
    macros: '520 cal | 43g protein | 42g carbs | 15g fat',
    tip: "Wendy's chili is underrated — 23g protein for 250 cal. Pair it with anything grilled and you're golden.",
  },
  {
    day: 'Day 5',
    craving: 'Subway Footlong Meatball Sub',
    swap: 'Subway Protein Bowl',
    details: 'Double chicken breast, all veggies, mustard or oil & vinegar. No bread.',
    macros: '350 cal | 46g protein | 14g carbs | 10g fat',
    tip: 'Subway protein bowls are a cheat code. You get double the meat, all the veggies, and skip 200+ empty bread calories.',
  },
  {
    day: 'Day 6',
    craving: "Panda Express Orange Chicken",
    swap: 'Panda Express Grilled Teriyaki Chicken + Super Greens',
    details: 'Grilled teriyaki chicken, super greens (broccoli, kale, cabbage), half white rice',
    macros: '420 cal | 36g protein | 40g carbs | 10g fat',
    tip: 'Orange chicken is 490 cal with 25g sugar per serving. The teriyaki grilled is half the calories and almost no sugar.',
  },
  {
    day: 'Day 7',
    craving: 'Pizza (2 slices pepperoni)',
    swap: 'Blaze Pizza Keto Crust or Cauliflower Crust',
    details: 'Keto or cauliflower crust, red sauce, grilled chicken, veggies, light cheese',
    macros: '480 cal | 32g protein | 28g carbs | 22g fat',
    tip: "If you're going to eat pizza, build your own. Control the toppings. Load protein, go light on cheese. Or just eat the pizza — one meal won't ruin your progress if the other 20 meals that week are locked in.",
  },
]

export default function FitnessGuide() {
  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Free Guide</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            7-Day Fast Food<br /><span className="text-gold">Swap Guide</span>
          </h1>
          <p className="text-ivory/60 max-w-lg mx-auto">Healthy, high-protein alternatives to your favorite fast food. Same convenience, way better macros. By Asa Luke.</p>
        </div>

        {/* Intro */}
        <div className="bg-charcoal border border-smoke rounded-2xl p-8 mb-8">
          <h2 className="text-lg font-bold text-white mb-3">The Rule</h2>
          <p className="text-ivory/60 leading-relaxed">You don&apos;t have to stop eating fast food to get in shape. You just need to make smarter choices at the same places you already go. Every swap below hits <span className="text-gold font-semibold">30g+ protein</span> and stays under <span className="text-gold font-semibold">700 calories</span>. No cooking required.</p>
        </div>

        {/* Daily Swaps */}
        <div className="space-y-6">
          {DAYS.map((day, i) => (
            <section key={i} className="bg-charcoal border border-smoke rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</div>
                <div>
                  <h2 className="text-white font-bold">{day.day}</h2>
                  <p className="text-ivory/40 text-xs">Craving: {day.craving}</p>
                </div>
              </div>

              <div className="bg-obsidian rounded-xl p-5 border border-gold/20 mb-4">
                <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">The Swap</p>
                <h3 className="text-white font-bold mb-1">{day.swap}</h3>
                <p className="text-ivory/50 text-sm mb-3">{day.details}</p>
                <p className="text-gold/80 text-xs font-semibold tracking-wide">{day.macros}</p>
              </div>

              <div className="flex gap-2 items-start">
                <span className="text-gold text-sm mt-0.5">*</span>
                <p className="text-ivory/40 text-sm italic">{day.tip}</p>
              </div>
            </section>
          ))}
        </div>

        {/* Bonus Rules */}
        <div className="mt-12 bg-charcoal border border-smoke rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">5 Fast Food Rules to Live By</h2>
          <div className="space-y-4">
            {[
              { rule: 'Grilled over fried — always', desc: 'Same protein, half the calories, no seed oil bath.' },
              { rule: 'Skip the combo — build your own', desc: 'Fries and a soda add 500+ empty calories. Get a side salad, fruit, or just skip the side.' },
              { rule: 'Water is the move', desc: 'A large soda is 300+ calories of pure sugar. That\'s almost a whole extra meal in liquid form.' },
              { rule: 'Sauce on the side', desc: 'Most sauces are 100-200 cal per serving. Use them sparingly or swap for mustard, hot sauce, or salsa (all under 10 cal).' },
              { rule: 'Protein first, always', desc: 'Pick the highest protein option on the menu, then build around it. If protein is locked in, everything else falls in line.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-7 h-7 bg-gold/10 border border-gold/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-gold text-xs font-bold">{i + 1}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{item.rule}</p>
                  <p className="text-ivory/50 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-3">Want the Full 12-Week Program?</h3>
          <p className="text-ivory/60 mb-8 max-w-md mx-auto">Structured workouts, complete nutrition plan, progress tracking. One-time purchase, lifetime access. No fast food required — but you can still eat it.</p>
          <Link href="/#fitness" className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            View Fitness Program — $29.99
          </Link>
        </div>

        <p className="text-center text-ivory/20 text-xs mt-10">&copy; {new Date().getFullYear()} Asa Luke. All rights reserved.</p>
      </div>
    </div>
  )
}
