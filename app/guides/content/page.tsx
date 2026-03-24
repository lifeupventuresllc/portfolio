import Link from 'next/link'

export const metadata = {
  title: 'Free Content Creator Blueprint — Asa Luke',
  description: 'The 7-step system to create scroll-stopping Reels that grow your audience.',
}

export default function ContentGuide() {
  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Free Guide</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            The Content Creator<br /><span className="text-gold">Blueprint</span>
          </h1>
          <p className="text-ivory/60 max-w-lg mx-auto">7 steps to create scroll-stopping Reels that actually grow your audience. By Asa Luke.</p>
        </div>

        {/* Guide Content */}
        <div className="space-y-8">
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">1</div>
              <h2 className="text-xl font-bold text-white">Hook in the First 0.5 Seconds</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed mb-4">The algorithm decides your fate in half a second. Your hook needs to create an open loop — a question, a bold claim, or a visual pattern interrupt that forces the viewer to stay.</p>
            <div className="bg-obsidian rounded-xl p-4 border border-smoke/50">
              <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">Hook Formulas That Work</p>
              <ul className="text-ivory/50 text-sm space-y-1">
                <li>&bull; &quot;Stop scrolling if you [target audience]...&quot;</li>
                <li>&bull; &quot;Nobody talks about this but...&quot;</li>
                <li>&bull; &quot;Here&apos;s why your [content type] isn&apos;t working...&quot;</li>
                <li>&bull; Start with the end result first (before/after)</li>
              </ul>
            </div>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">2</div>
              <h2 className="text-xl font-bold text-white">Film in Natural Light</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed mb-4">You don&apos;t need expensive gear. Face a window during golden hour (first/last hour of sunlight). The soft, warm light makes any phone camera look professional.</p>
            <div className="bg-obsidian rounded-xl p-4 border border-smoke/50">
              <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">Quick Setup</p>
              <ul className="text-ivory/50 text-sm space-y-1">
                <li>&bull; Face the window — never have it behind you</li>
                <li>&bull; Shoot at 4K 30fps for quality + flexibility</li>
                <li>&bull; Clean your lens (seriously — it makes a difference)</li>
                <li>&bull; Use a $15 tripod or stack books — stability matters</li>
              </ul>
            </div>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">3</div>
              <h2 className="text-xl font-bold text-white">The 3-Pillar Content Strategy</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed mb-4">Every successful creator posts 3 types of content in rotation. This keeps your feed diverse while building authority and connection.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-obsidian rounded-xl p-4 border border-smoke/50">
                <p className="text-gold font-bold text-sm mb-1">Educate</p>
                <p className="text-ivory/50 text-xs">Tips, tutorials, how-tos. This builds authority.</p>
              </div>
              <div className="bg-obsidian rounded-xl p-4 border border-smoke/50">
                <p className="text-gold font-bold text-sm mb-1">Entertain</p>
                <p className="text-ivory/50 text-xs">Trends, humor, relatable moments. This gets reach.</p>
              </div>
              <div className="bg-obsidian rounded-xl p-4 border border-smoke/50">
                <p className="text-gold font-bold text-sm mb-1">Connect</p>
                <p className="text-ivory/50 text-xs">Behind-the-scenes, stories, vulnerability. This builds loyalty.</p>
              </div>
            </div>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">4</div>
              <h2 className="text-xl font-bold text-white">Caption = Second Hook</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed">Your caption should re-hook viewers who paused, give context, and end with a clear CTA. Format: bold first line, value in the middle, CTA at the end. Always ask a question or give a command — &quot;Save this for later&quot;, &quot;Tag someone who needs this&quot;, &quot;Follow for part 2.&quot;</p>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">5</div>
              <h2 className="text-xl font-bold text-white">Post at Peak Hours</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed mb-4">Timing matters. Post when your audience is already on the app.</p>
            <div className="bg-obsidian rounded-xl p-4 border border-smoke/50">
              <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">Best Times (General)</p>
              <ul className="text-ivory/50 text-sm space-y-1">
                <li>&bull; Weekdays: 7-9am, 12-1pm, 5-7pm</li>
                <li>&bull; Weekends: 9-11am, 7-9pm</li>
                <li>&bull; Check your own analytics — Insights &gt; Audience &gt; Most Active Times</li>
              </ul>
            </div>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">6</div>
              <h2 className="text-xl font-bold text-white">Hashtag Strategy</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed">Use 5-15 hashtags per post. Mix: 3 broad (1M+), 5 mid-range (100K-1M), 5 niche (under 100K). Rotate sets weekly. Save 5 hashtag groups in your notes app so you never waste time searching.</p>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">7</div>
              <h2 className="text-xl font-bold text-white">Optimize Your Bio for Conversions</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed">Your bio is your storefront. Line 1: What you do. Line 2: Who you do it for. Line 3: Social proof or CTA. Link: One link that matters most (link-in-bio tool if you need multiple). Remove anything that doesn&apos;t serve the sale.</p>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-3">Want Me to Do All This For You?</h3>
          <p className="text-ivory/60 mb-8 max-w-md mx-auto">I edit 4-12+ Reels per month for creators and brands. Strategy, editing, captions — everything above, done for you.</p>
          <Link href="/services/content-editing#pricing" className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            View Content Packages
          </Link>
        </div>

        <p className="text-center text-ivory/20 text-xs mt-10">&copy; {new Date().getFullYear()} Asa Luke. All rights reserved.</p>
      </div>
    </div>
  )
}
