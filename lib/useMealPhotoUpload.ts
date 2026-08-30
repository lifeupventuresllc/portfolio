'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// Shared by components/MealPhotoButton.tsx (the food-log page's labeled
// button) and the bottom tab bar's TikTok-style "+" (Asa's ask, 2026-08-29:
// same spot TikTok gives it) — one real upload path
// (POST /api/plan/food-photo -> a real challenge_food_log row, calories
// pending), not two separate stubs to keep in sync.
export function useMealPhotoUpload() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch('/api/plan/food-photo', { method: 'POST', body: fd })
      const d = await res.json()
      if (d.success) router.refresh()
      else setError(d.error || 'Upload failed.')
    } catch { setError('Upload failed. Try again.') }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return { inputRef, uploading, error, onFile, trigger: () => inputRef.current?.click() }
}
