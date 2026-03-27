'use client'

import { useState } from 'react'

type Template = {
  name: string
  when: string
  body: string
}

type Category = {
  title: string
  description: string
  templates: Template[]
}

const CATEGORIES: Category[] = [
  {
    title: 'DM Templates',
    description: 'Cold outreach messages — rotate daily, never send more than 1 to the same person',
    templates: [
      {
        name: 'The Compliment Opener',
        when: 'Cold DM to creators/brands already posting content but quality is mid',
        body: `Hey [NAME]! Just came across your page — your [SPECIFIC CONTENT TYPE, e.g. fitness reels / podcast clips] are solid.\n\nI actually edit short-form content for [creators/brands] like yours. Would you be open to me editing one of your recent clips for free? No strings — just want to show you what's possible.`,
      },
      {
        name: 'The Problem Spotter',
        when: 'When you can clearly see their content needs better editing',
        body: `Hey [NAME], I've been following your page and your content ideas are fire — I think with tighter edits (pacing, hooks, captions) your videos could easily 2-3x engagement.\n\nI edit short-form content for [TYPE] creators. Want me to re-edit one of your recent posts so you can see the difference? Totally free.`,
      },
      {
        name: 'The Value-First (Audio)',
        when: 'Cold DM to independent artists posting music',
        body: `Hey [NAME]! Just heard your track [SONG NAME / recent release] — you've got a dope sound.\n\nI'm an audio engineer with 10+ years mixing and mastering. I'd love to mix one track for you for free so you can hear the difference a professional mix makes. Down?`,
      },
      {
        name: 'The Mutual Connection',
        when: 'When you have any mutual connection or shared community',
        body: `Hey [NAME]! I saw you're connected with [MUTUAL / in the same space as X]. I work with [creators/artists] doing [content editing / mixing & mastering].\n\nWould love to do a free [edit/mix] for you — just to introduce myself and show my work. Interested?`,
      },
      {
        name: 'The Direct Pitch',
        when: 'Straightforward approach — good for busy people',
        body: `Hey [NAME] — I help [creators/artists] level up their [content/sound] without them having to spend hours editing.\n\nI'll do your first [video edit / mix] free. If you like it, we can talk about working together. If not, you still get a free [edit/mix]. Win-win?`,
      },
    ],
  },
  {
    title: 'Follow-Up Cadence',
    description: '80% of sales happen on follow-up #2–5. Most people quit after #1.',
    templates: [
      {
        name: 'Follow-Up #1 — Soft Bump (Day 2)',
        when: '2 days after initial DM with no response',
        body: `Hey [NAME]! Just bumping this up in case it got buried — would love to do that free [edit/mix] for you. Totally no pressure either way!`,
      },
      {
        name: 'Follow-Up #2 — Add Value (Day 5)',
        when: '5 days after initial DM',
        body: `Hey [NAME] — just finished a [edit/mix] for another [creator/artist] and it reminded me of your style. Still happy to do one for you free if you're interested. Here's a recent example: [LINK TO YOUR PORTFOLIO/EXAMPLE]`,
      },
      {
        name: 'Follow-Up #3 — Urgency (Day 10)',
        when: '10 days after initial DM',
        body: `Hey [NAME]! I'm about to close out my free spots for this month — wanted to check one more time if you'd want me to [edit a clip / mix a track] for you before I fill up. Just send me the file and I'll get it done in 48 hrs.`,
      },
      {
        name: 'Final Follow-Up — Door Open (Day 20)',
        when: '20 days after initial DM — last touch, then move to cold list',
        body: `Hey [NAME] — no worries if the timing isn't right! If you ever need a [content editor / mix engineer], I'm here. Keep killing it!`,
      },
    ],
  },
  {
    title: 'Client Communication',
    description: 'Templates for active client management — save as quick replies',
    templates: [
      {
        name: 'Order Confirmed',
        when: 'After receiving intake form and files',
        body: `Hey [NAME]! Got your intake form and files — everything looks good. I'll have your [edit/mix] ready within 48 hours. I'll send it over as soon as it's done!`,
      },
      {
        name: 'Delivery',
        when: 'When project is complete and ready to send',
        body: `Hey [NAME]! Your [edit/mix] is ready — [LINK]. Give it a look/listen and let me know if you'd like any changes. You've got [X] revisions included.`,
      },
      {
        name: 'Revision Received',
        when: 'After client sends revision feedback',
        body: `Got your feedback! I'll have the updated version back to you within 24 hours.`,
      },
      {
        name: 'Upsell After Free Sample',
        when: 'After delivering a free sample they liked',
        body: `Hey [NAME]! Glad you liked the [edit/mix]! If you want to keep the momentum going, here are my monthly packages:\n\n→ Starter ($297/mo) — 4 videos\n→ Growth ($597/mo) — 8 videos\n→ VIP ($997/mo) — 12+ videos\n\nWant me to set you up?`,
      },
      {
        name: 'Auto-Close (72 Hours No Response)',
        when: 'Client hasn\'t responded 72 hours after delivery',
        body: `Hey [NAME]! Just checking in — I delivered your [edit/mix] 3 days ago. If I don't hear back by [DATE], I'll mark this one as complete. You can always reach out if you need changes later!`,
      },
      {
        name: 'Decline Bad-Fit Client',
        when: 'Project is outside your scope',
        body: `Appreciate the interest! Unfortunately that project is outside the scope of what I offer right now. I specialize in [short-form video editing / mixing & mastering] with a focus on [creators / independent artists]. If that changes in the future, I'd love to work together!`,
      },
      {
        name: 'Auto-Response (Production Block)',
        when: 'Set as auto-reply during production hours',
        body: `Hey! Thanks for reaching out. I check messages at 9am, 1pm, and 5pm daily and will get back to you in my next window. If it's about a current project, I've got you — your timeline is on track.`,
      },
    ],
  },
]

