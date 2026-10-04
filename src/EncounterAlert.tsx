import { useEffect } from 'react'
import { CreatureArt } from './CreatureArt'
import { RARITY_LABEL, type Creature } from './data/creatures'
import { formatDistance } from './game'
import type { Theme } from './theme'

const COUNTDOWN_MS = 3000

type Props = { creature: Creature; theme: Theme; distance: number | null; onGo: () => void; onDismiss: () => void }

/** Pops over the map when you reach a creature, then opens the encounter by itself. */
export function EncounterAlert({ creature, theme, distance, onGo, onDismiss }: Props) {
  useEffect(() => {
    if ('vibrate' in navigator) navigator.vibrate?.([80, 60, 80])
    const t = window.setTimeout(onGo, COUNTDOWN_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creature.id])

  const near = distance != null ? formatDistance(distance) : null
  const rarity = creature.rarity === 'common' ? 'A creature' : `${/^[aeiou]/i.test(RARITY_LABEL[creature.rarity]) ? 'An' : 'A'} ${RARITY_LABEL[creature.rarity].toLowerCase()} creature`

  if (theme === 'night') {
    return (
      <div className="alert-backdrop night" role="alertdialog" aria-label="Signal locked">
        <div className="alert night">
          <div className="alert-row">
            <span className="alert-title">SIGNAL LOCKED</span>
            <span className="rbars">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="on" style={{ height: 4 + i * 5 }} />
              ))}
            </span>
          </div>
          <div className="alert-who">
            <span className="alert-unknown">??</span>
            <span className="alert-text">
              <span className="alert-name">Unknown signal · {creature.spot}</span>
              <span className="alert-meta">
                {RARITY_LABEL[creature.rarity].toUpperCase()}
                {near ? ` · ${near.toUpperCase()}` : ''} · {creature.hours.label.toUpperCase()}
              </span>
            </span>
          </div>
          <div className="alert-timer">
            <div style={{ animationDuration: `${COUNTDOWN_MS}ms` }} />
          </div>
          <span className="alert-count">ENGAGING…</span>
          <div className="alert-actions">
            <button onClick={onDismiss}>CANCEL</button>
            <button className="primary" onClick={onGo}>
              ENGAGE NOW
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="alert-backdrop day" role="alertdialog" aria-label="Creature nearby">
      <div className="alert day">
        <span className="alert-tape" />
        <div className="alert-who">
          <span className="alert-sil">
            <CreatureArt creature={creature} silhouette size={52} vectorOnly />
          </span>
          <span className="alert-text">
            <span className="alert-hand">Something stirs at {creature.spot}!</span>
            <span className="alert-name">
              {rarity} is {near ?? 'close'} away
            </span>
          </span>
        </div>
        <div className="alert-timer">
          <div style={{ animationDuration: `${COUNTDOWN_MS}ms` }} />
        </div>
        <span className="alert-count">OPENING ENCOUNTER…</span>
        <div className="alert-actions">
          <button onClick={onDismiss}>Not now</button>
          <button className="primary" onClick={onGo}>
            Look now
          </button>
        </div>
      </div>
    </div>
  )
}
