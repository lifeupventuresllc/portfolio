'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// 30-day content calendar data
const CALENDAR = [
  {
    day: 1, weekday: 'Mon', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: 'This took me 10 minutes. Most businesses spend 3 hours on worse.',
    headline: 'THE $247 EDIT THAT MADE THIS RESTAURANT GO VIRAL OVERNIGHT',
    caption: 'Raw footage → finished Reel in 10 minutes. This is what I do for businesses every single day. Your content shouldn\'t take you 3 hours. It should take me 10 minutes. DM me \'EDIT\' and I\'ll do your first one free.',
    hashtags: '#reelsediting #contentcreation #socialmediamarketing #videoediting #smallbusinesstips',
    cta: "DM me 'EDIT'",
  },
  {
    day: 2, weekday: 'Tue', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: "I'll edit your next Reel for free. Here's why.",
    headline: "FREE REEL EDIT — NO CATCH. HERE'S THE ONLY THING I ASK IN RETURN",
    caption: "I'll edit your next Reel completely free. No strings. I just want you to see the difference between what you're posting now and what's possible. DM me 'FREE' with a clip from your phone. I'll send it back edited in 24 hours.",
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: "DM me 'FREE'",
  },
  {
    day: 3, weekday: 'Wed', pillar: 'proof', pillarLabel: 'Social Proof',
    hook: 'This client went from 200 views to 14,000 in one week. Here\'s what changed.',
    headline: 'HOW ONE RESTAURANT WENT FROM 200 VIEWS TO 14K — WITH ONE SIMPLE CHANGE',
    caption: 'Same restaurant. Same food. Same phone. Only difference? The edit. Before: blurry, flat, no hook. After: cinematic, color graded, tabloid caption, trending audio. The food didn\'t change. The content did.',
    hashtags: '#reelsediting #contentcreation #socialmediamarketing #videoediting #smallbusinesstips',
    cta: 'Save this. Send it to a restaurant owner.',
  },
  {
    day: 4, weekday: 'Thu', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: 'The CapCut trick that makes every video look $5,000',
    headline: 'THIS FREE CAPCUT TRICK MAKES YOUR VIDEOS LOOK LIKE A $5,000 PRODUCTION',
    caption: '3 steps. Free app. $5,000 look. Lower brightness -15, saturation -20, add film grain. That\'s it. Your videos instantly look cinematic. Most editors charge thousands for this. I just gave it to you for free.',
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: 'Follow for more',
  },
  {
    day: 5, weekday: 'Fri', pillar: 'brand', pillarLabel: 'Brand / Lifestyle',
    hook: 'Watch me edit a client\'s Reel in real time. 10 minutes.',
    headline: "I EDITED THIS ENTIRE REEL IN 10 MINUTES — HERE'S MY EXACT PROCESS",
    caption: "People ask me how I edit so fast. 5+ years of CapCut every single day. What takes you 3 hours takes me 10 minutes. Not because I'm better — because this is ALL I do. DM me 'BTS' to see what I'd do with YOUR content.",
    hashtags: '#reelsediting #contentcreation #socialmediamarketing #videoediting #smallbusinesstips',
    cta: "DM me 'BTS'",
  },
  {
    day: 6, weekday: 'Sat', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: "What $247/month gets you vs what you're paying now",
    headline: "EXPOSED: WHAT YOU'RE ACTUALLY PAYING FOR WHEN YOU HIRE A CONTENT EDITOR",
    caption: 'Starter ($247/mo): 6 Reels, 72hr turnaround. Growth ($497/mo): 12 Reels + Stories. VIP ($897/mo): 20 Reels + full management. Compare that to 15 hours/week doing it yourself. Link in bio.',
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: 'Link in bio',
  },
  {
    day: 7, weekday: 'Sun', pillar: 'faith', pillarLabel: 'Faith / Truth',
    hook: 'The real reason I do this.',
    headline: 'I WAS BROKE WITH A 1-YEAR-OLD. THIS IS WHAT I DID NEXT.',
    caption: "A year ago I was figuring out how to pay bills with a newborn daughter. Now I edit content for businesses, mix music for artists, and build my brand every day. Not because I'm special. Because I refused to stop.",
    hashtags: '#fitnessmotivation #disciplineoverfeeling #gymlife #mindsetmatters #fitnesscoach',
    cta: 'Save this.',
  },
  {
    day: 8, weekday: 'Mon', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: 'POV: Your editor also makes the music for your content',
    headline: "YOUR CONTENT EDITOR SHOULDN'T JUST EDIT — THEY SHOULD UNDERSTAND SOUND",
    caption: "I don't just edit your Reels. I mix and master music too. Your audio is never an afterthought. The music hits. The edits hit. The whole thing hits. DM me 'SOUND' if your audio game needs work.",
    hashtags: '#mixingandmastering #independentartist #musicproduction #audioengineer #newmusic',
    cta: "DM me 'SOUND'",
  },
  {
    day: 9, weekday: 'Tue', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: "Your content isn't bad. Your editing is.",
    headline: 'YOUR FOOD LOOKS INCREDIBLE IN PERSON. SO WHY DOES YOUR INSTAGRAM LOOK LIKE THIS?',
    caption: "The food is amazing. The gym is packed. The product works. But your Instagram doesn't show it. That's not a product problem — it's a content problem. Send me one clip. I'll edit it free.",
    hashtags: '#reelsediting #contentcreation #socialmediamarketing #videoediting #smallbusinesstips',
    cta: 'DM me a clip',
  },
  {
    day: 10, weekday: 'Wed', pillar: 'proof', pillarLabel: 'Social Proof',
    hook: 'This is what my clients say after their first edit',
    headline: "CLIENT TEXTS ME AT 2AM: 'BRO THIS REEL JUST HIT 10K VIEWS'",
    caption: "When a client texts you at 2 AM because their content is finally performing — that's the job. I don't just edit videos. I change how people see your brand. Results > promises.",
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: 'Want the same results? DM me.',
  },
  {
    day: 11, weekday: 'Thu', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: "Stop using this font on your Reels. Use this instead.",
    headline: "THE FONT YOU'RE USING IS KILLING YOUR VIEWS — HERE'S THE ONE THAT WORKS",
    caption: "Default Instagram fonts scream 'I didn't try.' Bold condensed fonts (Oswald, Bebas Neue) scream 'I know what I'm doing.' White or gold on dark backgrounds. Never colored text on light. Save this.",
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: 'Save this',
  },
  {
    day: 12, weekday: 'Fri', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: 'Before mix vs after mix. The difference will shock you.',
    headline: 'THIS IS WHAT YOUR SONG SOUNDS LIKE BEFORE AND AFTER A PROFESSIONAL MIX',
    caption: "You wrote something great. But bedroom mixes don't compete with Spotify. Listen to the before. Now the after. I'll mix your first track free. DM me 'MIX' with your stems.",
    hashtags: '#mixingandmastering #independentartist #musicproduction #audioengineer #newmusic',
    cta: "DM me 'MIX'",
  },
  {
    day: 13, weekday: 'Sat', pillar: 'brand', pillarLabel: 'Brand / Lifestyle',
    hook: '5 AM. No audience. This is where it\'s built.',
    headline: 'THE WORKOUT NOBODY SEES IS THE ONE THAT CHANGES EVERYTHING',
    caption: "Same discipline that gets me in the gym at 5 AM is the same discipline that has me editing at midnight. The gym taught me consistency. The studio taught me patience. Your business needs both.",
    hashtags: '#fitnessmotivation #disciplineoverfeeling #gymlife #mindsetmatters #fitnesscoach',
    cta: 'Follow for the daily grind',
  },
  {
    day: 14, weekday: 'Sun', pillar: 'faith', pillarLabel: 'Faith / Truth',
    hook: "I almost quit 6 months ago. Here's why I didn't.",
    headline: 'NOBODY TELLS YOU THIS ABOUT BUILDING A BUSINESS AS A CREATIVE',
    caption: "6 months ago I had 0 clients, a baby daughter, and a dream that felt stupid. Today I'm editing content for businesses, mixing music for artists, and building something real. Don't quit.",
    hashtags: '#fitnessmotivation #disciplineoverfeeling #gymlife #mindsetmatters #fitnesscoach',
    cta: 'Share this with someone who needs it',
  },
  {
    day: 15, weekday: 'Mon', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: 'I edited the same clip 3 different ways. Which one wins?',
    headline: '3 EDITS. 1 CLIP. THE WINNER GOT 47X MORE VIEWS',
    caption: "Same footage. 3 different editing styles. Which one would YOU stop scrolling for? The answer is obvious. That's why editing matters.",
    hashtags: '#reelsediting #contentcreation #socialmediamarketing #videoediting #smallbusinesstips',
    cta: "DM me 'EDIT' for your free version",
  },
  {
    day: 16, weekday: 'Tue', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: "Restaurant owners: this is why your food pics aren't working",
    headline: "YOUR FOOD IS A 10. YOUR INSTAGRAM IS A 3. LET'S FIX THAT.",
    caption: "You spent 10 years perfecting your recipes. You spend 10 seconds on your Reels. I specialize in making food look as good on screen as it tastes in person. Free sample → asaluke.io/for/restaurants",
    hashtags: '#losangeles #lasmallbusiness #lacreatives #contentcreatorla #socialmediala',
    cta: 'Link in bio → restaurants page',
  },
  {
    day: 17, weekday: 'Wed', pillar: 'proof', pillarLabel: 'Social Proof',
    hook: 'Every edit I did this month. 30 seconds.',
    headline: '30 DAYS. 47 EDITS. EVERY SINGLE ONE IN 30 SECONDS.',
    caption: "Restaurants. Creators. Artists. Fitness coaches. Every single one — dark, cinematic, scroll-stopping. If your content doesn't look like this, you're leaving money on the table.",
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: "DM me 'PORTFOLIO'",
  },
  {
    day: 18, weekday: 'Thu', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: 'The posting schedule that actually grows your business',
    headline: 'THE 5/2/2/1 CONTENT FORMULA THAT GROWS ANY SERVICE BUSINESS',
    caption: 'For every 10 posts: 5 service showcases. 2 behind-the-scenes. 2 social proof. 1 personal/faith. This ratio tells the algorithm you\'re a business, not a diary. Screenshot this.',
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: 'Save + Screenshot',
  },
  {
    day: 19, weekday: 'Fri', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: "Independent artists: your mix is costing you listeners",
    headline: "YOUR TALENT IS A 10. YOUR MIX IS A 4. SPOTIFY DOESN'T CARE ABOUT TALENT.",
    caption: "Spotify's algorithm doesn't care how talented you are. It cares how your song SOUNDS. I'll mix your first track free. If it doesn't sound radio-ready, don't pay me. DM 'STEMS'",
    hashtags: '#mixingandmastering #independentartist #musicproduction #audioengineer #newmusic',
    cta: "DM me 'STEMS'",
  },
  {
    day: 20, weekday: 'Sat', pillar: 'brand', pillarLabel: 'Brand / Lifestyle',
    hook: 'The gym taught me how to run a business',
    headline: 'WHAT 5 YEARS OF LIFTING TAUGHT ME ABOUT EDITING CONTENT',
    caption: 'Progressive overload = get a little better every edit. Consistency = post every day. Recovery = batch your content in one day. The gym and the business run on the same principles.',
    hashtags: '#fitnessmotivation #disciplineoverfeeling #gymlife #mindsetmatters #fitnesscoach',
    cta: 'Follow for discipline content',
  },
  {
    day: 21, weekday: 'Sun', pillar: 'faith', pillarLabel: 'Faith / Truth',
    hook: 'God gave me this skill for a reason',
    headline: 'I PRAYED FOR A WAY TO PROVIDE. THIS IS WHAT HAPPENED.',
    caption: "I didn't plan on being a content editor. I planned on making music. But God gave me a skill and a sales background most creatives don't have. Faith gave me the reason. Discipline gave me the results.",
    hashtags: '#fitnessmotivation #disciplineoverfeeling #gymlife #mindsetmatters #fitnesscoach',
    cta: 'Share with someone praying for direction',
  },
  {
    day: 22, weekday: 'Mon', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: "I'm only taking 5 more clients this month",
    headline: "5 SPOTS LEFT FOR APRIL. HERE'S WHAT YOU GET.",
    caption: "I cap my clients so every edit gets my full attention. 5 spots open. Starter ($247/mo). Growth ($497/mo). VIP ($897/mo). DM 'APRIL' to lock in your spot.",
    hashtags: '#reelsediting #contentcreation #socialmediamarketing #videoediting #smallbusinesstips',
    cta: "DM me 'APRIL'",
  },
  {
    day: 23, weekday: 'Tue', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: "Fitness coaches: your content is losing you clients",
    headline: 'YOUR WORKOUTS TRANSFORM BODIES. YOUR CONTENT LOOKS LIKE 2019.',
    caption: "You can change someone's life in the gym. But they'll never find you if your Reels look like everyone else's. Free sample → asaluke.io/for/fitness",
    hashtags: '#fitnessmotivation #disciplineoverfeeling #gymlife #mindsetmatters #fitnesscoach',
    cta: 'Link in bio',
  },
  {
    day: 24, weekday: 'Wed', pillar: 'proof', pillarLabel: 'Social Proof',
    hook: '3 months of editing for this client. Look at the growth.',
    headline: "FROM 500 FOLLOWERS TO 8,000 IN 90 DAYS — HERE'S THE CONTENT STRATEGY",
    caption: "Consistency + quality + strategy = growth. It's not complicated. It just takes discipline. That's what I bring to every client.",
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: 'Book a free call → asaluke.io/book',
  },
  {
    day: 25, weekday: 'Thu', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: 'The 3-second rule that gets 10x more views',
    headline: 'EVERY VIRAL REEL USES THIS 3-SECOND FORMULA. HERE IT IS FREE.',
    caption: "Second 1: Pattern interrupt. Second 2: Promise. Second 3: Proof. Every Reel I edit follows this. Works for restaurants, fitness coaches, artists, anyone. Steal it.",
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: 'Save this',
  },
  {
    day: 26, weekday: 'Fri', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: "Creators: you're spending 3 hours on what takes me 10 minutes",
    headline: "YOU'RE BURNING 15 HOURS A WEEK ON EDITING. I'LL GIVE THEM BACK.",
    caption: "15 hours a week on editing. That's 60 hours a month. I'll edit your Reels for less than what you make in those 15 hours. DM 'TIME' and let's talk.",
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: "DM me 'TIME'",
  },
  {
    day: 27, weekday: 'Sat', pillar: 'brand', pillarLabel: 'Brand / Lifestyle',
    hook: "Training to my own unreleased track. Ask me what song this is.",
    headline: "THE UNRELEASED TRACK EVERYONE'S ASKING ABOUT IN MY GYM VIDEOS",
    caption: "Built in the gym. Built in the studio. The discipline is the same. Song drops soon. Follow @AsaLuke for the music.",
    hashtags: '#fitnessmotivation #disciplineoverfeeling #gymlife #mindsetmatters #fitnesscoach',
    cta: 'Follow @AsaLuke',
  },
  {
    day: 28, weekday: 'Sun', pillar: 'faith', pillarLabel: 'Faith / Truth',
    hook: "Everybody talks about grinding. Nobody talks about what keeps you going.",
    headline: 'THE ONE THING THAT KEPT ME GOING WHEN EVERYTHING FELL APART',
    caption: "It wasn't motivation. It wasn't a business strategy. It was faith. When bills were late and nobody believed in the vision — faith kept me moving.",
    hashtags: '#fitnessmotivation #disciplineoverfeeling #gymlife #mindsetmatters #fitnesscoach',
    cta: 'Share this',
  },
  {
    day: 29, weekday: 'Mon', pillar: 'brand', pillarLabel: 'Brand / Lifestyle',
    hook: 'Everything I built this month in 60 seconds',
    headline: "30 DAYS. X EDITS. X CLIENTS. HERE'S WHAT I LEARNED.",
    caption: "Month recap: [X] Reels edited. [X] tracks mixed. [X] new clients. [X] followers gained. The system works when you work the system. DM 'NEXT' to get on the waitlist.",
    hashtags: '#contentcreator #entrepreneurlife #socialmediaagency #reelstips #digitalmarketing',
    cta: "DM me 'NEXT'",
  },
  {
    day: 30, weekday: 'Tue', pillar: 'service', pillarLabel: 'Service Showcase',
    hook: 'New month. New content. Same discipline.',
    headline: 'THE 30-DAY CONTENT SYSTEM I USE TO GROW ANY BUSINESS — INCLUDING MINE',
    caption: "Every month: 5 service posts. 2 BTS. 2 social proof. 1 truth. Rinse and repeat. Month 1 you get views. Month 3 you get clients. Month 6 you get referrals. Save this system.",
    hashtags: '#reelsediting #contentcreation #socialmediamarketing #videoediting #smallbusinesstips',
    cta: 'Save this system',
  },
]

