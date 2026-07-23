'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import HeroVideoBG from '@/components/HeroVideoBG'
import VideoTileRow from '@/components/VideoTileRow'

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
  { q: 'How does the free trial work?', a: "Every plan — App Access, Challenge, and Inner Circle — starts with 14 days free. Cancel anytime during those 14 days and you won't be charged anything. If you don't cancel, your card is billed automatically for the plan you picked once the trial ends." },
  { q: 'What if I want to gain weight, not lose it?', a: 'This is built for both. Your plan is set to your goal — lose or gain your first 10–15 lbs. Most programs only do fat loss; this does either.' },
  { q: "I'm a total beginner. Is this for me?", a: 'Yes. Your training is matched to your level — beginner, intermediate, or advanced — and you can train at home or in the gym.' },
  { q: 'Do I really talk to you, or is it automated?', a: "You talk to me. Every week I personally check in on your progress — it's real coaching, not a chatbot." },
  { q: "What's the difference between App Access, the Challenge, and the Inner Circle?", a: "The app itself — custom workouts, meal plans, daily check-ins, everything — is the same at every tier, starting at $10/mo. The only thing that changes is video time with me: Challenge ($20/mo) gets you 1 video call a month, Inner Circle ($50/mo) gets you a video call every week plus direct access between calls." },
  { q: 'What happens after the 6 weeks?', a: "Challenge and Inner Circle are 6-week coaching cycles. After that, you automatically move down to App Access ($10/mo) — you keep the whole app, you just stop being billed for video time — unless you choose to keep the coaching going." },
]

