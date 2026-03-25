'use client'

export function SaveGuideButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 border-2 border-gold text-gold px-6 py-3 font-bold text-sm uppercase tracking-wider rounded-2xl hover:bg-gold/10 transition-all"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Save / Download Guide
    </button>
  )
}
