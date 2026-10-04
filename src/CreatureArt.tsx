import { useState, type ReactNode } from 'react'
import type { Creature } from './data/creatures'

/** Some creatures change form mid-encounter (Kiln: dozing → awake → furious). */
export type Form = 'dozing' | 'awake' | 'furious'

type Props = { creature: Creature; silhouette?: boolean; size?: number; vectorOnly?: boolean; form?: Form }

const INK = '#1b1b24'

// Vector art in a soft blob, dot-eye style; drop a PNG at public/creatures/<id>.png to replace one.
export function CreatureArt({ creature, silhouette = false, size = 160, vectorOnly = false, form }: Props) {
  const formKey = form && form !== 'dozing' ? `${creature.id}-${form}` : null
  const [hasPng, setHasPng] = useState(!vectorOnly && !formKey)
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
  const draw = (formKey && DRAWINGS[formKey]) || DRAWINGS[creature.id] || DRAWINGS.chilibao

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

  // Cornell Entrepreneurship Club: the club's faceted triangle come to life, face in the hollow.
  pitchling: (f, p) => (
    <g>
      <circle cx="100" cy="104" r="80" fill={f('#fff2b0')} opacity="0.35" />
      <ellipse cx="66" cy="170" rx="12" ry="7" fill={f('#d06872')} />
      <ellipse cx="134" cy="170" rx="12" ry="7" fill={f('#4f9b8f')} />
      <path d="M100.0 22.0 74.0 69.3 100.0 80.0Z" fill={f('#f3dd7f')} stroke={f('#f3dd7f')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M74.0 69.3 88.0 100.7 100.0 80.0Z" fill={f('#e9c25a')} stroke={f('#e9c25a')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M74.0 69.3 48.0 116.7 88.0 100.7Z" fill={f('#d9a95a')} stroke={f('#d9a95a')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M48.0 116.7 76.0 121.3 88.0 100.7Z" fill={f('#c09774')} stroke={f('#c09774')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M48.0 116.7 22.0 164.0 76.0 121.3Z" fill={f('#c95971')} stroke={f('#c95971')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M22.0 164.0 64.0 142.0 76.0 121.3Z" fill={f('#b54559')} stroke={f('#b54559')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M22.0 164.0 74.0 164.0 64.0 142.0Z" fill={f('#d06872')} stroke={f('#d06872')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M74.0 164.0 88.0 142.0 64.0 142.0Z" fill={f('#cb7a81')} stroke={f('#cb7a81')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M74.0 164.0 126.0 164.0 88.0 142.0Z" fill={f('#d6a393')} stroke={f('#d6a393')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M126.0 164.0 112.0 142.0 88.0 142.0Z" fill={f('#d4c1a4')} stroke={f('#d4c1a4')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M126.0 164.0 178.0 164.0 112.0 142.0Z" fill={f('#a8c7a3')} stroke={f('#a8c7a3')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M178.0 164.0 136.0 142.0 112.0 142.0Z" fill={f('#8fbf9c')} stroke={f('#8fbf9c')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M178.0 164.0 152.0 116.7 136.0 142.0Z" fill={f('#4f9b8f')} stroke={f('#4f9b8f')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M152.0 116.7 124.0 121.3 136.0 142.0Z" fill={f('#539e90')} stroke={f('#539e90')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M152.0 116.7 126.0 69.3 124.0 121.3Z" fill={f('#63b3a1')} stroke={f('#63b3a1')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M126.0 69.3 112.0 100.7 124.0 121.3Z" fill={f('#6cb6a1')} stroke={f('#6cb6a1')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M126.0 69.3 100.0 22.0 112.0 100.7Z" fill={f('#b9c876')} stroke={f('#b9c876')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M100.0 22.0 100.0 80.0 112.0 100.7Z" fill={f('#d6d07a')} stroke={f('#d6d07a')} strokeWidth="3" strokeLinejoin="round" />
      <path d="M100 80 L64 142 L136 142Z" fill={f(p.belly)} stroke={f(p.belly)} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="91" cy="118" r="4.5" fill={f(INK)} />
      <circle cx="109" cy="118" r="4.5" fill={f(INK)} />
      <ellipse cx="83" cy="128" rx="5" ry="3" fill={f('#ff8f8f')} opacity="0.6" />
      <ellipse cx="117" cy="128" rx="5" ry="3" fill={f('#ff8f8f')} opacity="0.6" />
      <path d="M95 127 Q100 132 105 127" stroke={f(INK)} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M160 34 L163 43 L172 46 L163 49 L160 58 L157 49 L148 46 L157 43Z" fill={f('#e9c25a')} />
      <path d="M38 60 L40 66 L46 68 L40 70 L38 76 L36 70 L30 68 L36 66Z" fill={f('#63b3a1')} />
    </g>
  ),

  // Anthropic-inspired: Kiln, curled up asleep on its cushion. Only the third eye stays open.
  kiln: (f, p) => (
    <g>
      <ellipse cx="100" cy="176" rx="90" ry="13" fill={f('#151519')} />
      <ellipse cx="100" cy="170" rx="82" ry="10" fill={f('#2a2a30')} />
      <path d="M58 168 C100 178 150 174 162 160 C170 150 168 136 160 130" stroke={f(p.accent)} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M112 116 C120 100 150 100 166 116 L158 122 L152 114 L146 124 L140 114 L134 124 L128 114 L122 124 L116 116Z" fill={f(p.accent)} />
      <path d="M48 118 L22 104 L46 132Z" fill={f(p.body)} />
      <path d="M116 102 L130 90 L126 110Z" fill={f(p.body)} />
      <path d="M40 132 C40 102 64 88 94 88 C136 88 166 102 168 132 C170 158 148 168 104 168 C62 168 40 158 40 132Z" fill={f(p.body)} />
      <circle cx="62" cy="166" r="7" fill={f(p.body)} />
      <circle cx="78" cy="168" r="7" fill={f(p.body)} />
      <circle cx="96" cy="168" r="7" fill={f(p.body)} />
      <path d="M72 96 C68 74 82 58 98 54 C88 68 84 80 86 96Z" fill={f(p.accent)} />
      <path d="M92 92 C100 76 118 66 136 68 C122 76 112 84 106 96Z" fill={f(p.accent)} />
      <ellipse cx="82" cy="110" rx="6" ry="9.5" fill={f(p.accent)} />
      <circle cx="80.5" cy="106" r="2.2" fill={f('#ffffff')} />
      <path d="M56 130 Q64 136 72 130" stroke={f(p.accent)} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M88 130 Q96 136 104 130" stroke={f(p.accent)} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="58" cy="142" rx="7" ry="4" fill={f('#f2b4a8')} />
      <ellipse cx="104" cy="142" rx="7" ry="4" fill={f('#f2b4a8')} />
      <path d="M74 148 Q80 152 86 148" stroke={f(p.accent)} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M81 149.5 L83 156 L85 149.5Z" fill={f('#ffffff')} stroke={f(p.accent)} strokeWidth="0.8" />
    </g>
  ),

  // Kiln, state 2 (tries 4–5): sitting up, unimpressed. Flat half-lids, third eye glowing pale.
  'kiln-awake': (f, p) => (
    <g>
      <ellipse cx="100" cy="178" rx="66" ry="10" fill={f('#151519')} />
      <ellipse cx="100" cy="173" rx="58" ry="7" fill={f('#2a2a30')} />
      <path d="M126 152 C152 156 158 138 150 120" stroke={f(p.accent)} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M146 118 C143 106 153 100 158 109 C160 116 153 122 146 118Z" fill={f(p.accent)} />
      <path d="M54 70 L42 62 L50 80Z M50 96 L38 104 L52 102Z M146 70 L158 62 L150 80Z M150 96 L162 104 L148 102Z" fill={f(p.accent)} />
      <path d="M60 82 L28 74 L56 100Z" fill={f(p.body)} />
      <path d="M140 82 L172 74 L144 100Z" fill={f(p.body)} />
      <ellipse cx="86" cy="170" rx="11" ry="6" fill={f('#e3d6b2')} />
      <ellipse cx="114" cy="170" rx="11" ry="6" fill={f('#e3d6b2')} />
      <ellipse cx="100" cy="142" rx="31" ry="30" fill={f(p.body)} />
      <ellipse cx="100" cy="148" rx="18" ry="16" fill={f(p.belly)} />
      <path d="M90 142 L110 142 M88 148 L112 148 M90 154 L110 154" stroke={f('#d9cba6')} strokeWidth="2" />
      <ellipse cx="71" cy="138" rx="8" ry="11" fill={f(p.body)} />
      <ellipse cx="129" cy="138" rx="8" ry="11" fill={f(p.body)} />
      <path d="M66 150 L61 157 L70 153Z M134 150 L139 157 L130 153Z" fill={f(p.accent)} />
      <path d="M82 50 C70 34 72 16 84 8 C81 24 87 36 93 46Z" fill={f(p.accent)} />
      <path d="M118 50 C130 34 128 16 116 8 C119 24 113 36 107 46Z" fill={f(p.accent)} />
      <circle cx="100" cy="84" r="42" fill={f(p.body)} />
      <circle cx="100" cy="61" r="13" fill={f('#fff7d6')} opacity="0.7" />
      <circle cx="100" cy="61" r="9" fill={f(p.belly)} />
      <ellipse cx="100" cy="61" rx="3.5" ry="6" fill={f(p.accent)} />
      <path d="M74 86 A11 11 0 0 0 96 86Z" fill={f(p.accent)} />
      <path d="M104 86 A11 11 0 0 0 126 86Z" fill={f(p.accent)} />
      <circle cx="81" cy="90" r="2.6" fill={f('#ffffff')} />
      <circle cx="111" cy="90" r="2.6" fill={f('#ffffff')} />
      <path d="M71 85 L99 84 M101 84 L129 85" stroke={f(p.accent)} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="72" cy="101" rx="7" ry="4" fill={f('#f2b4a8')} />
      <ellipse cx="128" cy="101" rx="7" ry="4" fill={f('#f2b4a8')} />
      <path d="M95 105 L105 105" stroke={f(p.accent)} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M100 105.5 L101.5 110 L103 105.5Z" fill={f('#ffffff')} />
    </g>
  ),

  // Kiln, state 3 (try 6): furious. Wings spread, all three eyes glowing, cracks lit, smoke from the horns.
  'kiln-furious': (f, p) => (
    <g>
      <circle cx="100" cy="98" r="86" fill={f('#e8b8ad')} opacity="0.55" />
      <circle cx="62" cy="26" r="5" fill={f('#b9b5ae')} />
      <circle cx="70" cy="18" r="4" fill={f('#b9b5ae')} />
      <circle cx="138" cy="26" r="5" fill={f('#b9b5ae')} />
      <circle cx="130" cy="18" r="4" fill={f('#b9b5ae')} />
      <ellipse cx="100" cy="178" rx="66" ry="10" fill={f('#151519')} />
      <ellipse cx="100" cy="173" rx="58" ry="7" fill={f('#2a2a30')} />
      <path d="M62 94 L12 58 L24 86 L4 96 L28 106 L14 126 L58 114Z" fill={f(p.accent)} />
      <path d="M138 94 L188 58 L176 86 L196 96 L172 106 L186 126 L142 114Z" fill={f(p.accent)} />
      <path d="M24 86 L58 100 M28 106 L58 108 M176 86 L142 100 M172 106 L142 108" stroke={f('#3a3a44')} strokeWidth="2" />
      <path d="M126 152 C156 158 166 136 154 112" stroke={f(p.accent)} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M60 80 L30 70 L56 98Z" fill={f(p.body)} />
      <path d="M140 80 L170 70 L144 98Z" fill={f(p.body)} />
      <ellipse cx="86" cy="170" rx="11" ry="6" fill={f('#e3d6b2')} />
      <ellipse cx="114" cy="170" rx="11" ry="6" fill={f('#e3d6b2')} />
      <path d="M78 172 L80 178 L83 172Z M92 172 L94 178 L97 172Z M106 172 L108 178 L111 172Z M120 172 L122 178 L125 172Z" fill={f(p.accent)} />
      <ellipse cx="100" cy="142" rx="31" ry="30" fill={f(p.body)} />
      <ellipse cx="100" cy="148" rx="18" ry="16" fill={f(p.belly)} />
      <path d="M96 138 L91 147 L96 155 M106 138 L111 147 L105 156" stroke={f('#d63a2a')} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="70" cy="134" rx="8" ry="11" fill={f(p.body)} transform="rotate(-25 70 134)" />
      <ellipse cx="130" cy="134" rx="8" ry="11" fill={f(p.body)} transform="rotate(25 130 134)" />
      <path d="M54 126 L46 122 M56 133 L46 133 M146 126 L154 122 M144 133 L154 133" stroke={f(p.accent)} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M80 50 C66 32 68 12 82 2 C78 20 86 34 93 46Z" fill={f(p.accent)} />
      <path d="M120 50 C134 32 132 12 118 2 C122 20 114 34 107 46Z" fill={f(p.accent)} />
      <circle cx="100" cy="84" r="42" fill={f(p.body)} />
      <rect x="90" y="48" width="20" height="25" rx="7" fill={f('#e9a08c')} />
      <ellipse cx="100" cy="61" rx="5" ry="8.5" fill={f(p.accent)} />
      <ellipse cx="100" cy="61" rx="2.6" ry="5.6" fill={f('#d63a2a')} />
      <path d="M68 74 L96 83 M132 74 L104 83" stroke={f(p.accent)} strokeWidth="5" strokeLinecap="round" />
      <circle cx="85" cy="93" r="11" fill={f(p.accent)} />
      <circle cx="115" cy="93" r="11" fill={f(p.accent)} />
      <ellipse cx="86" cy="94" rx="4" ry="6" fill={f('#d63a2a')} />
      <ellipse cx="114" cy="94" rx="4" ry="6" fill={f('#d63a2a')} />
      <circle cx="88" cy="89" r="2" fill={f('#ffffff')} />
      <circle cx="116" cy="89" r="2" fill={f('#ffffff')} />
      <path d="M86 106 Q100 122 114 106Z" fill={f(p.accent)} />
      <ellipse cx="100" cy="114" rx="6" ry="3" fill={f('#c0392b')} />
      <path d="M89 106 L92 112 L95 106Z M105 106 L108 112 L111 106Z" fill={f('#ffffff')} />
      <path d="M64 90 L70 98 L65 105 M117 57 L113 65" stroke={f('#d63a2a')} strokeWidth="2.2" fill="none" strokeLinecap="round" />
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
