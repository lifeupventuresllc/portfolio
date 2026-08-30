'use client'

import { useMealPhotoUpload } from '@/lib/useMealPhotoUpload'

// Same capture pattern as components/PhotoUpload.tsx (hidden file input,
// capture="environment" opens the device camera directly on mobile), wired
// to /api/plan/food-photo instead — a real upload + a real challenge_food_log
// row, source:'photo', calories at 0 until the Cal-AI-style backend fills
// them in. Plain SVG icon, not emoji, per the app's standing icon rule.
export default function MealPhotoButton() {
  const { inputRef, uploading, error, onFile, trigger } = useMealPhotoUpload()

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
      <button
        onClick={trigger}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-sm transition-colors disabled:opacity-40"
        style={{ background: 'rgba(229,169,60,0.1)', border: '1px solid rgba(229,169,60,0.3)', color: '#E5A93C' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        {uploading ? 'Uploading…' : 'Snap a photo of your meal'}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
