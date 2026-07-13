'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PhotoUpload() {
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
      const res = await fetch('/api/plan/photo', { method: 'POST', body: fd })
      const d = await res.json()
      if (d.success) router.refresh()
      else setError(d.error || 'Upload failed.')
    } catch { setError('Upload failed. Try again.') }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        className="w-full bg-charcoal border border-dashed border-gold/40 text-gold rounded-2xl py-5 font-semibold text-sm hover:bg-gold/5 transition-colors disabled:opacity-40">
        {uploading ? 'Uploading…' : '📸 Add a progress photo'}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
