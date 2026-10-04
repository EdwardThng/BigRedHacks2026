import { useEffect, useRef, useState } from 'react'
import { useCamera } from './camera'
import { CreatureArt } from './CreatureArt'
import type { Creature } from './data/creatures'
import { EncounterAlert } from './EncounterAlert'
import { formatDistance } from './game'
import { useHeading } from './heading'
import type { Theme } from './theme'

/** Half the camera's horizontal view, in degrees: a creature this far off-centre sits at the screen edge. */
const HALF_FOV = 30
/** How close to centre (degrees) counts as looking right at it, and how long to hold it there. */
const LOCK_DEG = 7
const LOCK_MS = 700
/** Drag mode: degrees turned per pixel dragged. */
const DRAG_DEG_PER_PX = 0.25

type Phase = 'search' | 'noticed' | 'found'

type Props = {
  creature: Creature
  theme: Theme
  /** compass bearing from the player to the creature's real spot; null when there is no GPS fix */
  bearing: number | null
  distance: number | null
  onFound: () => void
  onClose: () => void
}

/** Signed difference a - b in degrees, in [-180, 180). */
const angleDiff = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180

/**
 * Near a creature, the camera opens and the player turns the phone to find it. It hides
 * at the real bearing of its spot, so pointing at McGraw Tower points at Kiln.
 */
export function SearchScreen({ creature, theme, bearing, distance, onFound, onClose }: Props) {
  const night = theme === 'night'
  const { videoRef, status: cam } = useCamera(true)
  const compass = useHeading()
  const [phase, setPhase] = useState<Phase>('search')
  // Without a GPS bearing, hide it somewhere off to one side so there is still something to find.
  const [target] = useState(() => bearing ?? 90 + Math.random() * 180)
  const targetRef = useRef(target)
  targetRef.current = bearing ?? target

  // Drag mode (no compass): the player swipes to look around.
  const [dragYaw, setDragYaw] = useState(0)
  const dragFrom = useRef<{ x: number; yaw: number } | null>(null)
  const dragging = compass.status === 'none'

  const yaw = compass.status === 'live' && compass.heading != null ? compass.heading : dragYaw
  const frozen = useRef<number | null>(null)
  const diff = frozen.current ?? angleDiff(targetRef.current, yaw)
  // Phone upright is tilt 90; tilting it down raises the creature on screen, like it is standing in the world.
  const lift = compass.tilt != null && phase === 'search' ? Math.max(-22, Math.min(22, (compass.tilt - 82) * 0.9)) : 0
  const onScreen = Math.abs(diff) < HALF_FOV + 8
  const centred = Math.abs(diff) < LOCK_DEG

  // Hold it in the middle for a moment to lock on.
  const [lockStart, setLockStart] = useState<number | null>(null)
  useEffect(() => {
    if (phase !== 'search') return
    if (!centred) return setLockStart(null)
    if (lockStart == null) return setLockStart(Date.now())
    const t = window.setTimeout(() => {
      frozen.current = diff
      setPhase('noticed')
      if (navigator.vibrate) navigator.vibrate([60, 40, 120])
    }, Math.max(0, LOCK_MS - (Date.now() - lockStart)))
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centred, lockStart, phase])

  // It notices you, does its little "!" hop, then the discovered card pops up.
  useEffect(() => {
    if (phase !== 'noticed') return
    const t = window.setTimeout(() => setPhase('found'), 1100)
    return () => window.clearTimeout(t)
  }, [phase])

  const x = 50 + (diff / HALF_FOV) * 50
  const side = diff > 0 ? 'right' : 'left'
  const far = Math.abs(diff) > 90
  const hint =
    phase !== 'search'
      ? night ? 'TARGET ACQUIRED' : 'It spotted you!'
      : centred
        ? night ? 'HOLD STEADY…' : 'Hold steady…'
        : onScreen
          ? night ? 'SIGNAL ON SCREEN · CENTRE IT' : 'There! Bring it to the middle'
          : night
            ? `SIGNAL ${far ? 'BEHIND YOU' : `TO THE ${side.toUpperCase()}`} · TURN ${side.toUpperCase()}`
            : `It's ${far ? 'behind you' : `off to your ${side}`}, turn ${side}`
  const near = distance != null ? formatDistance(distance) : null

  return (
    <div
      className={`enc search ${theme}`}
      onPointerDown={(e) => dragging && (dragFrom.current = { x: e.clientX, yaw: dragYaw })}
      onPointerMove={(e) => dragFrom.current && setDragYaw(dragFrom.current.yaw - (e.clientX - dragFrom.current.x) * DRAG_DEG_PER_PX)}
      onPointerUp={() => (dragFrom.current = null)}
      onPointerCancel={() => (dragFrom.current = null)}
    >
      <video ref={videoRef} className={`enc-video ${cam === 'on' ? 'live' : ''}`} playsInline muted autoPlay aria-hidden="true" />
      {cam !== 'on' && <div className="enc-backdrop" aria-hidden="true" />}
      <div className="search-scan" aria-hidden="true" />

      <header className="enc-head">
        <button className="enc-x" onClick={onClose} aria-label="Stop looking">
          ×
        </button>
        <div className="enc-head-text">
          <span className="enc-title">{night ? `SCANNING · ${creature.spot.toUpperCase()}` : `Something's near ${creature.spot}`}</span>
          <span className="enc-sub">{night ? `${near ? near.toUpperCase() + ' · ' : ''}LOOK AROUND WITH YOUR CAMERA` : `${near ? near + ' away · ' : ''}look around with your camera`}</span>
        </div>
      </header>

      {onScreen && (
        <div className="search-stage" style={{ left: `${x}%`, top: `${54 - lift}%` }}>
          <div className={`search-creature ${phase === 'search' ? (centred ? 'locking' : 'lurk') : 'noticed'}`}>
            {phase !== 'search' && <span className="search-bang">!</span>}
            {centred && phase === 'search' && <span className="search-lock" style={{ animationDuration: `${LOCK_MS}ms` }} />}
            <CreatureArt creature={creature} size={190} form={creature.stages ? 'dozing' : undefined} vectorOnly={!!creature.stages} />
          </div>
        </div>
      )}

      {!onScreen && phase === 'search' && <div className={`search-arrow ${side}`} aria-hidden="true">{side === 'right' ? '›' : '‹'}</div>}

      <div className="search-hint">
        <span>{hint}</span>
        {dragging && phase === 'search' && <span className="search-sub">{night ? 'NO COMPASS · DRAG TO LOOK AROUND' : 'No compass here, so drag to look around'}</span>}
      </div>

      {compass.status === 'asking' && (
        <div className="search-ask">
          <p>{night ? 'Allow motion access so the scanner can follow where your phone points.' : 'Let the journal use your compass so you can point your phone to find it.'}</p>
          <button onClick={compass.request}>{night ? 'START SCANNING' : 'Start looking'}</button>
        </div>
      )}

      {phase === 'found' && <EncounterAlert creature={creature} theme={theme} distance={distance} found onGo={onFound} onDismiss={onClose} />}
    </div>
  )
}
