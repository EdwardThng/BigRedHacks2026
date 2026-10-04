/** The Big Red ball: carnelian top with a white bear head, white bottom, bear-paw button. */
export function BigRedBall({ size = 84 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <clipPath id="brb-top">
          <rect x="0" y="0" width="100" height="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="46" fill="#ffffff" />
      <circle cx="50" cy="50" r="46" fill="#b31b1b" clipPath="url(#brb-top)" />
      {/* highlight */}
      <path d="M22 26 Q30 14 44 11" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* bear head on the red half */}
      <g fill="#ffffff">
        <circle cx="38" cy="20" r="5" />
        <circle cx="62" cy="20" r="5" />
        <ellipse cx="50" cy="30" rx="13" ry="11" />
      </g>
      <g fill="#b31b1b">
        <circle cx="38" cy="20" r="2.2" />
        <circle cx="62" cy="20" r="2.2" />
        <circle cx="45" cy="28" r="1.6" />
        <circle cx="55" cy="28" r="1.6" />
        <ellipse cx="50" cy="34" rx="3.2" ry="2.2" />
      </g>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#111827" strokeWidth="5" />
      <line x1="4" y1="50" x2="96" y2="50" stroke="#111827" strokeWidth="6" />
      {/* bear-paw button */}
      <circle cx="50" cy="50" r="12.5" fill="#ffffff" stroke="#111827" strokeWidth="5" />
      <g fill="#b31b1b">
        <ellipse cx="50" cy="53" rx="4.2" ry="3.4" />
        <circle cx="44.6" cy="47.4" r="1.7" />
        <circle cx="48.2" cy="45.4" r="1.7" />
        <circle cx="51.8" cy="45.4" r="1.7" />
        <circle cx="55.4" cy="47.4" r="1.7" />
      </g>
    </svg>
  )
}
