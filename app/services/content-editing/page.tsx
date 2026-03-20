import { createClient } from '@/lib/supabase/server'
import PricingCard from '@/components/PricingCard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Content Editing Services — Asa Luke',
  description: 'Professional short-form video editing for creators and brands. Packages starting at $297/mo.',
}

const TIERS = [
  {
    features: [
      '4 Professionally Edited Reels/Month',
      'Brand color grading on every video',
      'Captions & text overlays',
      'Scroll-stopping hooks (first 2 seconds optimized)',
      'Trending audio recommendations',
      'Optimal posting times for your audience',
      '1 revision per video',
      '72-hour turnaround',
    ],
    guarantee: "If you're not satisfied with your first month, I'll edit 2 extra Reels free.",
  },
  {
    features: [
      '8 Professionally Edited Reels/Month',
      'Brand color grading on every video',
      'Captions & text overlays',
      'Scroll-stopping hooks (first 2 seconds optimized)',
      'Hashtag & posting strategy',
      'Content calendar collaboration',
      'Trending audio recommendations',
      'Optimal posting times for your audience',
      'Cover image design for every Reel',
      'Monthly analytics review (what\'s working & what to adjust)',
      '2 revisions per video',
      '48-hour turnaround',
    ],
    guarantee: "If you're not satisfied with your first month, I'll edit 4 extra Reels free. Plus: if your average views don't increase within 60 days, your next month is 50% off.",
  },
  {
    features: [
      '12+ Professionally Edited Reels/Month',
      'Brand color grading on every video',
      'Captions & text overlays',
      'Scroll-stopping hooks (first 2 seconds optimized)',
      'Hashtag & posting strategy',
      'Monthly content strategy session (1 hour)',
      'Caption writing for all posts',
      'Monthly content calendar',
      'Raw footage shot list (I tell you what to film)',
      'Trending audio recommendations',
      'Optimal posting times for your audience',
      'Cover image design for every Reel',
      'Monthly analytics review + growth report',
      'Competitor content analysis',
      'Priority DM support (same-day replies)',
      'Unlimited revisions',
      '24-hour priority turnaround',
    ],
    guarantee: "100% satisfaction guarantee — if you're not happy with your first month, get a full refund, no questions asked. Plus: if your average views don't increase within 60 days, your next month is free. And: 4 bonus Reels if you don't see measurable growth in 30 days.",
  },
]

const VALUE_STACK = [
  { name: '12+ Professionally Edited Reels Per Month', desc: '3+ scroll-stopping Reels per week, edited with cinematic aesthetic and brand color grading.', value: '$2,400' },
  { name: 'Monthly Content Strategy Session (1 Hour)', desc: 'We map out your content for the month together. You\'ll know exactly what to post and why.', value: '$300' },
  { name: 'Caption Writing for All 12+ Posts', desc: 'Scroll-stopping hooks and CTAs written for every single post. You don\'t touch a keyboard.', value: '$360' },
  { name: 'Monthly Content Calendar', desc: 'Your entire month planned out — what posts, what day, what pillar. No guessing.', value: '$200' },
  { name: 'Custom Brand Color Grading', desc: 'Every video matches your brand identity. Professional, cohesive, recognizable feed.', value: '$150' },
  { name: 'Hashtag & Posting Strategy', desc: 'Optimized for discovery. Right hashtags, right times, right platforms.', value: '$150' },
  { name: 'Unlimited Revisions', desc: 'Not happy with an edit? We revise until you are. No limits, no extra charges.', value: '$200' },
  { name: '24-Hour Priority Turnaround', desc: 'Full Engine clients get priority. Your content is delivered first, always.', value: '$250' },
]

const BONUSES = [
  { name: 'Raw Footage Shot List', desc: 'I tell you exactly what to film on your phone each week. Removes the biggest bottleneck: "I don\'t know what to film."', value: '$250' },
  { name: 'First Month: 1 Free Bonus Reel (13+ Total)', desc: 'Your first month you get an extra Reel on me. Start strong, build momentum.', value: '$200' },
]

