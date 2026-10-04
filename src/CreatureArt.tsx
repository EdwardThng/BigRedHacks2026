import { useState, type ReactNode } from 'react'
import type { Creature } from './data/creatures'

type Props = { creature: Creature; silhouette?: boolean; size?: number; vectorOnly?: boolean }

const INK = '#1b1b24'

// Vector art in a soft blob, dot-eye style; drop a PNG at public/creatures/<id>.png to replace one.
export function CreatureArt({ creature, silhouette = false, size = 160, vectorOnly = false }: Props) {
  const [hasPng, setHasPng] = useState(!vectorOnly)
  if (hasPng) {
    return (
      <img
        src={`/creatures/${creature.id}.png`}
        width={size}
        height={size}
        alt={silhouette ? 'Unknown creature' : creature.name}
        className={silhouette ? 'art silhouette' : 'art'}
        onError={() => setHasPng(false)}
      />
    )
  }
  const f = (c: string) => (silhouette ? '#1f2937' : c)
  const draw = DRAWINGS[creature.id] ?? DRAWINGS.chilibao

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={silhouette ? 'art silhouette' : 'art'}>
      <ellipse cx="100" cy="186" rx="54" ry="8" fill="rgba(0,0,0,0.16)" />
      {draw(f, creature.palette)}
    </svg>
  )
}

type Paint = (c: string) => string
type Draw = (f: Paint, p: Creature['palette']) => ReactNode

const dotFace = (f: Paint, y: number, opts: { eye?: string; blush?: string; gap?: number } = {}) => {
  const gap = opts.gap ?? 14
  return (
    <g>
      <circle cx={100 - gap} cy={y} r="5.5" fill={f(opts.eye ?? INK)} />
      <circle cx={100 + gap} cy={y} r="5.5" fill={f(opts.eye ?? INK)} />
      <ellipse cx={100 - gap - 9} cy={y + 13} rx="7" ry="4.5" fill={f(opts.blush ?? '#ff8f8f')} opacity="0.6" />
      <ellipse cx={100 + gap + 9} cy={y + 13} rx="7" ry="4.5" fill={f(opts.blush ?? '#ff8f8f')} opacity="0.6" />
      <path d={`M94 ${y + 11} Q100 ${y + 17} 106 ${y + 11}`} stroke={f(opts.eye ?? INK)} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  )
}

