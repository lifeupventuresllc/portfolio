'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const INCLUDED = [
  { title: 'Your Custom Sculpt Plan', desc: 'Workouts built for you — home or gym, matched to your level (beginner → advanced) and your goal.' },
  { title: 'The Eat-What-You-Love Meal Plan', desc: 'I plan your meals every week for your goal (lose or gain), plus a grocery list built around your budget and the foods you love.' },
  { title: 'Weekly Check-Ins With Coach Asa', desc: 'Not a PDF you figure out alone, not an AI app — me, personally checking on you every week so you never fall off.' },
  { title: 'The Curve Collective', desc: 'A private community of women walking it out with you.' },
  { title: 'The Transformation Tracker', desc: 'See your progress beyond the scale — weight, measurements, and photos over time.' },
  { title: 'The Menu Cookbook', desc: 'Cravable, macro-friendly recipes — real food you actually want to eat.' },
  { title: 'The 7-Day Jump Start', desc: 'A quick win in your very first week so you feel the momentum fast.' },
  { title: 'The Eat-Out Cheat Sheet', desc: 'Stay on track at restaurants and social events without the guilt.' },
  { title: 'The 21-Day Habit Reset', desc: 'The system that makes your results actually stick after the 6 weeks.' },
]

const FAQ = [
  { q: 'What if I want to gain weight, not lose it?', a: 'This is built for both. Your plan is set to your goal — lose or gain your first 10–15 lbs. Most programs only do fat loss; this does either.' },
  { q: "I'm a total beginner. Is this for me?", a: 'Yes. Your training is matched to your level — beginner, intermediate, or advanced — and you can train at home or in the gym.' },
  { q: 'Do I really talk to you, or is it automated?', a: "You talk to me. Every week I personally check in on your progress — it's real coaching, not a chatbot." },
  { q: 'Whats the difference between the Challenge and the Inner Circle?', a: 'The Challenge ($150) has group check-ins and everything you need to transform. The Inner Circle ($300) adds weekly 1:1 video calls with me, direct access between calls, fully custom plans, and faith + mindset coaching — limited to 5 women.' },
]

export default function ChallengePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-obsidian" />}>
      <ChallengeContent />
    </Suspense>
  )
}

function ChallengeContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showCanceled, setShowCanceled] = useState(false)

  useEffect(() => {
    if (searchParams.get('success') === 'true') setShowSuccess(true)
    if (searchParams.get('canceled') === 'true') setShowCanceled(true)
  }, [searchParams])

  async function handleCheckout(packageSlug: string) {
    if (!email) return
    setLoadingSlug(packageSlug)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageSlug, email, name }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    }
    setLoadingSlug(null)
  }

  return (
    <div className="min-h-screen bg-obsidian">
      {showSuccess && (
        <div className="fixed top-0 inset-x-0 z-50 bg-green-600 text-white text-center py-4 px-4">
          <p className="font-semibold">You&apos;re in! Check your email to create your account and complete your intake.</p>
          <button onClick={() => setShowSuccess(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-xl">&times;</button>
        </div>
      )}
      {showCanceled && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-600/90 text-white text-center py-4 px-4">
          <p className="font-semibold">Checkout canceled. No charge was made.</p>
          <button onClick={() => setShowCanceled(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-xl">&times;</button>
        </div>
      )}

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(201,168,76,0.08),transparent_70%)]" />
        <div className="max-w-3xl mx-auto text-center relative">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">6-Week Challenge</p>
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4 tracking-tight">Snatched Without Starving</h1>
          <p className="text-xl sm:text-2xl text-gold font-semibold mb-6">Lose or gain your first 10–15 lbs — eating the foods you love</p>
          <p className="text-ivory/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Custom training, done-for-you weekly nutrition, and a real coach checking in on you every single week.
            No starving. No bland food. No doing it alone.
          </p>
          <button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Join The Challenge — $150
          </button>
        </div>
      </section>

      {/* Whats Inside */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Everything Included</p>
          <h2 className="text-3xl font-bold text-center text-white mb-4">What&apos;s Inside</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-12" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {INCLUDED.map((item, i) => (
              <div key={i} className="bg-charcoal border border-smoke rounded-2xl p-6 hover:border-gold/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-5 h-5 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                </div>
                <p className="text-ivory/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for your level */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">Built For You</p>
          <h2 className="text-3xl font-bold text-white mb-4">Matched to your level</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />
          <p className="text-ivory/60 mb-8 max-w-2xl mx-auto leading-relaxed">
            Tell me your goal, your stats, your budget, and where you train — and I build your plan around it.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
              <div key={lvl} className="bg-charcoal border border-smoke rounded-2xl p-6">
                <p className="text-gold font-bold mb-1">{lvl}</p>
                <p className="text-ivory/50 text-sm">Home or gym · lose or gain</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center bg-charcoal border-2 border-gold/30 rounded-3xl p-8 sm:p-10">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">My Guarantee</p>
          <p className="text-white text-lg sm:text-xl font-semibold leading-relaxed">
            Show up and do the work — weekly check-ins, follow your plan, put in your
            workouts. If you still don&apos;t see visible results — your first 5–8 lbs
            down or gained and inches off your waist — I coach you
            <span className="text-gold"> free until you do.*</span>
          </p>
          <p className="text-ivory/50 text-sm mt-4">
            *You just hold up your end: check in every week, follow the plan, do the workouts.
            I go all in for the women who go all in. That&apos;s on me.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 border-t border-smoke">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Founding Cohort</p>
          <h2 className="text-3xl font-bold text-center text-white mb-3">Choose your spot</h2>
          <p className="text-ivory/50 text-sm text-center mb-2">Only 15 spots per cohort · Inner Circle limited to 5 women</p>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />

          {/* Shared contact fields */}
          <div className="max-w-md mx-auto mb-10 space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 bg-obsidian border border-smoke rounded-2xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
            />
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-obsidian border border-smoke rounded-2xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Challenge */}
            <div className="bg-charcoal border border-smoke rounded-3xl p-8 flex flex-col">
              <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">The Challenge</p>
              <div className="mb-2"><span className="text-5xl font-bold text-white">$150</span></div>
              <p className="text-ivory/40 text-sm mb-6">$2,000+ in value · one-time · 6 weeks</p>
              <ul className="text-ivory/60 text-sm space-y-2 mb-8 flex-1">
                <li>• Everything listed above</li>
                <li>• Weekly group check-ins with me</li>
                <li>• The Curve Collective community</li>
              </ul>
              <button
                onClick={() => handleCheckout('snatched-challenge')}
                disabled={loadingSlug !== null || !email}
                className="w-full bg-gold text-obsidian px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingSlug === 'snatched-challenge' ? 'Loading...' : 'Join The Challenge'}
              </button>
            </div>

            {/* Inner Circle */}
            <div className="bg-charcoal border-2 border-gold rounded-3xl p-8 flex flex-col relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-obsidian text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Only 5 spots</span>
              <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">The Inner Circle</p>
              <div className="mb-2"><span className="text-5xl font-bold text-white">$300</span></div>
              <p className="text-ivory/40 text-sm mb-6">Everything + personal coaching · 6 weeks</p>
              <ul className="text-ivory/60 text-sm space-y-2 mb-8 flex-1">
                <li>• Everything in the Challenge</li>
                <li>• Weekly 1:1 video calls with me</li>
                <li>• Direct access between calls</li>
                <li>• Fully custom, weekly-adjusted plans</li>
                <li>• Faith + mindset coaching</li>
              </ul>
              <button
                onClick={() => handleCheckout('snatched-inner-circle')}
                disabled={loadingSlug !== null || !email}
                className="w-full bg-gold text-obsidian px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingSlug === 'snatched-inner-circle' ? 'Loading...' : 'Join The Inner Circle'}
              </button>
            </div>
          </div>
          <p className="text-ivory/30 text-xs mt-6 text-center">Secure payment via Stripe. You&apos;ll create your account and complete your intake right after.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Questions</p>
          <h2 className="text-3xl font-bold text-center text-white mb-4">Frequently Asked</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <button key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full text-left bg-charcoal border border-smoke rounded-2xl p-5 hover:border-gold/40 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">{item.q}</h3>
                  <svg className={`w-4 h-4 text-gold flex-shrink-0 ml-4 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {openFaq === i && <p className="text-ivory/60 text-sm mt-3 leading-relaxed">{item.a}</p>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-smoke">
        <div className="max-w-6xl mx-auto text-center text-sm text-ivory/40">
          &copy; {new Date().getFullYear()} Asa Luke. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