export default async function ContentEditingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .eq('category', 'content-editing')
    .order('sort_order', { ascending: true })

  let purchasedIds: Set<string> = new Set()
  if (user && products?.length) {
    const { data: purchases } = await supabase
      .from('purchases')
      .select('product_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
    purchasedIds = new Set((purchases || []).map(p => p.product_id))
  }

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(201,168,76,0.08),transparent_70%)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-6">Content Editing for Creators & Brands</p>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 tracking-tight">
            YOUR CONTENT SHOULD{' '}
            <span className="text-gold">STOP THE SCROLL</span>
          </h1>
          <p className="text-lg text-ivory/80 mb-6 max-w-xl mx-auto leading-relaxed">
            Professional content editing for artists, creators, and businesses. Strategy, editing, captions, brand grading — everything you need to grow. Done for you.
          </p>
          <p className="text-ivory/60 mb-8">Packages starting at <span className="text-gold font-bold">$297/month</span> &mdash; No contract, cancel anytime</p>
          <a href="#pricing" className="inline-block bg-gold text-obsidian px-8 py-3 rounded-lg font-semibold hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/20 transition-all hover:-translate-y-0.5">
            See Packages
          </a>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Choose Your Package</p>
          <h2 className="text-3xl font-bold text-center text-white mb-4">Three Ways to Level Up</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-4" />
          <p className="text-center text-ivory/60 mb-12 max-w-lg mx-auto">Pick the package that fits your content goals. Every tier includes professional editing, brand color grading, and fast turnaround.</p>

          <div className="flex flex-wrap justify-center gap-6">
            {products && products.length > 0 ? (
              products.map((product, i) => (
                <PricingCard
                  key={product.id}
                  productId={product.id}
                  name={product.name.replace('Content Editing - ', '')}
                  description={product.description}
                  price={product.price}
                  purchased={purchasedIds.has(product.id)}
                  category={product.category}
                  featured={i === 1}
                  features={TIERS[i]?.features}
                  guarantee={TIERS[i]?.guarantee}
                />
              ))
            ) : (
              <div className="text-ivory/40">Products coming soon — DM @1AsaLuke to get started now.</div>
            )}
          </div>
        </div>
      </section>

      {/* Full Engine Value Stack */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-3xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Full Engine Breakdown</p>
          <h2 className="text-3xl font-bold text-center text-white mb-4">What&apos;s in the $997 Package</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-4" />
          <p className="text-center text-ivory/60 mb-12 max-w-lg mx-auto">Every piece of your content — strategized, edited, captioned, and scheduled. You just show up and film.</p>

          <div className="space-y-3">
            {VALUE_STACK.map((item, i) => (
              <div key={i} className="flex items-start gap-4 bg-charcoal border border-smoke rounded-lg p-5 hover:border-gold/40 transition-colors">
                <div className="w-7 h-7 bg-gold text-obsidian rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-sm mb-1">{item.name}</h4>
                  <p className="text-ivory/60 text-sm">{item.desc}</p>
                </div>
                <span className="text-gold font-semibold text-sm whitespace-nowrap">{item.value}</span>
              </div>
            ))}

            {BONUSES.map((item, i) => (
              <div key={`b${i}`} className="flex items-start gap-4 bg-gradient-to-r from-charcoal to-gold/5 border border-gold/30 rounded-lg p-5">
                <div className="w-7 h-7 border-2 border-gold text-gold rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                  B{i + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-sm mb-1">{item.name}</h4>
                  <p className="text-ivory/60 text-sm">{item.desc}</p>
                </div>
                <span className="text-gold font-semibold text-sm whitespace-nowrap">{item.value}</span>
              </div>
            ))}

            <div className="flex justify-between items-center bg-gold/10 border-2 border-gold rounded-lg p-5 mt-4">
              <h3 className="text-white font-bold text-lg">Total Value</h3>
              <span className="text-gold font-bold text-2xl">$4,460</span>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">How This Compares</p>
          <h2 className="text-3xl font-bold text-center text-white mb-12">Agencies vs Freelancers vs Me</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-charcoal border border-smoke rounded-lg p-6 text-center">
              <h4 className="text-ivory/60 text-xs tracking-widest uppercase mb-4">Agencies</h4>
              <ul className="text-left space-y-2 text-sm text-ivory/60 mb-4">
                <li>8-12 Reels/month</li>
                <li>Strategy sometimes</li>
                <li>Captions sometimes</li>
                <li>1-2 revision rounds</li>
                <li>1-2 week turnaround</li>
              </ul>
              <p className="text-ivory font-bold text-lg">$2,500-$5,000/mo</p>
            </div>
            <div className="bg-charcoal border border-smoke rounded-lg p-6 text-center">
              <h4 className="text-ivory/60 text-xs tracking-widest uppercase mb-4">Freelancers</h4>
              <ul className="text-left space-y-2 text-sm text-ivory/60 mb-4">
                <li>4-8 Reels/month</li>
                <li>No strategy</li>
                <li>No captions</li>
                <li>1 revision round</li>
                <li>3-7 day turnaround</li>
              </ul>
              <p className="text-ivory font-bold text-lg">$800-$2,000/mo</p>
            </div>
            <div className="bg-gold/5 border-2 border-gold rounded-lg p-6 text-center">
              <h4 className="text-gold text-xs tracking-widest uppercase mb-4">Content Engine</h4>
              <ul className="text-left space-y-2 text-sm text-white mb-4">
                <li>4-12+ Reels/month</li>
                <li>Strategy sessions included</li>
                <li>Captions written for you</li>
                <li>Up to unlimited revisions</li>
                <li>24-48 hour turnaround</li>
              </ul>
              <p className="text-gold font-bold text-lg">$297-$997/mo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-charcoal to-[#1a1020] border border-smoke rounded-xl p-10">
          <h3 className="text-2xl font-bold text-white mb-4">Zero Risk Guarantee</h3>
          <p className="text-ivory/70 leading-relaxed mb-6">No long-term contract. Month to month. Cancel anytime. If you don&apos;t see growth in your first 30 days, I&apos;ll edit 4 extra Reels for free.</p>
          <div className="flex flex-wrap justify-center gap-6">
            {['No contract', 'Cancel anytime', '30-day growth guarantee'].map(g => (
              <div key={g} className="flex items-center gap-2 text-gold text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {g}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Level Up Your Content?</h2>
          <p className="text-ivory/60 mb-8">Limited spots each month. Reach out now to lock yours in.</p>
          <a
            href="https://instagram.com/1AsaLuke"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gold text-obsidian px-8 py-3 rounded-lg font-semibold hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/20 transition-all"
          >
            Get Started — DM @1AsaLuke
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-smoke">
        <div className="max-w-6xl mx-auto text-center text-sm text-ivory/40">
          &copy; {new Date().getFullYear()} Asa Luke. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