const PILLAR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  service: { bg: 'rgba(201,168,76,0.12)', text: '#C9A84C', border: 'rgba(201,168,76,0.3)' },
  brand: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  proof: { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  faith: { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
}

export default function ContentPlanner() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [postedDays, setPostedDays] = useState<Record<number, boolean>>({})
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  // Memoized, not recreated on every render — see Navbar.tsx for why: an
  // unmemoized client combined with a [supabase]-dependent effect is a real
  // infinite-render loop (new client -> effect refires -> setState -> render
  // -> new client -> ...), not just an inefficiency.
  const supabase = useMemo(() => createClient(), [])

  const loadPosted = useCallback(async () => {
    const { data } = await supabase
      .from('schedule_tasks')
      .select('task_id, completed')
      .eq('task_type', 'content_planner')
      .eq('completed', true)

    const posted: Record<number, boolean> = {}
    for (const row of data || []) {
      const dayNum = parseInt(row.task_id.replace('day_', ''))
      if (!isNaN(dayNum)) posted[dayNum] = true
    }
    setPostedDays(posted)
  }, [supabase])

  useEffect(() => { loadPosted() }, [loadPosted])

  async function togglePosted(day: number) {
    const newState = !postedDays[day]
    const today = new Date().toISOString().split('T')[0]

    await supabase
      .from('schedule_tasks')
      .upsert(
        { date: today, task_type: 'content_planner', task_id: `day_${day}`, completed: newState },
        { onConflict: 'date,task_type,task_id' }
      )

    setPostedDays(prev => ({ ...prev, [day]: newState }))
  }

  const selected = selectedDay ? CALENDAR.find(c => c.day === selectedDay) : null
  const totalPosted = Object.values(postedDays).filter(Boolean).length
  const progress = (totalPosted / 30) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Progress Bar */}
      <div style={{ background: '#1A1A22', border: '1px solid #2A2A35', borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#F5F5F5', fontSize: 14, fontWeight: 600 }}>Content Calendar Progress</span>
          <span style={{ color: '#C9A84C', fontSize: 14, fontWeight: 700 }}>{totalPosted}/30 posted</span>
        </div>
        <div style={{ height: 10, background: '#0A0A0F', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? '#34d399' : '#C9A84C', borderRadius: 5, transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setView('calendar')} style={{ padding: '8px 16px', borderRadius: 6, border: `1px solid ${view === 'calendar' ? '#C9A84C' : '#2A2A35'}`, background: view === 'calendar' ? 'rgba(201,168,76,0.15)' : '#1A1A22', color: view === 'calendar' ? '#C9A84C' : '#D4C5A0', fontSize: 13, cursor: 'pointer' }}>Calendar View</button>
        <button onClick={() => setView('list')} style={{ padding: '8px 16px', borderRadius: 6, border: `1px solid ${view === 'list' ? '#C9A84C' : '#2A2A35'}`, background: view === 'list' ? 'rgba(201,168,76,0.15)' : '#1A1A22', color: view === 'list' ? '#C9A84C' : '#D4C5A0', fontSize: 13, cursor: 'pointer' }}>List View</button>
      </div>

      {/* Calendar Grid View */}
      {view === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
          {CALENDAR.map(item => {
            const style = PILLAR_STYLES[item.pillar]
            const isPosted = postedDays[item.day]
            return (
              <button
                key={item.day}
                onClick={() => setSelectedDay(item.day)}
                style={{
                  background: selectedDay === item.day ? 'rgba(201,168,76,0.15)' : isPosted ? 'rgba(16,185,129,0.08)' : '#1A1A22',
                  border: `1px solid ${selectedDay === item.day ? '#C9A84C' : isPosted ? 'rgba(16,185,129,0.3)' : '#2A2A35'}`,
                  borderRadius: 8,
                  padding: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                }}
              >
                {isPosted && (
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#0A0A0F', fontWeight: 700 }}>✓</div>
                )}
                <div style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F5', marginBottom: 4 }}>
                  {item.day}
                </div>
                <div style={{ fontSize: 11, color: '#D4C5A0', marginBottom: 6 }}>{item.weekday}</div>
                <div style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: style.bg, color: style.text, border: `1px solid ${style.border}`, display: 'inline-block' }}>
                  {item.pillarLabel}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CALENDAR.map(item => {
            const style = PILLAR_STYLES[item.pillar]
            const isPosted = postedDays[item.day]
            return (
              <button
                key={item.day}
                onClick={() => setSelectedDay(item.day)}
                style={{
                  background: selectedDay === item.day ? 'rgba(201,168,76,0.15)' : '#1A1A22',
                  border: `1px solid ${selectedDay === item.day ? '#C9A84C' : '#2A2A35'}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ width: 40, textAlign: 'center' }}>
                  {isPosted ? (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#0A0A0F', fontWeight: 700, margin: '0 auto' }}>✓</div>
                  ) : (
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#F5F5F5' }}>{item.day}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.headline}</div>
                  <div style={{ fontSize: 11, color: '#D4C5A0', marginTop: 2 }}>{item.weekday} — {item.pillarLabel}</div>
                </div>
                <div style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: style.bg, color: style.text, border: `1px solid ${style.border}`, flexShrink: 0 }}>
                  {item.pillarLabel}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Selected Day Detail Panel */}
      {selected && (
        <div style={{ background: '#1A1A22', border: '1px solid #2A2A35', borderRadius: 12, padding: 24, position: 'relative' }}>
          {/* Close */}
          <button onClick={() => setSelectedDay(null)} style={{ position: 'absolute', top: 12, right: 16, color: '#D4C5A0', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#C9A84C' }}>DAY {selected.day}</span>
            <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: PILLAR_STYLES[selected.pillar].bg, color: PILLAR_STYLES[selected.pillar].text, border: `1px solid ${PILLAR_STYLES[selected.pillar].border}`, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              {selected.pillarLabel}
            </span>
          </div>

          {/* In-Video Hook */}
          <div style={{ background: '#0A0A0F', border: '1px solid #C9A84C', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#C9A84C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>In-Video Text (CapCut)</div>
            <div style={{ fontSize: 16, color: '#F5F5F5', fontWeight: 600, lineHeight: 1.4 }}>&ldquo;{selected.hook}&rdquo;</div>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#D4C5A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Tabloid Headline</div>
            <div style={{ fontSize: 18, color: '#C9A84C', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.3 }}>{selected.headline}</div>
          </div>

          {/* Caption */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#D4C5A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Caption</div>
            <div style={{ fontSize: 14, color: '#F5F5F5', lineHeight: 1.7, background: '#0A0A0F', borderRadius: 8, padding: 16 }}>{selected.caption}</div>
          </div>

          {/* Hashtags */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#D4C5A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Hashtags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selected.hashtags.split(' ').map(tag => (
                <span key={tag} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: '#D4C5A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Call to Action</div>
            <div style={{ fontSize: 14, color: '#C9A84C', fontWeight: 600 }}>{selected.cta}</div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${selected.caption}\n\n${selected.hashtags}`)
                alert('Caption + hashtags copied!')
              }}
              style={{ padding: '10px 20px', borderRadius: 8, background: '#1A1A22', border: '1px solid #2A2A35', color: '#D4C5A0', fontSize: 13, cursor: 'pointer' }}
            >
              Copy Caption
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(selected.hook)
                alert('In-video text copied!')
              }}
              style={{ padding: '10px 20px', borderRadius: 8, background: '#1A1A22', border: '1px solid #2A2A35', color: '#D4C5A0', fontSize: 13, cursor: 'pointer' }}
            >
              Copy Hook
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(selected.hashtags)
                alert('Hashtags copied!')
              }}
              style={{ padding: '10px 20px', borderRadius: 8, background: '#1A1A22', border: '1px solid #2A2A35', color: '#D4C5A0', fontSize: 13, cursor: 'pointer' }}
            >
              Copy Hashtags
            </button>
            <button
              onClick={() => togglePosted(selected.day)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: postedDays[selected.day] ? '#34d399' : '#C9A84C',
                color: '#0A0A0F',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              {postedDays[selected.day] ? '✓ Posted' : 'Mark as Posted'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
