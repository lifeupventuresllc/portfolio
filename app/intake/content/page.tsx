'use client'

import { useState } from 'react'

const PLATFORMS = ['Reels', 'TikTok', 'Shorts', 'YouTube Long-Form']
const VIDEO_VOLUMES = ['1-4', '5-8', '9-12', '12+']
const VIDEO_LENGTHS = ['Under 60s', '1-3 min', '3-10 min', '10+ min']
const EDITING_STYLES = ['Fast-paced', 'Clean/minimal', 'Cinematic', 'Meme/trending', 'Not sure']
const DELIVERY_METHODS = ['Google Drive', 'Dropbox', 'WeTransfer', 'AirDrop']

export default function ContentIntakePage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [brandDesc, setBrandDesc] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [volume, setVolume] = useState('')
  const [videoLength, setVideoLength] = useState('')
  const [editStyle, setEditStyle] = useState('')
  const [brandColors, setBrandColors] = useState('')
  const [referenceVideos, setReferenceVideos] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState('')
  const [musicPrefs, setMusicPrefs] = useState('')
  const [timeline, setTimeline] = useState('')
  const [notes, setNotes] = useState('')

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: 'content',
          name,
          email,
          form_data: {
            name, email, instagram, brandDesc, platforms, volume,
            videoLength, editStyle, brandColors, referenceVideos,
            deliveryMethod, musicPrefs, timeline, notes,
          },
        }),
      })
      setSubmitted(true)
    } catch {
      alert('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const inputClass = 'w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors'
  const labelClass = 'block text-sm font-medium text-ivory/60 mb-1'

  if (submitted) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center px-6 pt-32">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">We Got Your Info!</h1>
          <p className="text-ivory/60 mb-6">Asa will review your details and be in touch within 24 hours.</p>
          <a href="/" className="inline-block bg-gold text-obsidian px-8 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-gold/90 transition-colors">
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian px-6 pt-32 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-3">Content Editing</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Intake Form</h1>
          <p className="text-ivory/50 max-w-md mx-auto">Tell me about your brand and content needs. The more detail, the better I can serve you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* About You */}
          <div className="bg-charcoal border border-smoke rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">About You</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Your name" />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
              </div>
              <div>
                <label className={labelClass}>Instagram Handle</label>
                <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} className={inputClass} placeholder="@yourhandle" />
              </div>
              <div>
                <label className={labelClass}>Brand Description</label>
                <textarea value={brandDesc} onChange={e => setBrandDesc(e.target.value)} className={inputClass + ' min-h-[80px]'} placeholder="What does your brand do? Who is your audience?" />
              </div>
            </div>
          </div>

          {/* Content Details */}
          <div className="bg-charcoal border border-smoke rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Content Details</h2>
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Platforms</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PLATFORMS.map(p => (
                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${platforms.includes(p) ? 'bg-gold/20 border-gold text-gold' : 'border-smoke text-ivory/50 hover:border-gold/40'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Videos Per Month</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {VIDEO_VOLUMES.map(v => (
                    <button key={v} type="button" onClick={() => setVolume(v)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${volume === v ? 'bg-gold/20 border-gold text-gold' : 'border-smoke text-ivory/50 hover:border-gold/40'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Video Length</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {VIDEO_LENGTHS.map(l => (
                    <button key={l} type="button" onClick={() => setVideoLength(l)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${videoLength === l ? 'bg-gold/20 border-gold text-gold' : 'border-smoke text-ivory/50 hover:border-gold/40'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Editing Style</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {EDITING_STYLES.map(s => (
                    <button key={s} type="button" onClick={() => setEditStyle(s)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${editStyle === s ? 'bg-gold/20 border-gold text-gold' : 'border-smoke text-ivory/50 hover:border-gold/40'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Brand & Delivery */}
          <div className="bg-charcoal border border-smoke rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Brand & Delivery</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Brand Colors (hex codes)</label>
                <input type="text" value={brandColors} onChange={e => setBrandColors(e.target.value)} className={inputClass} placeholder="#C9A84C, #0A0A0F" />
              </div>
              <div>
                <label className={labelClass}>Reference Videos (paste links)</label>
                <textarea value={referenceVideos} onChange={e => setReferenceVideos(e.target.value)} className={inputClass + ' min-h-[80px]'} placeholder="Links to videos with a style you like" />
              </div>
              <div>
                <label className={labelClass}>File Delivery Method</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DELIVERY_METHODS.map(m => (
                    <button key={m} type="button" onClick={() => setDeliveryMethod(m)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${deliveryMethod === m ? 'bg-gold/20 border-gold text-gold' : 'border-smoke text-ivory/50 hover:border-gold/40'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Music Preferences</label>
                <textarea value={musicPrefs} onChange={e => setMusicPrefs(e.target.value)} className={inputClass + ' min-h-[60px]'} placeholder="Any music style or mood you prefer?" />
              </div>
              <div>
                <label className={labelClass}>Timeline / Deadline</label>
                <input type="text" value={timeline} onChange={e => setTimeline(e.target.value)} className={inputClass} placeholder="When do you need this by?" />
              </div>
              <div>
                <label className={labelClass}>Additional Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className={inputClass + ' min-h-[80px]'} placeholder="Anything else I should know?" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name || !email}
            className="w-full py-4 bg-gold text-obsidian font-bold text-sm uppercase tracking-wider rounded-2xl hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Submitting...' : 'Submit Intake Form'}
          </button>
        </form>
      </div>
    </div>
  )
}
