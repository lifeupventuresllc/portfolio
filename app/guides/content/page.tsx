import Link from 'next/link'

export const metadata = {
  title: 'Free Content Creator Blueprint + AI Prompt — Asa Luke',
  description: 'The 7-step system to create scroll-stopping Reels, plus an AI prompt that writes your captions, on-screen text, and headlines.',
}

export default function ContentGuide() {
  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Free Guide + AI Prompt</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            The Content Creator<br /><span className="text-gold">Blueprint</span>
          </h1>
          <p className="text-ivory/60 max-w-lg mx-auto">7 steps to create scroll-stopping Reels + a ready-to-use AI prompt that writes your captions, on-screen text, and headlines. By Asa Luke.</p>
        </div>

        {/* AI Prompt Section — THE LEAD MAGNET */}
        <div className="bg-gradient-to-br from-charcoal to-gold/5 border-2 border-gold/40 rounded-2xl p-8 mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gold text-obsidian rounded-lg flex items-center justify-center font-bold text-xs">AI</div>
            <h2 className="text-xl font-bold text-white">Your AI Content Prompt</h2>
          </div>
          <p className="text-ivory/60 text-sm mb-5">Copy this prompt and paste it into <span className="text-gold">ChatGPT, Claude, Gemini, or any AI</span>. It will generate your caption, on-screen text, headline, hashtags, and CTA — all customized to your niche.</p>

          <div className="bg-obsidian rounded-xl p-6 border border-smoke/50 relative">
            <p className="text-gold text-[10px] font-semibold uppercase tracking-wider mb-3">Copy &amp; Paste This Prompt Into Any AI</p>
            <div className="text-ivory/80 text-sm leading-relaxed space-y-3 font-mono">
              <p>You are a viral content strategist and copywriter for short-form video (Instagram Reels, TikTok, YouTube Shorts). I&apos;m going to describe a video I&apos;m making, and I need you to generate ALL of the following:</p>

              <p><span className="text-gold">1. TABLOID-STYLE HEADLINE &amp; CAPTION</span></p>
              <p>Write a bold, tabloid-style headline that plays on the #1 fear of my target market/customer. Structure: open with the fear (dramatic, emotional, specific), build tension in the middle, and end with relief/solution. Think National Enquirer meets Instagram — sensational but real. The headline should make them feel &quot;this is about ME&quot; and the caption should complete the emotional arc from fear → hope → action.</p>

              <p><span className="text-gold">2. THREE THUMBNAIL/ON-SCREEN TEXT OPTIONS</span></p>
              <p>Generate 3 different styles of on-screen text for the video thumbnail/cover image, each designed to maximize tap-through and viewer retention:</p>
              <p className="pl-4">A) <span className="text-ivory/60">CURIOSITY GAP</span> — a question or incomplete statement that forces them to tap (e.g. &quot;The reason your __ isn&apos;t working&quot;)</p>
              <p className="pl-4">B) <span className="text-ivory/60">BOLD CLAIM</span> — a specific, confident result statement (e.g. &quot;I gained 10K followers doing THIS&quot;)</p>
              <p className="pl-4">C) <span className="text-ivory/60">PATTERN INTERRUPT</span> — something unexpected or contrarian that breaks the scroll (e.g. &quot;STOP posting every day.&quot;)</p>
              <p>Each should be 3-7 words max. These go ON the thumbnail — short, punchy, impossible to ignore.</p>

              <p><span className="text-gold">3. THREE CAPTION VARIATIONS</span></p>
              <p>Write 3 different captions I can choose from, each with a different angle:</p>
              <p className="pl-4">A) <span className="text-ivory/60">STORY-BASED</span> — open with a mini story or personal experience, transition to the lesson, end with CTA</p>
              <p className="pl-4">B) <span className="text-ivory/60">VALUE-FIRST</span> — lead with the tip/insight immediately, give 2-3 actionable bullets, end with CTA</p>
              <p className="pl-4">C) <span className="text-ivory/60">CONTROVERSIAL/HOT TAKE</span> — open with a contrarian opinion that sparks comments, back it up, end with CTA</p>
              <p>Each caption should be under 150 words, start with a scroll-stopping first line, and end with a specific call-to-action.</p>

              <p><span className="text-gold">4. HASHTAGS</span></p>
              <p>Generate 15 of the most current, high-performing hashtags for this content:</p>
              <p className="pl-4">&bull; 3 broad/trending (1M+ posts)</p>
              <p className="pl-4">&bull; 5 mid-range (100K-1M posts)</p>
              <p className="pl-4">&bull; 7 niche-specific (under 100K posts)</p>
              <p>Make sure these are up-to-date and actively used on the platform right now — not outdated or dead hashtags.</p>

              <p className="border-t border-smoke/30 pt-3"><span className="text-gold font-bold">MY VIDEO:</span> <span className="text-gold">[DESCRIBE YOUR VIDEO — what it&apos;s about, who it&apos;s for, what you&apos;re showing/teaching/promoting]</span></p>
              <p><span className="text-gold font-bold">MY NICHE:</span> <span className="text-gold">[YOUR NICHE — e.g., fitness, music, business, beauty, food, real estate]</span></p>
              <p><span className="text-gold font-bold">MY TARGET CUSTOMER:</span> <span className="text-gold">[WHO YOU&apos;RE TRYING TO REACH — e.g., independent artists, busy moms, small business owners]</span></p>
              <p><span className="text-gold font-bold">MY TONE:</span> <span className="text-gold">[YOUR VIBE — e.g., motivational, casual, educational, funny, luxury, raw/authentic]</span></p>
            </div>
          </div>

          <p className="text-ivory/40 text-xs mt-4 italic">Works with ChatGPT, Claude, Gemini, Copilot, or even Google Search AI. Just replace the bracketed sections with your details and let it generate everything.</p>
        </div>

        {/* Guide Content */}
        <h2 className="text-2xl font-bold text-white text-center mb-8">The 7-Step Blueprint</h2>

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
            <p className="text-ivory/60 leading-relaxed">You don&apos;t need expensive gear. Face a window during golden hour. The soft, warm light makes any phone camera look professional. Shoot at 4K 30fps, clean your lens, use a $15 tripod or stack books.</p>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">3</div>
              <h2 className="text-xl font-bold text-white">The 3-Pillar Content Strategy</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed mb-4">Rotate between three types of content to build authority and connection:</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-obsidian rounded-xl p-4 border border-smoke/50">
                <p className="text-gold font-bold text-sm mb-1">Educate</p>
                <p className="text-ivory/50 text-xs">Tips, tutorials, how-tos. Builds authority.</p>
              </div>
              <div className="bg-obsidian rounded-xl p-4 border border-smoke/50">
                <p className="text-gold font-bold text-sm mb-1">Entertain</p>
                <p className="text-ivory/50 text-xs">Trends, humor, relatable moments. Gets reach.</p>
              </div>
              <div className="bg-obsidian rounded-xl p-4 border border-smoke/50">
                <p className="text-gold font-bold text-sm mb-1">Connect</p>
                <p className="text-ivory/50 text-xs">BTS, stories, vulnerability. Builds loyalty.</p>
              </div>
            </div>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">4</div>
              <h2 className="text-xl font-bold text-white">Caption = Second Hook</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed">Bold first line, value in the middle, CTA at the end. Always end with a command — &quot;Save this for later&quot;, &quot;Tag someone who needs this&quot;, &quot;Follow for part 2.&quot; Or just use the AI prompt above.</p>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">5</div>
              <h2 className="text-xl font-bold text-white">Post at Peak Hours</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed">Weekdays: 7-9am, 12-1pm, 5-7pm. Weekends: 9-11am, 7-9pm. Check your own Insights &gt; Audience &gt; Most Active Times and adjust.</p>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">6</div>
              <h2 className="text-xl font-bold text-white">Hashtag Strategy</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed">Use 5-15 hashtags. Mix: 3 broad (1M+), 5 mid-range (100K-1M), 5 niche (under 100K). Rotate sets weekly. Save 5 hashtag groups in your notes app.</p>
          </section>

          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">7</div>
              <h2 className="text-xl font-bold text-white">Optimize Your Bio</h2>
            </div>
            <p className="text-ivory/60 leading-relaxed">Line 1: What you do. Line 2: Who you do it for. Line 3: Social proof or CTA. Link: One link that matters most. Remove anything that doesn&apos;t serve the sale.</p>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-3">Want Me to Do All This For You?</h3>
          <p className="text-ivory/60 mb-8 max-w-md mx-auto">I edit 4-12+ Reels per month for creators and brands. Strategy, editing, captions, hooks — everything above, done for you.</p>
          <Link href="/services/content-editing#pricing" className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            View Content Packages
          </Link>
        </div>

        <p className="text-center text-ivory/20 text-xs mt-10">&copy; {new Date().getFullYear()} Asa Luke. All rights reserved.</p>
      </div>
    </div>
  )
}
