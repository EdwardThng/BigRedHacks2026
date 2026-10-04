import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { BigRedBall } from './BigRedBall'
import { CreatureArt } from './CreatureArt'
import { RARITY_LABEL, type Creature, type Stage } from './data/creatures'
import { formatDistance } from './game'
import type { Theme } from './theme'

type Phase = 'appear' | 'ready' | 'throw' | 'shake' | 'miss' | 'transform' | 'caught' | 'card' | 'escape' | 'gone'

/** ?misses=N scripts a demo: the first N throws miss and the next one catches, walking through every Kiln state. */
const FORCED_MISSES = Number(new URLSearchParams(window.location.search).get('misses') ?? 0)
type CamStatus = 'starting' | 'on' | 'off'

type Props = {
  creature: Creature
  theme: Theme
  distance: number | null
  onCaught: () => void
  onClose: () => void
  onOpenDex: () => void
  onEscape: () => void
}

/** Rear camera as a live backdrop. Falls back to a drawn scene if blocked or unavailable. */
function useCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<CamStatus>('starting')

  useEffect(() => {
    if (!enabled) {
      setStatus('off')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('off')
      return
    }
    let stream: MediaStream | null = null
    let cancelled = false
    setStatus('starting')
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().catch(() => {})
        }
        setStatus('on')
      })
      .catch(() => !cancelled && setStatus('off'))
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [enabled])

  return { videoRef, status }
}

