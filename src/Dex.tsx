import { useState } from 'react'
import { CreatureArt } from './CreatureArt'
import { CREATURES, type Creature } from './data/creatures'

type Props = { caught: Record<string, string>; highlight?: string | null; onReset: () => void }

export function Dex({ caught, highlight, onReset }: Props) {
  const [open, setOpen] = useState<Creature | null>(null)
  const count = CREATURES.filter((c) => caught[c.id]).length

  return (
    <div className="dex">
      <header className="dex-header">
        <h1>Big Red Dex</h1>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${(count / CREATURES.length) * 100}%` }} />
        </div>
        <p className="muted">
          {count} of {CREATURES.length} discovered
        </p>
      </header>

      <div className="dex-grid">
        {CREATURES.map((c) => {
          const got = !!caught[c.id]
          return (
            <button
              key={c.id}
              className={`dex-slot ${got ? 'got' : ''} ${highlight === c.id ? 'new' : ''}`}
              onClick={() => got && setOpen(c)}
              style={{ ['--accent' as string]: c.palette.body }}
            >
              <span className="dex-num">#{String(c.number).padStart(3, '0')}</span>
              <CreatureArt creature={c} silhouette={!got} size={96} />
              <span className="dex-name">{got ? c.name : '???'}</span>
              <span className="dex-spot">{got ? c.spot : 'Undiscovered'}</span>
              {highlight === c.id && <span className="new-badge">NEW</span>}
            </button>
          )
        })}
      </div>

      <button className="link" onClick={onReset}>
        Reset progress
      </button>

      {open && (
        <div className="modal" onClick={() => setOpen(null)}>
          <div className="dex-card" style={{ ['--accent' as string]: open.palette.body }} onClick={(e) => e.stopPropagation()}>
            <div className="dex-card-head">
              <span>#{String(open.number).padStart(3, '0')}</span>
              <span className="type-pill">{open.type}</span>
            </div>
            <div className="dex-card-art">
              <CreatureArt creature={open} size={170} />
            </div>
            <h2>{open.name}</h2>
            <p className="dex-card-spot">
              {open.spot} · {open.hours.label}
            </p>
            <p className="dex-card-lore">{open.lore}</p>
            <p className="muted small">Caught {new Date(caught[open.id]).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}
