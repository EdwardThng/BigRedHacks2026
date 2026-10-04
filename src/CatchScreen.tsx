import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { BigRedBall } from './BigRedBall'
import { CreatureArt } from './CreatureArt'
import type { Creature } from './data/creatures'

type Phase = 'appear' | 'ready' | 'throw' | 'shake' | 'caught' | 'card'

type Props = { creature: Creature; onCaught: () => void; onClose: () => void; onOpenDex: () => void }

export function CatchScreen({ creature, onCaught, onClose, onOpenDex }: Props) {
  const [phase, setPhase] = useState<Phase>('appear')

  useEffect(() => {
    const timers: number[] = []
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))

    if (phase === 'appear') after(1600, () => setPhase('ready'))
    if (phase === 'throw') after(750, () => setPhase('shake'))
    if (phase === 'shake') after(2700, () => setPhase('caught'))
    if (phase === 'caught') {
      onCaught()
      burst(creature.palette.body)
      after(1800, () => setPhase('card'))
    }
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const showCreature = phase === 'appear' || phase === 'ready' || phase === 'throw'

  return (
    <div className="catch">
      <button className="catch-close" onClick={onClose} aria-label="Run away">
        ✕
      </button>

      <div className="catch-banner">
        {phase === 'appear' && <p className="pop">A wild {creature.name} appeared!</p>}
        {phase === 'ready' && <p>Tap the ball to throw</p>}
        {phase === 'shake' && <p>…</p>}
        {phase === 'caught' && <p className="pop">Gotcha! {creature.name} was caught!</p>}
      </div>

      <div className="catch-stage">
        <div className="spot-tag">📍 {creature.spot}</div>
        {showCreature && (
          <div className={`catch-creature ${phase === 'appear' ? 'enter' : ''} ${phase === 'throw' ? 'absorb' : 'idle'}`}>
            <CreatureArt creature={creature} size={220} />
          </div>
        )}
        {(phase === 'throw' || phase === 'shake' || phase === 'caught') && (
          <div className={`ball landed ${phase === 'throw' ? 'flying' : ''} ${phase === 'shake' ? 'shaking' : ''} ${phase === 'caught' ? 'sealed' : ''}`}>
            <Ball />
          </div>
        )}
        {phase === 'caught' && <div className="sparkles">✦ ✧ ✦</div>}
      </div>

      {phase === 'ready' && (
        <button className="ball-launcher" onClick={() => setPhase('throw')} aria-label="Throw ball">
          <Ball />
        </button>
      )}

      {phase === 'card' && (
        <div className="card-reveal">
          <div className="dex-card" style={{ ['--accent' as string]: creature.palette.body }}>
            <div className="dex-card-head">
              <span>#{String(creature.number).padStart(3, '0')}</span>
              <span className="type-pill">{creature.type}</span>
            </div>
            <div className="dex-card-art">
              <CreatureArt creature={creature} size={170} />
            </div>
            <h2>{creature.name}</h2>
            <p className="dex-card-spot">
              {creature.spot} · {creature.hours.label}
            </p>
            <p className="dex-card-lore">{creature.lore}</p>
          </div>
          <p className="added">Added to the Big Red Dex</p>
          <div className="card-actions">
            <button className="btn primary" onClick={onOpenDex}>
              Open Dex
            </button>
            <button className="btn" onClick={onClose}>
              Keep exploring
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Ball() {
  return <BigRedBall size={84} />
}

function burst(color: string) {
  const colors = [color, '#b31b1b', '#ffffff', '#facc15']
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors })
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors }), 250)
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors }), 400)
}