export default function Templates() {
  const [activeCategory, setActiveCategory] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)

  function copyTemplate(name: string, body: string) {
    navigator.clipboard.writeText(body)
    setCopied(name)
    setTimeout(() => setCopied(null), 2000)
  }

  const category = CATEGORIES[activeCategory]

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="flex gap-3">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.title}
            onClick={() => setActiveCategory(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === i
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-charcoal text-ivory/50 border border-smoke hover:text-ivory/70'
            }`}
          >
            {cat.title}
          </button>
        ))}
      </div>

      <p className="text-sm text-ivory/40">{category.description}</p>

      {/* Template cards */}
      <div className="space-y-4">
        {category.templates.map(template => (
          <div key={template.name} className="bg-charcoal rounded-xl border border-smoke p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-white">{template.name}</h3>
                <p className="text-xs text-ivory/40 mt-1">{template.when}</p>
              </div>
              <button
                onClick={() => copyTemplate(template.name, template.body)}
                className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                  copied === template.name
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-gold/10 text-gold hover:bg-gold/20'
                }`}
              >
                {copied === template.name ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="mt-3 text-sm text-ivory/70 whitespace-pre-wrap font-sans bg-obsidian rounded-lg p-4 border border-smoke/50">
              {template.body}
            </pre>
          </div>
        ))}
      </div>

      {/* Personalization checklist */}
      {activeCategory === 0 && (
        <div className="bg-charcoal rounded-xl border border-smoke p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Pre-DM Checklist</h3>
          <div className="space-y-2 text-sm text-ivory/60">
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-gold" /> Used their first name</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-gold" /> Referenced something SPECIFIC about their content/music</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-gold" /> Mentioned the free offer</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-gold" /> Kept it under 5 sentences</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-gold" /> No links in the first message</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-gold" /> Ended with a question</label>
          </div>
        </div>
      )}
    </div>
  )
}
