// Looping animated figures for "How do you like to lift?" (2026-11-04, Asa's
// mockup claude.ai/artifact/RWmbkZkRPwLvzwyQ1BzxbX). Basic for now; real
// clips of African American women replace these later.
const SKIN = '#6B4430', HAIR = '#2A1A12', TOP = '#E5A93C', LEGS = '#2E6B55', DB = '#EDE7DA'

/** Squat to press: squats down, stands, presses both dumbbells overhead. */
export function CompoundFigure() {
  const t = { dur: '2.8s', repeatCount: 'indefinite', keyTimes: '0;.35;.6;.8;1' }
  return (
    <svg viewBox="0 0 120 160" width="100%" height="100%" aria-hidden="true">
      <line x1="20" y1="153" x2="100" y2="153" stroke="#1D4A3A" strokeWidth="2" />
      <path fill="none" stroke={LEGS} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" d="M60 85 L54 119 L54 151">
        <animate attributeName="d" {...t} values="M60 85 L54 119 L54 151;M60 110 L40 117 L52 151;M60 85 L54 119 L54 151;M60 85 L54 119 L54 151;M60 85 L54 119 L54 151" />
      </path>
      <path fill="none" stroke={LEGS} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" d="M60 85 L66 119 L66 151">
        <animate attributeName="d" {...t} values="M60 85 L66 119 L66 151;M60 110 L80 117 L68 151;M60 85 L66 119 L66 151;M60 85 L66 119 L66 151;M60 85 L66 119 L66 151" />
      </path>
      <g>
        <animateTransform attributeName="transform" type="translate" {...t} values="0 0;0 25;0 0;0 0;0 0" />
        <line x1="60" y1="46" x2="60" y2="86" stroke={TOP} strokeWidth="15" strokeLinecap="round" />
        <circle cx="60" cy="18" r="6" fill={HAIR} />
        <circle cx="60" cy="31" r="10" fill={SKIN} />
        <path fill="none" stroke={SKIN} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" d="M54 49 L45 60 L46 45">
          <animate attributeName="d" {...t} values="M54 49 L45 60 L46 45;M54 49 L45 60 L46 45;M54 49 L45 60 L46 45;M54 49 L49 32 L49 12;M54 49 L45 60 L46 45" />
        </path>
        <path fill="none" stroke={SKIN} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" d="M66 49 L75 60 L74 45">
          <animate attributeName="d" {...t} values="M66 49 L75 60 L74 45;M66 49 L75 60 L74 45;M66 49 L75 60 L74 45;M66 49 L71 32 L71 12;M66 49 L75 60 L74 45" />
        </path>
        <rect width="14" height="6" rx="2" fill={DB}>
          <animate attributeName="x" {...t} values="39;39;39;42;39" />
          <animate attributeName="y" {...t} values="40;40;40;7;40" />
        </rect>
        <rect width="14" height="6" rx="2" fill={DB}>
          <animate attributeName="x" {...t} values="67;67;67;64;67" />
          <animate attributeName="y" {...t} values="40;40;40;7;40" />
        </rect>
      </g>
    </svg>
  )
}

/** Bicep curls: stands still, curls both dumbbells up and down. */
export function ClassicFigure() {
  const t = { dur: '1.8s', repeatCount: 'indefinite' }
  return (
    <svg viewBox="0 0 120 160" width="100%" height="100%" aria-hidden="true">
      <line x1="20" y1="153" x2="100" y2="153" stroke="#1D4A3A" strokeWidth="2" />
      <path fill="none" stroke={LEGS} strokeWidth="11" strokeLinecap="round" d="M60 85 L54 119 L54 151" />
      <path fill="none" stroke={LEGS} strokeWidth="11" strokeLinecap="round" d="M60 85 L66 119 L66 151" />
      <line x1="60" y1="46" x2="60" y2="86" stroke={TOP} strokeWidth="15" strokeLinecap="round" />
      <circle cx="60" cy="18" r="6" fill={HAIR} />
      <circle cx="60" cy="31" r="10" fill={SKIN} />
      <path fill="none" stroke={SKIN} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" d="M54 49 L50 70 L50 90">
        <animate attributeName="d" {...t} values="M54 49 L50 70 L50 90;M54 49 L50 70 L58 52;M54 49 L50 70 L50 90" />
      </path>
      <path fill="none" stroke={SKIN} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" d="M66 49 L70 70 L70 90">
        <animate attributeName="d" {...t} values="M66 49 L70 70 L70 90;M66 49 L70 70 L62 52;M66 49 L70 70 L70 90" />
      </path>
      <rect width="12" height="6" rx="2" fill={DB}>
        <animate attributeName="x" {...t} values="44;52;44" />
        <animate attributeName="y" {...t} values="88;48;88" />
      </rect>
      <rect width="12" height="6" rx="2" fill={DB}>
        <animate attributeName="x" {...t} values="64;56;64" />
        <animate attributeName="y" {...t} values="88;48;88" />
      </rect>
    </svg>
  )
}
