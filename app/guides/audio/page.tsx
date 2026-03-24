import Link from 'next/link'

export const metadata = {
  title: 'Free Release-Ready Mix Checklist — Asa Luke',
  description: 'The complete checklist to get your music release-ready before mixing, during mixing, and before upload.',
}

export default function AudioGuide() {
  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Free Guide</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            The Release-Ready<br /><span className="text-gold">Mix Checklist</span>
          </h1>
          <p className="text-ivory/60 max-w-lg mx-auto">Everything you need to check before, during, and after mixing — so your music sounds professional on every platform. By Asa Luke.</p>
        </div>

        {/* Guide Content */}
        <div className="space-y-8">
          {/* Pre-Mix */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <h2 className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-6">Phase 1: Before You Mix</h2>
            <div className="space-y-4">
              {[
                { title: 'Organize Your Session', desc: 'Label every track clearly (Vocals, Ad-libs, Kick, Snare, etc). Color code by group. Delete unused tracks. A clean session = a clean mix.' },
                { title: 'Gain Stage Everything', desc: 'Set every fader so peaks hit around -18dBFS to -12dBFS. This gives your plugins headroom to work properly. Never clip the master bus before you start.' },
                { title: 'Commit to Your Arrangement', desc: 'Lock in the song structure before mixing. Don\'t be writing and mixing at the same time — it kills momentum and clarity.' },
                { title: 'Reference Track Ready', desc: 'Pick 1-2 released songs that sound like what you want. Import them into your session at matched volume. A/B constantly.' },
                { title: 'Export Stems Correctly', desc: 'If sending to an engineer: export all stems from bar 1, same length, WAV 24-bit, no effects (unless baked-in creative FX). Label them.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-gold/10 border border-gold/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-gold text-xs font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-ivory/50 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* During Mix */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <h2 className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-6">Phase 2: During the Mix</h2>
            <div className="space-y-4">
              {[
                { title: 'Start with Volume Balance', desc: 'Before touching any plugin, get a rough mix using only faders and panning. If it sounds 70% good here, the rest is just polish.' },
                { title: 'EQ Before Compression', desc: 'Cut problem frequencies first (muddiness at 200-400Hz, harshness at 2-4kHz). Then compress to control dynamics. Order matters.' },
                { title: 'Check in Mono', desc: 'If your mix collapses in mono, you have phase issues. Check regularly. Most phone speakers and clubs play in mono.' },
                { title: 'Less is More', desc: 'If you can\'t hear what a plugin is doing, remove it. Every processor should have a clear purpose. 3 plugins doing their job > 15 doing nothing.' },
                { title: 'Take Breaks', desc: 'Your ears fatigue after 45-60 minutes. Take a 10-minute break. Walk around. Come back with fresh ears. This is not optional — it\'s how pros work.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-gold/10 border border-gold/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-gold text-xs font-bold">{i + 6}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-ivory/50 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pre-Release */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <h2 className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-6">Phase 3: Before You Release</h2>
            <div className="space-y-4">
              {[
                { title: 'Master to -14 LUFS', desc: 'Spotify, Apple Music, and YouTube all normalize to around -14 LUFS. Master here for the best playback across all platforms. Louder ≠ better.' },
                { title: 'Export in Multiple Formats', desc: 'WAV 24-bit (archive/distribution), WAV 16-bit 44.1kHz (CD quality), MP3 320kbps (previews/social). Always keep the 24-bit master.' },
                { title: 'Listen on 3+ Systems', desc: 'Car speakers, AirPods, laptop speakers, phone speaker. If it sounds good on all of them, you\'re ready. If not, go back and adjust.' },
                { title: 'Distribution Checklist', desc: 'Upload to DistroKid/TuneCore 2-4 weeks before release date. Set up pre-save links. Prepare cover art (3000x3000px, JPG/PNG). Write your metadata.' },
                { title: 'Promo Plan', desc: 'Teaser clips 2 weeks out. Snippet on stories 1 week out. Release day: post on all platforms, share pre-save link, DM your top supporters personally.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-gold/10 border border-gold/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-gold text-xs font-bold">{i + 11}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-ivory/50 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-3">Want a Professional Mix?</h3>
          <p className="text-ivory/60 mb-8 max-w-md mx-auto">10+ years mixing Hip-Hop, R&B, Pop, Gospel and more. Send me your stems and get your first mix back in 48 hours.</p>
          <Link href="/services/audio-engineering#pricing" className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            View Audio Packages
          </Link>
        </div>

        <p className="text-center text-ivory/20 text-xs mt-10">&copy; {new Date().getFullYear()} Asa Luke. All rights reserved.</p>
      </div>
    </div>
  )
}