export function CatchScreen({ creature, theme, distance, onCaught, onClose, onOpenDex, onEscape }: Props) {
  const night = theme === 'night'
  const [phase, setPhase] = useState<Phase>('appear')
  const [camWanted, setCamWanted] = useState(true)
  const { videoRef, status } = useCamera(camWanted)
  const [drag, setDrag] = useState(0)
  const dragStart = useRef<number | null>(null)

  // Multi-stage encounters (Kiln) count tries; everything else is a single sure catch.
  const stages: Stage[] = creature.stages ?? [{ form: 'dozing', name: '', tries: 1, catchRate: 1, tell: '' }]
  const staged = !!creature.stages
  const totalTries = stages.reduce((n, st) => n + st.tries, 0)
  const [attempt, setAttempt] = useState(1)
  const stageAt = (a: number) => {
    let left = a
    for (const st of stages) {
      if (left <= st.tries) return st
      left -= st.tries
    }
    return stages[stages.length - 1]
  }
  const stage = stageAt(attempt)
  const [shakes, setShakes] = useState(3)
  const success = useRef(false)

  useEffect(() => {
    const timers: number[] = []
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    if (phase === 'appear') after(1300, () => setPhase('ready'))
    if (phase === 'throw') {
      // Decide now so the shake count can tell the story: three shakes and a click, or it bursts out early.
      // With ?misses=N the run is scripted: N misses, then a sure catch (or an escape if N uses every try).
      success.current = FORCED_MISSES > 0 ? attempt > FORCED_MISSES : Math.random() < stage.catchRate
      setShakes(success.current ? 3 : 1 + Math.floor(Math.random() * 2))
      after(750, () => setPhase('shake'))
    }
    if (phase === 'shake') after(shakes * 900, () => setPhase(success.current ? 'caught' : 'miss'))
    if (phase === 'miss') {
      if (navigator.vibrate) navigator.vibrate(120)
      after(1300, () => {
        if (attempt >= totalTries) return setPhase('escape')
        const next = attempt + 1
        setAttempt(next)
        setPhase(stageAt(next) !== stage ? 'transform' : 'ready')
      })
    }
    if (phase === 'transform') after(1800, () => setPhase('ready'))
    if (phase === 'escape') {
      onEscape()
      after(1800, () => setPhase('gone'))
    }
    if (phase === 'caught') {
      onCaught()
      burst(night ? ['#ff4b4b', '#ffffff', '#7fe3ff'] : ['#9a1515', '#fbf6ea', '#e0a43a', creature.palette.body])
      after(1700, () => setPhase('card'))
    }
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const throwBall = () => phase === 'ready' && setPhase('throw')
  const showCreature = ['appear', 'ready', 'throw', 'miss', 'transform', 'escape'].includes(phase)
  const showBall = phase === 'throw' || phase === 'shake' || phase === 'caught'
  const near = distance != null ? formatDistance(distance) : null
  const rarity = RARITY_LABEL[creature.rarity]

  const won = phase === 'caught' || phase === 'card'
  const lost = phase === 'escape' || phase === 'gone'
  const tryLabel = night ? `${stage.name.toUpperCase()} · TRY ${attempt}/${totalTries}` : `It's ${stage.name.toLowerCase()} · try ${attempt} of ${totalTries}`
  const header = night
    ? {
        title: won ? 'SIGNAL LOGGED' : lost ? 'SIGNAL LOST' : `ENGAGED · ${creature.spot.toUpperCase()}`,
        sub: won ? creature.name.toUpperCase() : lost ? 'TARGET FLED' : staged ? tryLabel : `UNKNOWN SIGNAL${near ? ` · ${near.toUpperCase()}` : ''} · ${rarity.toUpperCase()}`,
      }
    : {
        title: `Field note ${String(creature.number).padStart(3, '0')} · ${creature.spot}`,
        sub: won ? `Gotcha! It's ${creature.name}.` : lost ? 'It got away.' : staged ? tryLabel : `A wild creature${near ? `, ${near} ahead` : ''}`,
      }

  // Center banner for the big moments.
  const banner =
    phase === 'miss'
      ? night ? 'BROKE FREE' : 'It broke free!'
      : phase === 'transform'
        ? stage.form === 'furious'
          ? night ? 'FURIOUS · LAST CHANCE' : "It's furious! Last chance."
          : night ? 'TARGET AWAKE' : 'It woke up!'
        : phase === 'escape'
          ? night ? 'TARGET ESCAPED' : 'It flew off!'
          : null
  const mood = staged ? `form-${stage.form}` : ''
  const creatureClass =
    phase === 'appear' ? 'enter' : phase === 'throw' ? 'absorb' : phase === 'miss' ? 'burst' : phase === 'transform' ? 'morph' : phase === 'escape' ? 'flee' : 'idle'

  return (
    <div className={`enc ${theme}`}>
      <video ref={videoRef} className={`enc-video ${status === 'on' ? 'live' : ''}`} playsInline muted autoPlay aria-hidden="true" />
      {status !== 'on' && <div className="enc-backdrop" aria-hidden="true" />}
      {night && <div className="enc-night-tint" aria-hidden="true" />}

      <header className="enc-head">
        <button className="enc-x" onClick={onClose} aria-label="Run away">
          ×
        </button>
        <div className="enc-head-text">
          <span className="enc-title">{header.title}</span>
          <span className="enc-sub">{header.sub}</span>
        </div>
        {night ? <SignalBars /> : creature.rarity !== 'common' && <span className="enc-rare">{creature.rarity === 'ultra' ? 'ultra rare!!' : 'rare!'}</span>}
      </header>

      {staged && !won && phase !== 'gone' && (
        <div className="enc-tries" aria-label={`Try ${attempt} of ${totalTries}`}>
          {stages.map((st, si) => {
            const start = stages.slice(0, si).reduce((n, x) => n + x.tries, 0)
            return (
              <span key={st.form} className={`enc-tries-group g-${st.form} ${st === stage ? 'now' : ''}`}>
                {Array.from({ length: st.tries }).map((_, i) => {
                  const n = start + i + 1
                  return (
                    <span key={n} className={`enc-pip ${n < attempt ? 'used' : n === attempt ? 'cur' : ''}`}>
                      {n}
                    </span>
                  )
                })}
                <span className="enc-tries-name">{night ? st.name.toUpperCase() : st.name}</span>
              </span>
            )
          })}
        </div>
      )}

      <button className="enc-cam" onClick={() => setCamWanted((v) => !v)}>
        {status === 'on' ? (night ? 'CAM ON · NIGHT' : 'CAMERA ON') : status === 'starting' ? (night ? 'CAM…' : 'CAMERA…') : night ? 'CAM OFF' : 'CAMERA OFF'}
      </button>

      <div className="enc-stage">
        {night && showCreature && <div className="enc-brackets" aria-hidden="true" />}
        {showCreature && (
          <div className={`enc-creature ${creatureClass} ${mood}`}>
            <CreatureArt creature={creature} size={210} form={staged ? stage.form : undefined} vectorOnly={staged} />
          </div>
        )}
        {showBall && (
          <div className={`enc-ball ${phase === 'throw' ? 'flying' : ''} ${phase === 'shake' ? 'shaking' : ''} ${phase === 'caught' ? 'sealed' : ''}`}>
            <BigRedBall size={72} />
          </div>
        )}
        {!night && phase === 'ready' && (
          <div className="enc-note">{!staged ? "it's real!! don't scare it" : stage.form === 'dozing' ? 'shh… the third eye is watching' : stage.form === 'awake' ? "it's dodging!!" : 'LAST CHANCE'}</div>
        )}
        {night && showCreature && <div className="enc-target">{staged ? `TARGET · ${stage.name.toUpperCase()}` : `TARGET · ${creature.type.toUpperCase()}-CLASS?`}</div>}
      </div>

      {banner && (
        <div className={`enc-banner ${phase} ${mood}`} role="status">
          <span>{banner}</span>
          {phase === 'transform' && <small>{stage.tell}</small>}
        </div>
      )}

      {phase === 'ready' && (
        <div className="enc-bottom">
          <button
            className="enc-launch"
            aria-label="Throw the ball"
            style={{ transform: `translateY(${drag}px)` }}
            onPointerDown={(e) => {
              dragStart.current = e.clientY
              ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
            }}
            onPointerMove={(e) => dragStart.current != null && setDrag(Math.min(0, e.clientY - dragStart.current))}
            onPointerUp={() => {
              const flicked = drag < -40
              dragStart.current = null
              setDrag(0)
              if (flicked) throwBall()
            }}
            onClick={throwBall}
          >
            <BigRedBall size={84} />
          </button>
          <span className="enc-hint">{night ? 'FLICK UP TO THROW' : 'flick the ball up to throw'}</span>
        </div>
      )}

      {phase === 'card' && (
        <div className={`entry-backdrop ${theme}`}>
          <div className="entry" role="dialog" aria-label={`${creature.name} logged`}>
            <div className="entry-head">
              <span>{night ? `${String(creature.number).padStart(3, '0')} · ${creature.type.toUpperCase()}` : `No. ${String(creature.number).padStart(3, '0')} · ${creature.type}`}</span>
              <span className="entry-rarity">{night ? rarity.toUpperCase() : rarity}</span>
            </div>
            <div className="entry-art">
              <CreatureArt creature={creature} size={170} />
            </div>
            <h2 className="entry-name">{creature.name}</h2>
            <p className="entry-where">
              {creature.spot} · {creature.hours.label}
            </p>
            <p className="entry-lore">{creature.lore}</p>
            <p className="entry-foot">{night ? 'ADDED TO YOUR SIGNAL LOG' : 'Taped into your Field Journal'}</p>
            <div className="enc-actions">
              <button className="entry-close" onClick={onClose}>
                {night ? 'KEEP SCANNING' : 'Keep exploring'}
              </button>
              <button className="entry-close primary" onClick={onOpenDex}>
                {night ? 'OPEN LOG' : 'Open Journal'}
              </button>
            </div>
          </div>
        </div>
      )}
      {phase === 'gone' && (
        <div className={`entry-backdrop ${theme}`}>
          <div className="entry escaped" role="dialog" aria-label="It escaped">
            <div className="entry-head">
              <span>{night ? 'SIGNAL LOST' : 'Field note · escaped'}</span>
              <span className="entry-rarity">{night ? `${totalTries}/${totalTries} TRIES` : `${totalTries} of ${totalTries} tries`}</span>
            </div>
            <div className="entry-art">
              <CreatureArt creature={creature} size={150} form={staged ? stages[stages.length - 1].form : undefined} silhouette vectorOnly />
            </div>
            <h2 className="entry-name">{night ? 'Escaped' : 'It got away'}</h2>
            <p className="entry-lore">
              It flew off over {creature.spot}. It won't be back until its next window ({creature.hours.label}).
            </p>
            <div className="enc-actions single">
              <button className="entry-close primary" onClick={onClose}>
                {night ? 'BACK TO RADAR' : 'Back to the map'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SignalBars() {
  return (
    <span className="rbars" aria-label="Signal 4 of 4">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className="on" style={{ height: 4 + i * 5 }} />
      ))}
    </span>
  )
}

function burst(colors: string[]) {
  confetti({ particleCount: 110, spread: 80, origin: { y: 0.5 }, colors })
  setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors }), 250)
  setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors }), 400)
}
