'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import HeroVideoBG from '@/components/HeroVideoBG'

const WHATS_INSIDE = [
  {
    title: '15 Core Recipes',
    desc: 'Under 30 min, under 8 ingredients, macro breakdown + cost per serving',
  },
  {
    title: 'Weekly Meal Plan',
    desc: '6 days mapped out with daily macros',
  },
  {
    title: 'Budget Grocery Lists',
    desc: 'Organized by store section, under $75/week',
  },
  {
    title: 'Protein Cheat Sheet',
    desc: 'Top 20 cheapest protein sources ranked',
  },
  {
    title: 'Prep Day Playbook',
    desc: '2-hour timed cook session, step by step',
  },
  {
    title: 'Budget Tips',
    desc: 'Substitutions that save money without losing protein',
  },
]

const FAQ = [
  {
    q: 'Is this a subscription?',
    a: 'No, one-time purchase. Download and keep forever.',
  },
  {
    q: 'Do I need a food scale?',
    a: 'No. Everything measured in cups, tablespoons, and ounces.',
  },
  {
    q: "What if I'm vegetarian?",
    a: 'Most recipes use chicken, beef, or turkey. The cheat sheet includes plant-based options like lentils, beans, and tofu.',
  },
  {
    q: 'Can I adjust portions?',
    a: 'Yes. The system works for any calorie target. Adjust portions up or down based on your size.',
  },
]

export default function ProteinBudgetSystemPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <ProteinBudgetSystemContent />
    </Suspense>
  )
}

