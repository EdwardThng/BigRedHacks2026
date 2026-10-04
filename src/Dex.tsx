import { useState } from 'react'
import { CreatureArt } from './CreatureArt'
import { CREATURES, RARITY_LABEL, type Creature } from './data/creatures'
import type { Theme } from './theme'

type Props = {
  theme: Theme
  caught: Record<string, string>
  active: Record<string, boolean>
  highlight?: string | null
  onReset: () => void
}

const num = (c: Creature) => String(c.number).padStart(3, '0')
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const dateOf = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })

/** Day: a field journal of taped specimen cards. Night: a dark signal log. Same data, two looks. */
export function Dex({ theme, caught, active, highlight, onReset }: Props) {
  const [open, setOpen] = useState<Creature | null>(null)
  const count = CREATURES.filter((c) => caught[c.id]).length
  const night = theme === 'night'

  return (
    <div className={`journal ${theme}`}>
      <header className="journal-head">
        <div className="journal-row">
          {night ? <span className="journal-title">SIGNAL LOG</span> : <h1 className="journal-title">Field Journal</h1>}
          <span className="journal-count">{night ? `${count}/${CREATURES.length} LOGGED` : `${count} of ${CREATURES.length} logged`}</span>
        </div>
        {night ? (
          <div className="slog-meter">
            {CREATURES.map((c) => (
              <span key={c.id} className={caught[c.id] ? 'on' : ''} />
            ))}
          </div>
        ) : (
          <div className="journal-meter">
            <div style={{ width: `${(count / CREATURES.length) * 100}%` }} />
          </div>
        )}
      </header>

      {night ? (
        <div className="slog-list">
          {CREATURES.map((c) => {
            const got = caught[c.id]
            const live = !got && active[c.id]
            return (
              <button key={c.id} className={`slog-row ${got ? 'got' : live ? 'live' : 'dormant'}`} onClick={() => got && setOpen(c)} disabled={!got}>
                <span className="slog-art">{got ? <CreatureArt creature={c} size={56} /> : live ? '??' : '··'}</span>
                <span className="slog-text">
                  <span className="slog-kicker">
                    {num(c)} · {got ? c.type.toUpperCase() : live ? 'ACTIVE NOW' : 'DORMANT'}
                    {c.rarity !== 'common' ? ` · ${RARITY_LABEL[c.rarity].toUpperCase()}` : ''}
                  </span>
                  <span className="slog-name">{got ? c.brand : live ? 'Unknown signal' : 'No signal'}</span>
                  {got && <span className="slog-sub">{c.name}</span>}
                  <span className="slog-sub">
                    {c.spot} · {got ? `logged ${timeOf(got)}` : c.hours.label}
                  </span>
                </span>
                {highlight === c.id && <span className="slog-new">NEW</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="jgrid">
          {CREATURES.map((c, i) => {
            const got = caught[c.id]
            const tilt = [-1.5, 1, 0.5, -1, 1.2, -0.6][i % 6]
            return (
              <button
                key={c.id}
                className={`jcard ${got ? 'got' : ''}`}
                style={{ transform: `rotate(${tilt}deg)`, ['--ink' as string]: c.palette.body }}
                onClick={() => got && setOpen(c)}
                disabled={!got}
              >
                {got && <span className="jcard-tape" />}
                <span className="jcard-num">NO. {num(c)}</span>
                <span className="jcard-art">{got ? <CreatureArt creature={c} size={72} /> : '?'}</span>
                <span className="jcard-name">{got ? c.brand : 'Unknown'}</span>
                {got && <span className="jcard-species">{c.name}</span>}
                <span className="jcard-note">{got ? `${c.spot}, ${timeOf(got)}.` : `${c.spot}. ${c.hours.label}.`}</span>
                {c.rarity !== 'common' && !got && <span className="jcard-rare">{c.rarity === 'ultra' ? 'ultra rare!!' : 'rare!'}</span>}
                {highlight === c.id && <span className="jcard-new">new!</span>}
              </button>
            )
          })}
        </div>
      )}

      <button className="journal-reset" onClick={onReset}>
        {night ? 'RESET LOG' : 'Reset progress'}
      </button>

      {open && (
        <div className={`entry-backdrop ${theme}`} onClick={() => setOpen(null)}>
          <div className="entry" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${open.brand} ${open.name}`}>
            <div className="entry-head">
              <span>{night ? `${num(open)} · ${open.type.toUpperCase()}` : `No. ${num(open)} · ${open.type}`}</span>
              <span className="entry-rarity">{night ? RARITY_LABEL[open.rarity].toUpperCase() : RARITY_LABEL[open.rarity]}</span>
            </div>
            <div className="entry-art">
              <CreatureArt creature={open} size={170} />
            </div>
            <h2 className="entry-name">{open.brand}</h2>
            <p className="entry-species">{open.name}</p>
            <p className="entry-where">
              {open.spot} · {open.hours.label}
            </p>
            <p className="entry-lore">{open.lore}</p>
            <p className="entry-foot">
              {night ? `LOGGED ${dateOf(caught[open.id]).toUpperCase()} · ${timeOf(caught[open.id])} · INSPIRED BY ${open.inspiredBy.toUpperCase()}` : `Logged ${dateOf(caught[open.id])}, ${timeOf(caught[open.id])} · inspired by ${open.inspiredBy}`}
            </p>
            <button className="entry-close" onClick={() => setOpen(null)}>
              {night ? 'CLOSE' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
