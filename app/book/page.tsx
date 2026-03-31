'use client'

import { useState, useEffect } from 'react'

interface AvailableDate {
  date: string
  slots: string[]
}

export default function BookingPage() {
  const [available, setAvailable] = useState<AvailableDate[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [service, setService] = useState('content')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [booked, setBooked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/bookings?days=14')
      .then(r => r.json())
      .then(d => setAvailable(d.available || []))
      .catch(() => setError('Failed to load available times'))
  }, [])

  const selectedDateSlots = available.find(a => a.date === selectedDate)?.slots || []

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, service_interest: service, date: selectedDate, time_slot: selectedSlot, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Booking failed')
      setBooked(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
          <h1 className="text-3xl font-bold text-gold mb-4">You&apos;re Booked</h1>
          <p className="text-ivory mb-2">{formatDate(selectedDate)} at {selectedSlot} (Pacific)</p>
          <p className="text-ivory/60 mb-8">Check your email for confirmation details.</p>
          <a href="/" className="inline-block bg-gold text-obsidian font-bold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Book a <span className="text-gold">Call</span>
        </h1>
        <p className="text-ivory/60 text-center mb-10">
          Pick a time that works for you. Free 15-minute discovery call.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Date Selection */}
          <div>
            <label className="block text-ivory/80 text-sm font-medium mb-3">Select a Date</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {available.map(a => (
                <button
                  key={a.date}
                  type="button"
                  onClick={() => { setSelectedDate(a.date); setSelectedSlot('') }}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    selectedDate === a.date
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'bg-charcoal border-smoke text-ivory/80 hover:border-gold/50'
                  }`}
                >
                  {formatDate(a.date)}
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div>
              <label className="block text-ivory/80 text-sm font-medium mb-3">Select a Time (Pacific)</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {selectedDateSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      selectedSlot === slot
                        ? 'bg-gold/20 border-gold text-gold'
                        : 'bg-charcoal border-smoke text-ivory/80 hover:border-gold/50'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact Info */}
          {selectedSlot && (
            <div className="space-y-4">
              <div>
                <label className="block text-ivory/80 text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-charcoal border border-smoke text-white placeholder-ivory/40 focus:border-gold focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-ivory/80 text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-charcoal border border-smoke text-white placeholder-ivory/40 focus:border-gold focus:outline-none"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-ivory/80 text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-charcoal border border-smoke text-white placeholder-ivory/40 focus:border-gold focus:outline-none"
                  placeholder="(optional)"
                />
              </div>
              <div>
                <label className="block text-ivory/80 text-sm font-medium mb-1">What are you interested in?</label>
                <select
                  value={service}
                  onChange={e => setService(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-charcoal border border-smoke text-white focus:border-gold focus:outline-none"
                >
                  <option value="content">Content Editing</option>
                  <option value="audio">Audio Engineering</option>
                  <option value="fitness">Fitness Coaching</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>
              <div>
                <label className="block text-ivory/80 text-sm font-medium mb-1">Anything specific you want to discuss?</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-charcoal border border-smoke text-white placeholder-ivory/40 focus:border-gold focus:outline-none resize-none"
                  placeholder="(optional)"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-lg bg-gold text-obsidian font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