function ProteinBudgetSystemContent() {
  const searchParams = useSearchParams()
  const [checkoutEmail, setCheckoutEmail] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showCanceled, setShowCanceled] = useState(false)

  useEffect(() => {
    if (searchParams.get('success') === 'true') setShowSuccess(true)
    if (searchParams.get('canceled') === 'true') setShowCanceled(true)
  }, [searchParams])

  async function handleCheckout() {
    if (!checkoutEmail) return
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageSlug: 'protein-budget-system', email: checkoutEmail }),
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
    setCheckoutLoading(false)
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Success / Canceled banners */}
      {showSuccess && (
        <div className="fixed top-0 inset-x-0 z-50 bg-green-600 text-white text-center py-4 px-4">
          <p className="font-semibold">Payment successful! Check your email for the download link.</p>
          <button onClick={() => setShowSuccess(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-xl">&times;</button>
        </div>
      )}
      {showCanceled && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-600/90 text-white text-center py-4 px-4">
          <p className="font-semibold">Checkout canceled. No charge was made.</p>
          <button onClick={() => setShowCanceled(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-xl">&times;</button>
        </div>
      )}

      {/* ═══ THE APP — leads with what it solves, not the offer ═══ */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden border-b border-smoke">
        <HeroVideoBG srcs={['/videos/hero-fitness-5.mp4', '/videos/hero-fitness-3.mp4', '/videos/hero-fitness-4.mp4', '/videos/hero-fitness-2.mp4', '/videos/hero-fitness-1.mp4']} />
        <div className="max-w-3xl mx-auto text-center relative bg-paper/70 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-xl">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
            Life-Up Fitness App
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold text-ink mb-4 tracking-tight">
            Two things get in the way of your body. This app removes both.
          </h1>
          <p className="text-xl sm:text-2xl text-gold font-semibold mb-6">
            No time to figure it out. No willpower left when cravings hit.
          </p>
          <p className="text-ink/60 mb-8 max-w-2xl mx-auto leading-relaxed">
            Every workout, every meal, every decision — already made for you. You just show up.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-10 text-left">
            {[
              { t: 'Sculpt Sessions', d: 'Custom workouts — home or gym, matched to your level' },
              { t: 'Fuel, Figured Out', d: 'Auto-generated meals — one tap builds your whole week, tweak anything after' },
              { t: 'Fast-Food Fix', d: 'Away-from-home escape plan — instant order, no decision needed' },
              { t: 'Coach On Call', d: 'Talk to your coach — voice memo me, I hear it, I respond' },
              { t: 'Macros, Mapped Out', d: 'Calorie & macro tracking — log food in one tap, see exactly where you stand today' },
              { t: 'Budget, Bagged', d: 'Grocery list, budget-aware — priced near you, with nearby stores mapped out' },
              { t: 'Progress, Proven', d: 'Badges, streaks, weekly photos — see it add up' },
              { t: 'The Menu — Free Forever', d: '25+ cookbook recipes with full macros + cost per serving, included at every tier' },
              { t: 'The Curve Collective', d: "Community of women doing this alongside you" },
            ].map((f) => (
              <div key={f.t} className="bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-4">
                <p className="text-white font-semibold text-sm">{f.t}</p>
                <p className="text-ivory/50 text-xs mt-1">{f.d}</p>
              </div>
            ))}
          </div>
          <a
            href="/challenge"
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Try free for 14 days — from $10/mo after →
          </a>
          <p className="text-ink/40 text-xs mt-6">Prefer to start smaller? The cookbook &amp; budget system are below.</p>
        </div>
      </section>

      {/* Hero */}
      <section className="relative pt-20 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(201,168,76,0.08),transparent_70%)]" />
        <div className="max-w-3xl mx-auto text-center relative">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
            Digital Product
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-ink mb-4 tracking-tight">
            The Protein Budget System
          </h2>
          <p className="text-xl sm:text-2xl text-gold font-semibold mb-6">
            Hit 120g+ protein daily on under $75/week
          </p>
          <p className="text-ink/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            15 macro-friendly recipes, a complete weekly meal plan, budget grocery lists, and a
            2-hour prep day playbook. Everything you need — one download.
          </p>
          <button
            onClick={() =>
              document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Get The System — $27
          </button>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
            The Problem
          </p>
          <p className="text-ink/80 text-lg leading-relaxed">
            You know you need more protein. But groceries are expensive, meal prep feels
            overwhelming, and every app just tracks what you already ate instead of telling you what
            to eat.
          </p>
        </div>
      </section>

      {/* What's Inside */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">
            Everything Included
          </p>
          <h2 className="text-3xl font-bold text-center text-ink mb-4">
            What&apos;s Inside
          </h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-12" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHATS_INSIDE.map((item, i) => (
              <div
                key={i}
                className="bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <svg
                    className="w-5 h-5 text-gold flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                </div>
                <p className="text-ivory/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Price + Checkout */}
      <section id="checkout" className="py-20 px-4 border-t border-smoke">
        <div className="max-w-xl mx-auto">
          <div className="bg-charcoal border-2 border-gold/30 rounded-3xl p-8 sm:p-10 text-center">
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
              One-Time Purchase
            </p>
            <div className="mb-4">
              <span className="text-5xl font-bold text-gold">$27</span>
            </div>
            <p className="text-ivory/60 text-sm mb-8 leading-relaxed">
              Less than a single week of meal delivery. Covers every week after.
            </p>

            <div className="max-w-sm mx-auto">
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Your email"
                  value={checkoutEmail}
                  onChange={(e) => setCheckoutEmail(e.target.value)}
                  className="flex-1 px-5 py-4 bg-obsidian border border-smoke rounded-2xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                />
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || !checkoutEmail}
                  className="bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {checkoutLoading ? 'Loading...' : 'Get It — $27'}
                </button>
              </div>
              <p className="text-ivory/30 text-xs mt-3 text-center">
                Instant download. Secure payment via Stripe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/* THE MENU — $50 PRODUCT                */}
      {/* ═══════════════════════════════════════ */}

      {/* Menu Hero */}
      <section id="menu" className="relative py-20 px-4 border-t border-smoke overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(201,168,76,0.08),transparent_70%)]" />
        <div className="max-w-3xl mx-auto text-center relative">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
            Digital Product
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-ink mb-4 tracking-tight">
            The Menu — Complete Cookbook
          </h2>
          <p className="text-xl sm:text-2xl text-gold font-semibold mb-6">
            25 macro-friendly recipes organized by Breakfast, Lunch, and Dinner
          </p>
          <p className="text-ink/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Each recipe includes ingredients, step-by-step directions, macro breakdown, and cost per
            serving. Plus 4 snack options and 10 high-protein desserts. Swipeable, mobile-friendly,
            and constantly updated.
          </p>
          <button
            onClick={() =>
              document.getElementById('menu-checkout')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Get The Menu — $25.99
          </button>
        </div>
      </section>

      {/* Menu — What's Inside */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">
            Everything Included
          </p>
          <h2 className="text-3xl font-bold text-center text-ink mb-4">
            What&apos;s Inside The Menu
          </h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-12" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: '8 Breakfast Recipes', desc: 'High-protein starts to your day with full macros and cost per serving' },
              { title: '9 Lunch Recipes', desc: 'Quick, macro-friendly lunches you can meal prep or cook fresh' },
              { title: '12 Dinner Recipes', desc: 'Filling dinners with step-by-step directions and ingredient lists' },
              { title: '4 Snack Options', desc: 'Easy high-protein snacks to hit your daily target' },
              { title: '10 Desserts', desc: 'Skillet cookies, cheesecake bowls, cookie doughs — all macro-friendly' },
              { title: 'Sauce Swap Guide', desc: 'Switch up flavors on any recipe without changing the macros' },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <svg
                    className="w-5 h-5 text-gold flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                </div>
                <p className="text-ivory/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Menu — Price + Checkout */}
      <section id="menu-checkout" className="py-20 px-4 border-t border-smoke">
        <div className="max-w-xl mx-auto">
          <div className="bg-charcoal border-2 border-gold/30 rounded-3xl p-8 sm:p-10 text-center">
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
              One-Time Purchase
            </p>
            <div className="mb-4">
              <span className="text-5xl font-bold text-gold">$25.99</span>
            </div>
            <p className="text-ivory/60 text-sm mb-8 leading-relaxed">
              25 recipes, full macros, cost per serving, desserts included. Buy once, keep forever.
            </p>

            <div className="max-w-sm mx-auto">
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Your email"
                  value={checkoutEmail}
                  onChange={(e) => setCheckoutEmail(e.target.value)}
                  className="flex-1 px-5 py-4 bg-obsidian border border-smoke rounded-2xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                />
                <button
                  onClick={async () => {
                    if (!checkoutEmail) return
                    setCheckoutLoading(true)
                    try {
                      const res = await fetch('/api/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ packageSlug: 'the-menu-cookbook', email: checkoutEmail }),
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
                    setCheckoutLoading(false)
                  }}
                  disabled={checkoutLoading || !checkoutEmail}
                  className="bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {checkoutLoading ? 'Loading...' : 'Get It — $25.99'}
                </button>
              </div>
              <p className="text-ivory/30 text-xs mt-3 text-center">
                Instant download. Secure payment via Stripe.
              </p>
              <a
                href="/the-menu.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-gold text-sm font-semibold mt-4 underline underline-offset-4 hover:text-gold/80 transition-colors"
              >
                Preview The Menu before buying
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">
            Questions
          </p>
          <h2 className="text-3xl font-bold text-center text-ink mb-4">
            Frequently Asked
          </h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">{item.q}</h3>
                  <svg
                    className={`w-4 h-4 text-gold flex-shrink-0 ml-4 transition-transform duration-300 ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <polyline
                      points="6 9 12 15 18 9"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {openFaq === i && (
                  <p className="text-ivory/60 text-sm mt-3 leading-relaxed">{item.a}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-ink mb-4">
            Stop Guessing. Start Eating.
          </h2>
          <p className="text-ink/60 mb-8">
            One system. Every meal planned. Every dollar accounted for.
          </p>
          <button
            onClick={() =>
              document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Get The System — $27
          </button>
        </div>
      </section>

    </div>
  )
}
