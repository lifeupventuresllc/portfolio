'use client'
import { useEffect, useState } from 'react'
import Confetti from '@/components/Confetti'

// A win moment: confetti burst + a positive self-talk line. Fires ONCE per win per
// day (deduped in localStorage by `dedupeKey`, which should include the date) so it
// rewards the achievement without nagging on every live refresh.
export default function Celebration({ trigger, message, dedupeKey }: { trigger: boolean; message: string; dedupeKey: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!trigger) return
    try {
      if (localStorage.getItem('luf_celebrated_' + dedupeKey)) return
      localStorage.setItem('luf_celebrated_' + dedupeKey, '1')
    } catch { /* private mode — just celebrate */ }
    setShow(true)
    const t = setTimeout(() => setShow(false), 4400)
    return () => clearTimeout(t)
  }, [trigger, dedupeKey])
  if (!show) return null
  return (
    <>
      <Confetti fire={show} />
      <div className="fixed inset-x-0 bottom-6 z-[61] flex justify-center px-4 pointer-events-none">
        <div className="luf-pop bg-charcoal border border-gold/40 rounded-2xl px-5 py-4 max-w-sm text-center shadow-2xl shadow-gold/10">
          <p className="text-2xl mb-1">🎉</p>
          <p className="text-white text-sm font-semibold leading-snug">{message}</p>
          <p className="text-gold text-[11px] mt-1.5 font-semibold">— Coach</p>
        </div>
      </div>
    </>
  )
}
