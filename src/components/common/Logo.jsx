/** A honeycomb cell with a "B": the SpellingBee mark. */
export function LogoMark({ className = 'size-9' }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d="M32 3l25 14.5v29L32 61 7 46.5v-29z" fill="var(--c-honey)" />
      <path d="M32 11l18 10.5v21L32 53 14 42.5v-21z" fill="none" stroke="#3b2a00" strokeOpacity="0.25" strokeWidth="2" />
      <text x="32" y="42" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="700" fontSize="28" fill="#2b1d00">
        B
      </text>
    </svg>
  )
}

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      <div className="leading-tight">
        <p className="font-display text-xl font-bold tracking-tight">SpellingBee</p>
        <p className="text-xs text-muted">Hear it. Spell it. Own it.</p>
      </div>
    </div>
  )
}
