import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-obsidian">

      {/* ── HERO ── */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_45%,rgba(201,168,76,0.06),transparent_70%)]" />

        <div className="relative z-10">
          <h1 className="text-6xl sm:text-8xl font-bold text-white tracking-tight mb-4">
            ASA <span className="text-gold">LUKE</span>
          </h1>

          <p className="text-ivory/70 text-lg sm:text-xl max-w-md mx-auto mb-12 leading-relaxed">
            I edit your content. I mix your music. I build your body.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/services/content-editing"
              className="group relative px-10 py-4 bg-transparent border border-smoke rounded-sm overflow-hidden transition-all hover:border-gold"
            >
              <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 text-sm font-semibold tracking-[0.2em] uppercase text-ivory group-hover:text-obsidian transition-colors">
                Content
              </span>
            </Link>

            <Link
              href="/services/audio-engineering"
              className="group relative px-10 py-4 bg-transparent border border-smoke rounded-sm overflow-hidden transition-all hover:border-gold"
            >
              <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 text-sm font-semibold tracking-[0.2em] uppercase text-ivory group-hover:text-obsidian transition-colors">
                Music
              </span>
            </Link>

            <Link
              href="/#fitness"
              className="group relative px-10 py-4 bg-transparent border border-smoke rounded-sm overflow-hidden transition-all hover:border-gold"
            >
              <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 text-sm font-semibold tracking-[0.2em] uppercase text-ivory group-hover:text-obsidian transition-colors">
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
      <section className="py-32 px-6 border-t border-smoke/50">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
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
              href="/services/content-editing"
              className="inline-block bg-gold text-obsidian px-8 py-3 text-sm font-semibold tracking-wider uppercase hover:bg-gold/90 transition-all hover:-translate-y-0.5"
            >
              View Packages
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">4-12+</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Reels / Month</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">24-72hr</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Turnaround</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">$297</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Starting At</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">100%</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AUDIO ENGINEERING ── */}
      <section className="py-32 px-6 border-t border-smoke/50">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 grid grid-cols-2 gap-3">
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">10+</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Years Experience</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">48hr</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Turnaround</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">$150</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Starting At</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
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
              href="/services/audio-engineering"
              className="inline-block bg-gold text-obsidian px-8 py-3 text-sm font-semibold tracking-wider uppercase hover:bg-gold/90 transition-all hover:-translate-y-0.5"
            >
              View Packages
            </Link>
          </div>
        </div>
      </section>

      {/* ── FITNESS ── */}
      <section id="fitness" className="py-32 px-6 border-t border-smoke/50">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
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
              className="inline-block bg-gold text-obsidian px-8 py-3 text-sm font-semibold tracking-wider uppercase hover:bg-gold/90 transition-all hover:-translate-y-0.5"
            >
              View Program
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">12</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Week Program</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">$29.99</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">One-Time</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">Meals</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Nutrition Guide</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-sm p-6">
              <p className="text-gold text-2xl font-bold mb-1">Lifetime</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Access</p>
            </div>
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
              className="flex items-center justify-center gap-3 bg-charcoal border border-smoke/50 py-4 text-ivory text-sm hover:border-gold hover:text-gold transition-all">
              Instagram — @1AsaLuke
            </a>
            <a href="mailto:info.lifeupventures@gmail.com"
              className="flex items-center justify-center gap-3 bg-charcoal border border-smoke/50 py-4 text-ivory text-sm hover:border-gold hover:text-gold transition-all">
              info.lifeupventures@gmail.com
            </a>
            <a href="tel:+13127214945"
              className="flex items-center justify-center gap-3 bg-charcoal border border-smoke/50 py-4 text-ivory text-sm hover:border-gold hover:text-gold transition-all">
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