const DRAWINGS: Record<string, Draw> = {
  // Palantir-inspired: an upright black dragon (a nod to Zekrom) with a glowing seeing stone and a ringed tail.
  scryvern: (f, p) => (
    <g>
      <path d="M72 96 L16 50 L30 84 L8 94 L34 106 L20 128 L62 118Z" fill={f('#2c2c38')} />
      <path d="M128 96 L184 50 L170 84 L192 94 L166 106 L180 128 L138 118Z" fill={f('#2c2c38')} />
      <path d="M30 84 L64 104 M34 106 L64 112" stroke={f('#4a4a5a')} strokeWidth="2.5" />
      <path d="M170 84 L136 104 M166 106 L136 112" stroke={f('#4a4a5a')} strokeWidth="2.5" />
      <path d="M126 162 C162 172 182 154 178 132" stroke={f(p.body)} strokeWidth="13" fill="none" strokeLinecap="round" />
      <circle cx="177" cy="122" r="20" fill={f(p.accent)} opacity="0.22" />
      <circle cx="177" cy="122" r="12" fill={f(p.accent)} />
      <circle cx="177" cy="122" r="5.5" fill={f(p.body)} />
      <rect x="76" y="160" width="18" height="22" rx="7" fill={f(p.body)} />
      <rect x="106" y="160" width="18" height="22" rx="7" fill={f(p.body)} />
      <path d="M70 150 C66 116 78 94 100 94 C122 94 134 116 130 150 C128 170 116 176 100 176 C84 176 72 170 70 150Z" fill={f(p.body)} />
      <path d="M100 108 L86 128 L100 160 L114 128Z" fill={f(p.belly)} />
      <path d="M100 32 C82 32 66 44 66 68 C66 90 82 100 100 100 C118 100 134 90 134 68 C134 44 118 32 100 32Z" fill={f(p.body)} />
      <path d="M86 40 C88 16 112 4 136 10 C120 16 112 26 112 42Z" fill={f(p.body)} />
      <path d="M72 48 L56 30 L78 40Z" fill={f(p.body)} />
      <path d="M80 80 C86 92 114 92 120 80 C114 86 86 86 80 80Z" fill={f(p.belly)} />
      <ellipse cx="87" cy="64" rx="9" ry="7" fill={f('#ff3b3b')} opacity="0.25" transform="rotate(-15 87 64)" />
      <ellipse cx="113" cy="64" rx="9" ry="7" fill={f('#ff3b3b')} opacity="0.25" transform="rotate(15 113 64)" />
      <ellipse cx="87" cy="64" rx="5.5" ry="4" fill={f('#ff3b3b')} transform="rotate(-15 87 64)" />
      <ellipse cx="113" cy="64" rx="5.5" ry="4" fill={f('#ff3b3b')} transform="rotate(15 113 64)" />
      <path d="M97 84 L99.5 89 L102 84Z" fill={f('#ffffff')} />
      <circle cx="100" cy="150" r="20" fill={f(p.accent)} opacity="0.22" />
      <circle cx="100" cy="150" r="12" fill={f('#9be7ff')} />
      <circle cx="96" cy="146" r="4" fill={f('#effcff')} />
      <ellipse cx="80" cy="144" rx="8" ry="12" fill={f(p.body)} transform="rotate(-20 80 144)" />
      <ellipse cx="120" cy="144" rx="8" ry="12" fill={f(p.body)} transform="rotate(20 120 144)" />
    </g>
  ),

  // SpaceX-inspired: a round little rocket mid-hover.
  boostling: (f, p) => (
    <g>
      <path d="M80 158 Q100 206 120 158Z" fill={f('#ff9a3c')} />
      <path d="M89 158 Q100 190 111 158Z" fill={f('#ffd36b')} />
      <path d="M60 118 L38 162 L68 150Z" fill={f(p.accent)} />
      <path d="M140 118 L162 162 L132 150Z" fill={f(p.accent)} />
      <path d="M62 150 C56 108 62 68 100 32 C138 68 144 108 138 150 C124 164 76 164 62 150Z" fill={f(p.body)} />
      <path d="M100 32 C88 44 80 56 76 68 L124 68 C120 56 112 44 100 32Z" fill={f(p.accent)} />
      <rect x="62" y="128" width="76" height="6" fill={f('#c3cad3')} />
      <ellipse cx="82" cy="84" rx="6" ry="14" fill={f('#ffffff')} opacity="0.6" />
      {dotFace(f, 98)}
    </g>
  ),

  // Cornell Entrepreneurship Club: a lightbulb with a tiny pitch deck.
  pitchling: (f, p) => (
    <g>
      <circle cx="100" cy="92" r="72" fill={f('#fff2b0')} opacity="0.55" />
      <circle cx="100" cy="92" r="54" fill={f(p.body)} />
      <rect x="76" y="132" width="48" height="16" rx="5" fill={f(p.body)} />
      <rect x="80" y="146" width="40" height="10" rx="3" fill={f('#9aa3ad')} />
      <rect x="82" y="158" width="36" height="10" rx="3" fill={f('#b6bec7')} />
      <rect x="90" y="170" width="20" height="9" rx="3" fill={f('#6b7280')} />
      <ellipse cx="80" cy="70" rx="9" ry="16" fill={f('#ffffff')} opacity="0.5" />
      {dotFace(f, 92)}
      <rect x="140" y="104" width="38" height="30" rx="3" fill={f('#ffffff')} stroke={f(p.accent)} strokeWidth="3" />
      <rect x="148" y="122" width="6" height="6" fill={f(p.accent)} />
      <rect x="157" y="116" width="6" height="12" fill={f(p.accent)} />
      <rect x="166" y="110" width="6" height="18" fill={f('#e5372e')} />
      <path d="M150 52 L153 60 L161 63 L153 66 L150 74 L147 66 L139 63 L147 60Z" fill={f(p.accent)} />
    </g>
  ),

  // Anthropic-inspired: a square, glowing, slightly menacing block in clay.
  monolurk: (f, p) => (
    <g>
      <rect x="38" y="40" width="132" height="138" rx="20" fill={f(p.body)} opacity="0.16" />
      <path d="M58 66 L76 44 L170 44 L152 66Z" fill={f(p.belly)} />
      <path d="M152 66 L170 44 L170 142 L152 168Z" fill={f('#b85c3e')} />
      <rect x="48" y="66" width="104" height="104" rx="8" fill={f(p.body)} />
      <rect x="68" y="98" width="20" height="15" fill={f('#fff3e6')} />
      <rect x="112" y="98" width="20" height="15" fill={f('#fff3e6')} />
      <path d="M64 90 L92 97" stroke={f(p.accent)} strokeWidth="5" strokeLinecap="round" />
      <path d="M136 90 L108 97" stroke={f(p.accent)} strokeWidth="5" strokeLinecap="round" />
      <rect x="70" y="128" width="60" height="20" rx="3" fill={f(p.accent)} />
      <path d="M74 128 L80 137 L86 128Z M90 128 L96 137 L102 128Z M106 128 L112 137 L118 128Z M120 128 L125 135 L128 128Z" fill={f('#fff3e6')} />
      <rect x="60" y="168" width="24" height="10" rx="2" fill={f('#b85c3e')} />
      <rect x="116" y="168" width="24" height="10" rx="2" fill={f('#b85c3e')} />
    </g>
  ),

  // Capital One-inspired: a round little vault that keeps things safe.
  vaultling: (f, p) => (
    <g>
      <path d="M40 120 C40 62 70 44 100 44 C130 44 160 62 160 120 C160 164 134 178 100 178 C66 178 40 164 40 120Z" fill={f(p.body)} />
      <rect x="86" y="50" width="28" height="7" rx="3.5" fill={f('#0e2347')} />
      <circle cx="100" cy="136" r="29" fill={f(p.belly)} stroke={f('#9fb3cf')} strokeWidth="5" />
      <path d="M100 116 L100 156 M80 136 L120 136 M86 122 L114 150 M114 122 L86 150" stroke={f('#9fb3cf')} strokeWidth="3" />
      <circle cx="100" cy="136" r="8" fill={f('#9fb3cf')} />
      <circle cx="86" cy="94" r="7" fill={f('#ffffff')} />
      <circle cx="114" cy="94" r="7" fill={f('#ffffff')} />
      <circle cx="87" cy="95" r="3.5" fill={f('#0e2347')} />
      <circle cx="115" cy="95" r="3.5" fill={f('#0e2347')} />
      <ellipse cx="72" cy="108" rx="7" ry="4.5" fill={f(p.accent)} opacity="0.8" />
      <ellipse cx="128" cy="108" rx="7" ry="4.5" fill={f(p.accent)} opacity="0.8" />
      <path d="M95 106 Q100 111 105 106" stroke={f('#ffffff')} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="160" cy="58" r="11" fill={f('#f2c14e')} stroke={f('#b8892a')} strokeWidth="3" />
    </g>
  ),

  // Asian Chili Spot: a proud, very red chili.
  chilibao: (f, p) => (
    <g>
      <path d="M58 82 C58 52 142 52 142 82 C142 124 130 152 112 170 C102 180 92 186 80 190 C86 176 82 160 70 140 C60 122 58 102 58 82Z" fill={f(p.body)} />
      <ellipse cx="78" cy="92" rx="8" ry="18" fill={f('#ffffff')} opacity="0.35" />
      <path d="M62 74 C78 54 122 54 138 74 C124 66 112 68 100 76 C88 68 76 66 62 74Z" fill={f(p.accent)} />
      <path d="M100 66 C100 48 112 38 124 42" stroke={f(p.accent)} strokeWidth="7" fill="none" strokeLinecap="round" />
      {dotFace(f, 104, { blush: '#ffd0c7' })}
    </g>
  ),
}
