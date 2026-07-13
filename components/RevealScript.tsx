'use client'
import { useEffect } from 'react'

// Reveals any element with class "luf-reveal" as it scrolls into view.
export default function RevealScript() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.luf-reveal'))
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((e) => e.classList.add('luf-in'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('luf-in'); io.unobserve(x.target) } })
    }, { threshold: 0.12 })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
  return null
}
