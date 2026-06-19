'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

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
    <Suspense fallback={<div className="min-h-screen bg-obsidian" />}>
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
    <div className="min-h-screen bg-obsidian">
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

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(201,168,76,0.08),transparent_70%)]" />
        <div className="max-w-3xl mx-auto text-center relative">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
            Digital Product
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            The Protein Budget System
          </h1>
          <p className="text-xl sm:text-2xl text-gold font-semibold mb-6">
            Hit 120g+ protein daily on under $75/week
          </p>
          <p className="text-ivory/60 mb-10 max-w-2xl mx-auto leading-relaxed">
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
          <p className="text-ivory/70 text-lg leading-relaxed">
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
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            What&apos;s Inside
          </h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-12" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHATS_INSIDE.map((item, i) => (
              <div
                key={i}
                className="bg-charcoal border border-smoke rounded-2xl p-6 hover:border-gold/40 transition-colors"
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