export default function ChallengePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
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
    <div className="min-h-screen bg-paper">
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
        <HeroVideoBG srcs={['/videos/hero-fitness-4.mp4', '/videos/hero-fitness-2.mp4', '/videos/hero-fitness-1.mp4', '/videos/hero-fitness-3.mp4']} />
        <div className="max-w-3xl mx-auto text-center relative bg-paper/70 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-xl">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">Life-Up Fitness App</p>
          <h1 className="text-4xl sm:text-6xl font-bold text-ink mb-4 tracking-tight">Two things get in your way. This app removes both.</h1>
          <p className="text-xl sm:text-2xl text-gold font-semibold mb-6">No time to figure it out. No willpower left when cravings hit.</p>
          <p className="text-ink/60 mb-8 max-w-2xl mx-auto leading-relaxed">
            Custom training, done-for-you weekly nutrition, daily check-ins — the full app,
            starting at $10/mo. No starving. No bland food. No doing it alone.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-10 text-left max-w-xl mx-auto">
            {[
              { t: 'Custom workouts', d: 'Home or gym, matched to your level' },
              { t: 'Auto-generated meals', d: 'One tap builds your week — tweak anything after' },
              { t: 'Calorie & macro tracking', d: 'Log food in one tap, see where you stand today' },
              { t: 'Daily check-ins', d: '"How are you feeling" — I adjust your day' },
              { t: 'Talk to your coach', d: 'Voice memo me, I hear it, I respond' },
              { t: 'Away-from-home escape plan', d: 'Instant fast-food order, no decision needed' },
              { t: 'Grocery list, budget-aware', d: 'Priced near you, with nearby stores mapped out' },
              { t: 'The Cookbook', d: '25+ recipes, full macros + cost per serving' },
            ].map((f) => (
              <div key={f.t} className="bg-charcoal border border-smoke rounded-xl px-4 py-3">
                <p className="text-white font-semibold text-sm">{f.t}</p>
                <p className="text-ivory/50 text-xs mt-0.5">{f.d}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Try free for 14 days
          </button>
        </div>
      </section>

      {/* Whats Inside */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Everything Included</p>
          <h2 className="text-3xl font-bold text-center text-ink mb-4">What&apos;s Inside</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />
          <div className="relative rounded-2xl overflow-hidden mb-12 aspect-[21/9] max-w-2xl mx-auto">
            <Image src="/images/fitness-photo-2.jpg" alt="Pushing through the work, banded squats outdoors" fill className="object-cover object-[50%_25%]" sizes="(max-width: 768px) 100vw, 672px" />
          </div>
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
          <h2 className="text-3xl font-bold text-ink mb-4">Matched to your level</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />
          <p className="text-ink/60 mb-8 max-w-2xl mx-auto leading-relaxed">
            Tell me your goal, your stats, your budget, and where you train — and I build your plan around it.
          </p>
          <div className="mb-10">
            <VideoTileRow />
          </div>
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

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 border-t border-smoke">
        <div className="max-w-5xl mx-auto">
          <p className="text-center mb-4">
            <span className="inline-block text-gold text-[11px] font-bold tracking-[0.25em] uppercase border border-gold/40 rounded-full px-4 py-1.5 bg-gold/5">
              14-Day Free Trial — Every Plan
            </span>
          </p>
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Simple Pricing</p>
          <h2 className="text-3xl font-bold text-center text-ink mb-3">The app does everything. Video calls are the only upgrade.</h2>
          <p className="text-ink/50 text-sm text-center mb-2 max-w-xl mx-auto">Try any plan free for 14 days. Custom workouts, done-for-you meals, daily check-ins, everything. Cancel anytime — you won&apos;t be charged until your trial ends.</p>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />

          {/* Shared contact fields */}
          <div className="max-w-md mx-auto mb-10 space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 bg-paper border border-smoke rounded-2xl text-ink text-sm placeholder-ink/30 focus:outline-none focus:border-gold transition-colors"
            />
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-paper border border-smoke rounded-2xl text-ink text-sm placeholder-ink/30 focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {/* App */}
            <div className="bg-charcoal border border-smoke rounded-3xl p-8 flex flex-col">
              <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">App Access</p>
              <div className="mb-1"><span className="text-3xl font-bold text-emerald-400">Free</span><span className="text-ivory/40 text-sm"> for 14 days</span></div>
              <div className="mb-2"><span className="text-ivory/40 text-sm">then $10/mo</span></div>
              <p className="text-ivory/40 text-sm mb-6">Everything the app does</p>
              <ul className="text-ivory/60 text-sm space-y-2 mb-8 flex-1">
                <li>• Custom workouts, home or gym</li>
                <li>• The Eat-What-You-Love meal plan</li>
                <li>• Daily check-ins, decisions made for you</li>
                <li>• The Curve Collective community</li>
                <li>• The Menu Cookbook + all bonuses</li>
              </ul>
              <button
                onClick={() => handleCheckout('fitness-app')}
                disabled={loadingSlug !== null || !email}
                className="w-full bg-obsidian border border-gold/40 text-gold px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-colors hover:bg-gold/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingSlug === 'fitness-app' ? 'Loading...' : 'Start your free 14 days'}
              </button>
            </div>

            {/* Challenge */}
            <div className="bg-charcoal border-2 border-gold rounded-3xl p-8 flex flex-col relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-obsidian text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Most Popular</span>
              <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">6-Week Challenge</p>
              <div className="mb-1"><span className="text-3xl font-bold text-emerald-400">Free</span><span className="text-ivory/40 text-sm"> for 14 days</span></div>
              <div className="mb-2"><span className="text-ivory/40 text-sm">then $20/mo</span></div>
              <p className="text-ivory/40 text-sm mb-6">Everything in App Access, plus me on video</p>
              <ul className="text-ivory/60 text-sm space-y-2 mb-8 flex-1">
                <li>• Everything in App Access</li>
                <li>• 1 video call a month with me</li>
                <li>• Weekly check-ins, personally reviewed</li>
              </ul>
              <button
                onClick={() => handleCheckout('fitness-challenge')}
                disabled={loadingSlug !== null || !email}
                className="w-full bg-gold text-obsidian px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingSlug === 'fitness-challenge' ? 'Loading...' : 'Start your free 14 days'}
              </button>
            </div>

            {/* Inner Circle */}
            <div className="bg-charcoal border border-smoke rounded-3xl p-8 flex flex-col">
              <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">Inner Circle</p>
              <div className="mb-1"><span className="text-3xl font-bold text-emerald-400">Free</span><span className="text-ivory/40 text-sm"> for 14 days</span></div>
              <div className="mb-2"><span className="text-ivory/40 text-sm">then $50/mo</span></div>
              <p className="text-ivory/40 text-sm mb-6">Everything, plus me every week — my time is limited here</p>
              <ul className="text-ivory/60 text-sm space-y-2 mb-8 flex-1">
                <li>• Everything in the Challenge</li>
                <li>• Weekly video calls with me</li>
                <li>• Direct access between calls</li>
                <li>• Fully custom, weekly-adjusted plans</li>
                <li>• Faith + mindset coaching</li>
              </ul>
              <button
                onClick={() => handleCheckout('fitness-inner-circle')}
                disabled={loadingSlug !== null || !email}
                className="w-full bg-obsidian border border-gold/40 text-gold px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-colors hover:bg-gold/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingSlug === 'fitness-inner-circle' ? 'Loading...' : 'Start your free 14 days'}
              </button>
            </div>
          </div>
          <p className="text-ink/40 text-xs mt-6 text-center">14 days free on any plan, cancel anytime before your trial ends and you won&apos;t be charged. Secure payment via Stripe. You&apos;ll create your account and complete your intake right after. Challenge and Inner Circle include 6 weeks of coaching — after that you automatically move to App Access ($10/mo) unless you choose to keep the coaching going.</p>
        </div>
      </section>

      {/* Guarantee — sits directly under the pricing/6-Week Challenge section */}
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

    </div>
  )
}
