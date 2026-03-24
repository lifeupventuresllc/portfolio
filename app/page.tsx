import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-obsidian">

      {/* ── HERO ── */}
      <section className="min-h-[100vh] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_45%,rgba(201,168,76,0.06),transparent_70%)]" />

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
            ASA <span className="text-gold">LUKE</span>
          </h1>

          <p className="text-ivory text-xl sm:text-2xl max-w-xl mx-auto mb-16 leading-relaxed font-medium">
            I edit your content. I mix your music. I build your body.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center" style={{ perspective: '800px' }}>
            <Link
              href="/services/content-editing#pricing"
              className="group relative px-14 py-6 bg-charcoal/80 border border-smoke rounded-2xl overflow-hidden transition-all duration-500 hover:border-gold hover:scale-110 hover:-translate-y-3 hover:shadow-2xl hover:shadow-gold/20"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-gold to-gold/80 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative z-10 text-lg font-bold tracking-[0.2em] uppercase text-ivory group-hover:text-obsidian transition-colors duration-300">
                Content
              </span>
            </Link>

            <Link
              href="/services/audio-engineering#pricing"
              className="group relative px-14 py-6 bg-charcoal/80 border border-smoke rounded-2xl overflow-hidden transition-all duration-500 hover:border-gold hover:scale-110 hover:-translate-y-3 hover:shadow-2xl hover:shadow-gold/20"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-gold to-gold/80 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative z-10 text-lg font-bold tracking-[0.2em] uppercase text-ivory group-hover:text-obsidian transition-colors duration-300">
                Music
              </span>
            </Link>

            <Link
              href="/#fitness"
              className="group relative px-14 py-6 bg-charcoal/80 border border-smoke rounded-2xl overflow-hidden transition-all duration-500 hover:border-gold hover:scale-110 hover:-translate-y-3 hover:shadow-2xl hover:shadow-gold/20"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-gold to-gold/80 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative z-10 text-lg font-bold tracking-[0.2em] uppercase text-ivory group-hover:text-obsidian transition-colors duration-300">
                Fitness
              </span>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 text-ivory/20 text-xs tracking-[0.3em] uppercase animate-pulse">
          Scroll
        </div>
      </section>

      {/* ── CONTENT EDITING ── */}
      <section className="py-36 px-6 border-t border-smoke/50">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div>
            <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Content Editing</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
              Your content,<br />professionally edited.
            </h2>
            <p className="text-ivory/50 leading-relaxed mb-8">
              Short-form video editing for creators and brands. Hooks, captions,
              color grading, strategy — done for you. You film, I handle the rest.
            </p>
            <Link
              href="/services/content-editing#pricing"
              className="inline-block bg-gold text-obsidian px-8 py-3 text-sm font-semibold tracking-wider uppercase rounded-xl hover:bg-gold/90 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/20"
            >
              View Packages
            </Link>
            <br />
            <Link href="/services/content-editing" className="inline-block text-gold/60 text-xs tracking-wider uppercase mt-3 hover:text-gold transition-colors">
              Learn more &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-charcoal border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">4-12+</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Reels / Month</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">24-72hr</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Turnaround</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">$297</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Starting At</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">100%</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AUDIO ENGINEERING ── */}
      <section className="py-36 px-6 border-t border-smoke/50 bg-charcoal/40">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div className="order-2 md:order-1 grid grid-cols-2 gap-3">
            <div className="bg-obsidian border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">10+</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Years Experience</p>
            </div>
            <div className="bg-obsidian border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">48hr</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Turnaround</p>
            </div>
            <div className="bg-obsidian border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">$150</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Starting At</p>
            </div>
            <div className="bg-obsidian border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">WAV</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">24-Bit Delivery</p>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Audio Engineering</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
              Your music,<br />professionally mixed.
            </h2>
            <p className="text-ivory/50 leading-relaxed mb-8">
              Mixing and mastering for independent artists. Hip-Hop, R&B, Pop, Gospel —
              10+ years behind the board. Singles to full albums.
            </p>
            <Link
              href="/services/audio-engineering#pricing"
              className="inline-block bg-gold text-obsidian px-8 py-3 text-sm font-semibold tracking-wider uppercase rounded-xl hover:bg-gold/90 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/20"
            >
              View Packages
            </Link>
            <br />
            <Link href="/services/audio-engineering" className="inline-block text-gold/60 text-xs tracking-wider uppercase mt-3 hover:text-gold transition-colors">
              Learn more &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── FITNESS ── */}
      <section id="fitness" className="py-36 px-6 border-t border-smoke/50">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div>
            <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Fitness</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
              Your body,<br />transformed.
            </h2>
            <p className="text-ivory/50 leading-relaxed mb-8">
              A complete 12-week fitness program. Structured workouts, nutrition guidance,
              progress tracking. No guesswork — just results.
            </p>
            <Link
              href="/services/fitness"
              className="inline-block bg-gold text-obsidian px-8 py-3 text-sm font-semibold tracking-wider uppercase rounded-xl hover:bg-gold/90 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/20"
            >
              View Program
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-charcoal border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">12</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Week Program</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">$29.99</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">One-Time</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">Meals</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Nutrition Guide</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
              <p className="text-gold text-2xl font-bold mb-1">Lifetime</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Access</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── LISTEN ── */}
      <section className="py-24 px-6 border-t border-smoke/50 bg-charcoal/40">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-3">Listen</p>
          <h2 className="text-2xl font-bold text-white mb-8">Find Me on These Platforms</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://open.spotify.com/search/Asa%20Luke" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-smoke/50 text-ivory/60 text-sm hover:border-gold hover:text-gold transition-all duration-300">
              Spotify
            </a>
            <a href="https://music.apple.com/search?term=Asa+Luke" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-smoke/50 text-ivory/60 text-sm hover:border-gold hover:text-gold transition-all duration-300">
              Apple Music
            </a>
            <a href="https://soundcloud.com/search?q=asa%20luke" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-smoke/50 text-ivory/60 text-sm hover:border-gold hover:text-gold transition-all duration-300">
              SoundCloud
            </a>
            <a href="https://music.youtube.com/search?q=Asa+Luke" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-smoke/50 text-ivory/60 text-sm hover:border-gold hover:text-gold transition-all duration-300">
              YouTube Music
            </a>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="py-24 px-6 border-t border-smoke/50">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Let&apos;s work.</h2>
          <p className="text-ivory/40 text-sm mb-10">DM me or reach out below.</p>

          <div className="flex flex-col gap-3 mb-10">
            <a href="https://instagram.com/1AsaLuke" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-charcoal border border-smoke/50 py-4 rounded-xl text-ivory text-sm hover:border-gold hover:text-gold transition-all duration-300">
              Instagram — @1AsaLuke
            </a>
            <a href="mailto:info.lifeupventures@gmail.com"
              className="flex items-center justify-center gap-3 bg-charcoal border border-smoke/50 py-4 rounded-xl text-ivory text-sm hover:border-gold hover:text-gold transition-all duration-300">
              info.lifeupventures@gmail.com
            </a>
            <a href="tel:+13127214945"
              className="flex items-center justify-center gap-3 bg-charcoal border border-smoke/50 py-4 rounded-xl text-ivory text-sm hover:border-gold hover:text-gold transition-all duration-300">
              312-721-4945
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 border-t border-smoke/30">
        <div className="max-w-6xl mx-auto text-center text-xs text-ivory/20 tracking-wider">
          &copy; {new Date().getFullYear()} ASA LUKE. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  )
}
