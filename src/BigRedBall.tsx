/** The Big Red ball: a glossy black sphere with the Cornell bear-and-C logo on its face. */
export function BigRedBall({ size = 84 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="brb-body" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#3a3a3a" />
          <stop offset="55%" stopColor="#111111" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <radialGradient id="brb-shine" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="url(#brb-body)" />
      <image href="/logos/cornell-bear.png" x="20" y="20" width="60" height="60" preserveAspectRatio="xMidYMid meet" />
      {/* gloss */}
      <ellipse cx="34" cy="24" rx="16" ry="9" fill="url(#brb-shine)" transform="rotate(-28 34 24)" />
      <circle cx="50" cy="50" r="47" fill="none" stroke="#000000" strokeWidth="2" />
    </svg>
  )
}
