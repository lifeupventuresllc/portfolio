'use client'

import { useState } from 'react'

export default function BlueprintPage() {
  const [formData, setFormData] = useState({
    first_name: '',
    email: '',
    phone: '',
    age: '',
    gender: 'Female',
    height_feet: '5',
    height_inches: '4',
    weight_lbs: '',
    goal: 'Lose Fat',
    activity_level: 'Moderate',
    workout_days: '3',
    workout_length: '45 min',
    cardio: 'No',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#C9A84C]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Your Blueprint is Being Created</h2>
          <p className="text-white/60 leading-relaxed">
            Check your email in the next 2 minutes. Check your spam folder if you don't see it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-16">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[#C9A84C] text-xs font-semibold tracking-[0.3em] uppercase mb-4">
            Life Up Fitness
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Get Your Free Custom<br />Calorie Blueprint
          </h1>
          <p className="text-white/50 leading-relaxed">
            Fill out 9 quick questions. Your personalized plan lands in your email in minutes.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* First Name */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">First Name</label>
            <input
              type="text"
              name="first_name"
              required
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Your first name"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#C9A84C] transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#C9A84C] transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(555) 000-0000"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#C9A84C] transition-colors"
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Age</label>
            <input
              type="number"
              name="age"
              required
              min={16}
              max={80}
              value={formData.age}
              onChange={handleChange}
              placeholder="25"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#C9A84C] transition-colors"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </div>

          {/* Height */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Height</label>
            <div className="flex gap-3">
              <select
                name="height_feet"
                value={formData.height_feet}
                onChange={handleChange}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
              >
                {[4, 5, 6, 7].map(f => (
                  <option key={f} value={f}>{f} ft</option>
                ))}
              </select>
              <select
                name="height_inches"
                value={formData.height_inches}
                onChange={handleChange}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
              >
                {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
                  <option key={i} value={i}>{i} in</option>
                ))}
              </select>
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Current Weight (lbs)</label>
            <input
              type="number"
              name="weight_lbs"
              required
              min={80}
              max={500}
              value={formData.weight_lbs}
              onChange={handleChange}
              placeholder="150"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#C9A84C] transition-colors"
            />
          </div>

          {/* Goal */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Your Goal</label>
            <select
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
            >
              <option value="Lose Fat">Lose Fat</option>
              <option value="Build Muscle">Build Muscle</option>
              <option value="Maintain">Maintain</option>
            </select>
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Activity Level</label>
            <select
              name="activity_level"
              value={formData.activity_level}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
            >
              <option value="Low">Low — desk job, minimal movement</option>
              <option value="Moderate">Moderate — on feet part of the day</option>
              <option value="Active">Active — physical job, on feet most of the day</option>
              <option value="Very Active">Very Active — physical labor or athlete</option>
            </select>
          </div>

          {/* Workout Days */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Days Per Week You Work Out</label>
            <select
              name="workout_days"
              value={formData.workout_days}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
            >
              {[0,1,2,3,4,5,6].map(d => (
                <option key={d} value={d}>{d} {d === 1 ? 'day' : 'days'}</option>
              ))}
            </select>
          </div>

          {/* Workout Length */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Average Workout Length</label>
            <select
              name="workout_length"
              value={formData.workout_length}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
            >
              <option value="I don't work out yet">I don't work out yet</option>
              <option value="30 min">30 min</option>
              <option value="45 min">45 min</option>
              <option value="60 min">60 min</option>
              <option value="90 min">90 min</option>
            </select>
          </div>

          {/* Cardio */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Do You Do Cardio?</label>
            <select
              name="cardio"
              value={formData.cardio}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
            >
              <option value="No">No</option>
              <option value="Yes — 1-2x/week">Yes — 1-2x/week</option>
              <option value="Yes — 3-4x/week">Yes — 3-4x/week</option>
              <option value="Yes — daily">Yes — daily</option>
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C9A84C] text-black py-4 rounded-xl font-bold text-base uppercase tracking-wider transition-all duration-300 hover:bg-[#C9A84C]/90 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Creating Your Blueprint...' : 'Get My Free Blueprint →'}
          </button>

          <p className="text-white/30 text-xs text-center pb-4">
            Your information is private and secure. We never share or sell your data.
          </p>
        </form>
      </div>
    </div>
  )
}
