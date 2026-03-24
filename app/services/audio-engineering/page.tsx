import { createClient } from '@/lib/supabase/server'
import PricingCard from '@/components/PricingCard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Audio Engineering Services — Asa Luke',
  description: 'Professional mixing and mastering for independent artists. 10+ years experience. Starting at $150.',
}

const TIERS = [
  {
    features: [
      '1 track mix & master',
      'Mixing: EQ, compression, effects, reference matching',
      'Delivery: WAV 24-bit + MP3 320kbps, streaming-ready',
      'Support: file prep guide, 2 revisions',
      '48-hour turnaround',
    ],
    guarantee: "Not happy? I'll revise until you are. Full refund if I can't get the sound you want.",
  },
  {
    features: [
      '3-5 tracks mix & master',
      'Mixing: EQ, compression, effects, vocal tuning, reference matching',
      'Consistency: matched sound across all tracks',
      'Delivery: WAV 24-bit + MP3 320kbps, streaming-ready',
      'Release: distribution checklist + release day promo plan',
      'Support: file prep guide, 2 revisions per track',
      '5-day turnaround',
    ],
    guarantee: "Unlimited revisions until you love it. Full refund if I can't match your reference. Plus: 1 free bonus mix if not satisfied.",
  },
  {
    features: [
      '6-12 tracks mix & master',
      'Direction: 1-hour creative direction session',
      'Mixing: EQ, compression, effects, vocal tuning, sound design',
      'Consistency: full project cohesion across every track',
      'Delivery: WAV 24-bit + MP3 320kbps, streaming-ready',
      'Release: distribution checklist, promo plan, pre-save campaign',
      'Sequencing: album track order consultation',
      'Unlimited revisions — 10-day turnaround',
    ],
    guarantee: "100% money-back guarantee, no questions asked. Unlimited revisions. If it doesn't match industry quality, you don't pay. Plus: 2 free bonus mixes if not completely satisfied.",
  },
]

export default async function AudioEngineeringPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .eq('category', 'audio-engineering')
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
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-6">Professional Audio Engineering</p>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 tracking-tight">
            YOUR MUSIC DESERVES A{' '}
            <span className="text-gold">PROFESSIONAL MIX</span>
          </h1>
          <p className="text-lg text-ivory/80 mb-6 max-w-xl mx-auto leading-relaxed">
            10+ years mixing and mastering for independent artists across Hip-Hop, R&B, Pop, Gospel, and more. From singles to full albums.
          </p>
          <p className="text-ivory/60 mb-8">Starting at <span className="text-gold font-bold">$150</span> per track</p>
          <a href="#pricing" className="inline-block bg-gold text-obsidian px-8 py-3 rounded-lg font-semibold hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/20 transition-all hover:-translate-y-0.5">
            See Packages
          </a>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">The Process</p>
          <h2 className="text-3xl font-bold text-center text-white mb-12">What Every Mix Includes</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Mixing', desc: 'EQ, compression, reverb, delay, panning, automation — every element balanced and polished for maximum impact.', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z' },
              { title: 'Mastering', desc: 'Final polish — loudness optimization, stereo widening, and format delivery ready for Spotify, Apple Music, and all platforms.', icon: 'M15.536 8.464a5 5 0 010 7.072M12 9.5l0 5M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728' },
              { title: 'Delivery', desc: 'WAV 24-bit master + MP3 320kbps. Ready to upload and release. Formatted for all streaming platforms.', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
            ].map((item) => (
              <div key={item.title} className="bg-charcoal border border-smoke rounded-xl p-8 hover:border-gold/40 transition-colors">
                <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-ivory/60 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 border-t border-smoke">
        <div className="max-w-6xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Packages</p>
          <h2 className="text-3xl font-bold text-center text-white mb-4">Choose Your Package</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-4" />
          <p className="text-center text-ivory/60 mb-12 max-w-lg mx-auto">From singles to full albums. Every package includes professional mixing, mastering, and fast turnaround.</p>

          <div className="flex flex-wrap justify-center gap-6">
            {products && products.length > 0 ? (
              products.map((product, i) => (
                <PricingCard
                  key={product.id}
                  productId={product.id}
                  name={product.name.replace('Audio Engineering - ', '')}
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

      {/* Genres */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Genres I Work With</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {['Hip-Hop / Rap', 'R&B / Soul', 'Pop', 'Gospel / Christian', 'Electronic / EDM', 'Rock', 'Podcast / Voice-Over', 'Country'].map(g => (
              <span key={g} className="bg-charcoal border border-smoke px-4 py-2 rounded-lg text-ivory/70 text-sm">
                {g}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-charcoal to-[#1a1020] border border-smoke rounded-xl p-10">
          <h3 className="text-2xl font-bold text-white mb-4">Quality Guarantee</h3>
          <p className="text-ivory/70 leading-relaxed mb-6">Every mix comes with revisions included. If I can&apos;t get the sound you want, you don&apos;t pay. Your music is too important to settle.</p>
          <div className="flex flex-wrap justify-center gap-6">
            {['Revisions included', 'Reference matching', 'Money-back guarantee'].map(g => (
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
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Level Up Your Sound?</h2>
          <p className="text-ivory/60 mb-8">Send me your stems and I&apos;ll have your first mix back in 48 hours.</p>
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
