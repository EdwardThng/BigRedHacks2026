import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { BigRedBall } from './BigRedBall'
import { CreatureArt } from './CreatureArt'
import { RARITY_LABEL, type Creature } from './data/creatures'
import { formatDistance } from './game'
import type { Theme } from './theme'

type Phase = 'appear' | 'ready' | 'throw' | 'shake' | 'caught' | 'card'
type CamStatus = 'starting' | 'on' | 'off'

type Props = {
  creature: Creature
  theme: Theme
  distance: number | null
  onCaught: () => void
  onClose: () => void
  onOpenDex: () => void
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

export function CatchScreen({ creature, theme, distance, onCaught, onClose, onOpenDex }: Props) {
  const night = theme === 'night'
  const [phase, setPhase] = useState<Phase>('appear')
  const [camWanted, setCamWanted] = useState(true)
  const { videoRef, status } = useCamera(camWanted)
  const [drag, setDrag] = useState(0)
  const dragStart = useRef<number | null>(null)

  useEffect(() => {
    const timers: number[] = []
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    if (phase === 'appear') after(1300, () => setPhase('ready'))
    if (phase === 'throw') after(750, () => setPhase('shake'))
    if (phase === 'shake') after(2700, () => setPhase('caught'))
    if (phase === 'caught') {
      onCaught()
      burst(night ? ['#ff4b4b', '#ffffff', '#7fe3ff'] : ['#9a1515', '#fbf6ea', '#e0a43a', creature.palette.body])
      after(1700, () => setPhase('card'))
    }
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const throwBall = () => phase === 'ready' && setPhase('throw')
  const showCreature = phase === 'appear' || phase === 'ready' || phase === 'throw'
  const showBall = phase === 'throw' || phase === 'shake' || phase === 'caught'
  const near = distance != null ? formatDistance(distance) : null
  const rarity = RARITY_LABEL[creature.rarity]

  const header = night
    ? {
        title: phase === 'caught' || phase === 'card' ? 'SIGNAL LOGGED' : `ENGAGED · ${creature.spot.toUpperCase()}`,
        sub: phase === 'caught' || phase === 'card' ? creature.name.toUpperCase() : `UNKNOWN SIGNAL${near ? ` · ${near.toUpperCase()}` : ''} · ${rarity.toUpperCase()}`,
      }
    : {
        title: `Field note ${String(creature.number).padStart(3, '0')} · ${creature.spot}`,
        sub: phase === 'caught' || phase === 'card' ? `Gotcha! It's ${creature.name}.` : `A wild creature${near ? `, ${near} ahead` : ''}`,
      }

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

      <button className="enc-cam" onClick={() => setCamWanted((v) => !v)}>
        {status === 'on' ? (night ? 'CAM ON · NIGHT' : 'CAMERA ON') : status === 'starting' ? (night ? 'CAM…' : 'CAMERA…') : night ? 'CAM OFF' : 'CAMERA OFF'}
      </button>

      <div className="enc-stage">
        {night && showCreature && <div className="enc-brackets" aria-hidden="true" />}
        {showCreature && (
          <div className={`enc-creature ${phase === 'appear' ? 'enter' : ''} ${phase === 'throw' ? 'absorb' : 'idle'}`}>
            <CreatureArt creature={creature} size={210} />
          </div>
        )}
        {showBall && (
          <div className={`enc-ball ${phase === 'throw' ? 'flying' : ''} ${phase === 'shake' ? 'shaking' : ''} ${phase === 'caught' ? 'sealed' : ''}`}>
            <BigRedBall size={72} />
          </div>
        )}
        {!night && phase === 'ready' && <div className="enc-note">it's real!! don't scare it</div>}
        {night && showCreature && <div className="enc-target">TARGET · {creature.type.toUpperCase()}-CLASS?</div>}
      </div>

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
