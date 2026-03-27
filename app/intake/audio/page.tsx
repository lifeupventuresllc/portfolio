'use client'

import { useState } from 'react'

const SERVICES = ['Mixing', 'Mastering', 'Mix + Master', 'Vocal Tuning']
const GENRES = ['Hip-Hop', 'R&B', 'Pop', 'Rock', 'EDM', 'Gospel', 'Country', 'Podcast', 'Other']
const TRACK_COUNTS = ['1', '2-4', '5-10', '10+']
const DAWS = ['Pro Tools', 'Logic', 'FL Studio', 'Ableton', 'GarageBand', 'Other']
const STEM_OPTIONS = ['Full stems', 'Vocal + beat only', 'Mixed-down', 'Not sure']
const DELIVERY_METHODS = ['Google Drive', 'Dropbox', 'WeTransfer', 'AirDrop']

export default function AudioIntakePage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const [artistName, setArtistName] = useState('')
  const [realName, setRealName] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [genre, setGenre] = useState('')
  const [trackCount, setTrackCount] = useState('')
  const [daw, setDaw] = useState('')
  const [stems, setStems] = useState('')
  const [referenceTracks, setReferenceTracks] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState('')
  const [notes, setNotes] = useState('')

  function toggleService(s: string) {
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: 'audio',
          name: realName || artistName,
          email,
          form_data: {
            artistName, realName, email, instagram, services, genre,
            trackCount, daw, stems, referenceTracks, deliveryMethod, notes,
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
          <p className="text-ivory/60 mb-6">Asa will review your project details and be in touch within 24 hours.</p>
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
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-3">Audio Engineering</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Intake Form</h1>
          <p className="text-ivory/50 max-w-md mx-auto">Tell me about your project so I can deliver exactly what you need.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* About You */}
          <div className="bg-charcoal border border-smoke rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">About You</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Artist / Band Name *</label>
                <input type="text" required value={artistName} onChange={e => setArtistName(e.target.value)} className={inputClass} placeholder="Your artist name" />
              </div>
              <div>
                <label className={labelClass}>Real Name *</label>
                <input type="text" required value={realName} onChange={e => setRealName(e.target.value)} className={inputClass} placeholder="Your real name" />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
              </div>
              <div>
                <label className={labelClass}>Instagram Handle</label>
                <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} className={inputClass} placeholder="@yourhandle" />
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-charcoal border border-smoke rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Project Details</h2>
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Service Needed</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SERVICES.map(s => (
                    <button key={s} type="button" onClick={() => toggleService(s)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${services.includes(s) ? 'bg-gold/20 border-gold text-gold' : 'border-smoke text-ivory/50 hover:border-gold/40'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Genre</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {GENRES.map(g => (
                    <button key={g} type="button" onClick={() => setGenre(g)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${genre === g ? 'bg-gold/20 border-gold text-gold' : 'border-smoke text-ivory/50 hover:border-gold/40'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Number of Tracks</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TRACK_COUNTS.map(t => (
                    <button key={t} type="button" onClick={() => setTrackCount(t)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${trackCount === t ? 'bg-gold/20 border-gold text-gold' : 'border-smoke text-ivory/50 hover:border-gold/40'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>DAW Used</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DAWS.map(d => (
                    <button key={d} type="button" onClick={() => setDaw(d)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${daw === d ? 'bg-gold/20 border-gold text-gold' : 'border-smoke text-ivory/50 hover:border-gold/40'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Stems Capability</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {STEM_OPTIONS.map(s => (
                    <button key={s} type="button" onClick={() => setStems(s)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${stems === s ? 'bg-gold/20 border-gold text-gold' : 'border-smoke text-ivory/50 hover:border-gold/40'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Files & Delivery */}
          <div className="bg-charcoal border border-smoke rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Files & Delivery</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Reference Tracks (paste links or describe)</label>
                <textarea value={referenceTracks} onChange={e => setReferenceTracks(e.target.value)} className={inputClass + ' min-h-[80px]'} placeholder="Links to songs with a sound/mix you want to match" />
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
                <label className={labelClass}>Additional Notes / Preferences</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className={inputClass + ' min-h-[80px]'} placeholder="Anything else about the project — vibe, preferences, deadline, etc." />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !artistName || !realName || !email}
            className="w-full py-4 bg-gold text-obsidian font-bold text-sm uppercase tracking-wider rounded-2xl hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Submitting...' : 'Submit Intake Form'}
          </button>
        </form>
      </div>

      <footer className="py-8 px-6 border-t border-smoke mt-16">
        <div className="max-w-6xl mx-auto text-center text-sm text-ivory/40">
          &copy; {new Date().getFullYear()} Asa Luke. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
