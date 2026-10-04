import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { BigRedBall } from './BigRedBall'
import { CreatureArt } from './CreatureArt'
import { RARITY_LABEL, RARITY_TAG, type Creature, type Stage } from './data/creatures'
import { formatDistance } from './game'
import type { Theme } from './theme'

type Phase = 'appear' | 'ready' | 'throw' | 'shake' | 'miss' | 'transform' | 'caught' | 'card' | 'escape' | 'gone'

/** ?misses=N scripts a demo: the first N throws miss and the next one catches, walking through every Kiln state. */
const FORCED_MISSES = Number(new URLSearchParams(window.location.search).get('misses') ?? 0)
/** ?sure=<id> makes the first throw at that creature a guaranteed catch (end-to-end test on a phone). */
const SURE = new URLSearchParams(window.location.search).get('sure')
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
      success.current = SURE === creature.id || (FORCED_MISSES > 0 ? attempt > FORCED_MISSES : Math.random() < stage.catchRate)
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
        sub: won ? `${creature.brand} · ${creature.name}`.toUpperCase() : lost ? 'TARGET FLED' : staged ? tryLabel : `UNKNOWN SIGNAL${near ? ` · ${near.toUpperCase()}` : ''} · ${rarity.toUpperCase()}`,
      }
    : {
        title: `Field note ${String(creature.number).padStart(3, '0')} · ${creature.spot}`,
        sub: won ? `Gotcha! It's ${creature.brand}'s ${creature.name}.` : lost ? 'It got away.' : staged ? tryLabel : `A wild creature${near ? `, ${near} ahead` : ''}`,
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
  const arena = ARENAS[creature.id]
  const arenaFx =
    phase === 'throw' || phase === 'shake' || phase === 'transform' ? 'flare' : phase === 'miss' ? 'shudder' : phase === 'caught' || phase === 'card' ? 'win' : ''
  const creatureClass =
    phase === 'appear' ? 'enter' : phase === 'throw' ? 'absorb' : phase === 'miss' ? 'burst' : phase === 'transform' ? 'morph' : phase === 'escape' ? 'flee' : 'idle'

  return (
    <div className={`enc ${theme}`}>
      <video ref={videoRef} className={`enc-video ${status === 'on' ? 'live' : ''}`} playsInline muted autoPlay aria-hidden="true" />
      {status !== 'on' && !arena && <div className="enc-backdrop" aria-hidden="true" />}
      {night && !arena && <div className="enc-night-tint" aria-hidden="true" />}
      {arena && <Arena kind={arena} form={staged ? stage.form : 'dozing'} fx={arenaFx} solid={status !== 'on'} />}

      <header className="enc-head">
        <button className="enc-x" onClick={onClose} aria-label="Run away">
          ×
        </button>
        <div className="enc-head-text">
          <span className="enc-title">{header.title}</span>
          <span className="enc-sub">{header.sub}</span>
        </div>
        {night ? <SignalBars /> : RARITY_TAG[creature.rarity] && <span className="enc-rare">{RARITY_TAG[creature.rarity]}</span>}
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
          <div className="entry" role="dialog" aria-label={`${creature.brand} ${creature.name} logged`}>
            <div className="entry-head">
              <span>{night ? `${String(creature.number).padStart(3, '0')} · ${creature.type.toUpperCase()}` : `No. ${String(creature.number).padStart(3, '0')} · ${creature.type}`}</span>
              <span className="entry-rarity">{night ? rarity.toUpperCase() : rarity}</span>
            </div>
            <div className="entry-art">
              <CreatureArt creature={creature} size={170} />
            </div>
            <h2 className="entry-name">{creature.brand}</h2>
            <p className="entry-species">{creature.name}</p>
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

/** Sponsor battle arenas: the company's own logo as the battlefield, reacting to the fight. */
type ArenaKind = 'palantir' | 'anthropic' | 'spacex' | 'capitalone' | 'cec' | 'chili'
const ARENAS: Record<string, ArenaKind> = { scryvern: 'palantir', kiln: 'anthropic', boostling: 'spacex', vaultling: 'capitalone', pitchling: 'cec', chilibao: 'chili' }

function Arena({ kind, form, fx, solid }: { kind: ArenaKind; form: string; fx: string; solid: boolean }) {
  if (kind === 'spacex') {
    return (
      <div className={`arena arena-spacex ${fx} ${solid ? 'solid' : ''}`} aria-hidden="true">
        <div className="arena-stars" />
        <div className="arena-earth" />
        <div className="arena-orbit" />
        <img className="arena-logo" src="/logos/spacex-x.svg" alt="" />
        <img className="arena-word" src="/logos/spacex.svg" alt="" />
      </div>
    )
  }
  if (kind === 'capitalone') {
    return (
      <div className={`arena arena-capitalone ${fx} ${solid ? 'solid' : ''}`} aria-hidden="true">
        <div className="arena-vault">
          <span />
          <span />
          <span />
        </div>
        <img className="arena-logo" src="/logos/capitalone.svg" alt="" />
        <div className="arena-coins">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i * 0.7) % 5}s`, animationDuration: `${4 + (i % 3)}s` }} />
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'cec') {
    // Prism: the club's faceted triangle, echoed in rotating outlines and floating facets.
    const colors = ['#f3dd7f', '#e9c25a', '#c95971', '#d06872', '#d6a393', '#a8c7a3', '#63b3a1', '#4f9b8f', '#b9c876']
    return (
      <div className={`arena arena-cec ${fx} ${solid ? 'solid' : ''}`} aria-hidden="true">
        <svg className="arena-prism" viewBox="-110 -110 220 220">
          <defs>
            <linearGradient id="prism-edge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f3dd7f" />
              <stop offset="0.35" stopColor="#c95971" />
              <stop offset="0.65" stopColor="#d6a393" />
              <stop offset="1" stopColor="#4f9b8f" />
            </linearGradient>
          </defs>
          <polygon className="prism-a" points="0,-100 87,50 -87,50" />
          <polygon className="prism-b" points="0,-70 61,35 -61,35" />
        </svg>
        <div className="arena-facets">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              style={{ left: `${(i * 23) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i * 0.6) % 6}s`, animationDuration: `${6 + (i % 4)}s` }}
            />
          ))}
        </div>
        <ClubLogo />
      </div>
    )
  }
  if (kind === 'chili') {
    // Asian Chili Spot: no logo, so pure heat. Flames along the bottom, embers, a red-hot glow.
    return (
      <div className={`arena arena-chili ${fx} ${solid ? 'solid' : ''}`} aria-hidden="true">
        <div className="arena-heat" />
        <div className="arena-flames">
          {Array.from({ length: 11 }).map((_, i) => (
            <span
              key={i}
              style={{ left: `${i * 9.5 - 4}%`, height: `${26 + ((i * 37) % 22)}vh`, animationDelay: `${(i * 0.17) % 0.9}s`, animationDuration: `${0.7 + (i % 3) * 0.18}s` }}
            />
          ))}
        </div>
        <div className="arena-embers">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} style={{ left: `${(i * 29) % 100}%`, animationDelay: `${(i * 0.37) % 3}s`, animationDuration: `${2 + (i % 4) * 0.4}s` }} />
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'palantir') {
    return (
      <div className={`arena arena-palantir ${fx} ${solid ? 'solid' : ''}`} aria-hidden="true">
        <div className="arena-rings">
          <span />
          <span />
          <span />
        </div>
        <img className="arena-logo" src="/logos/palantir-symbol.svg" alt="" />
        <img className="arena-word" src="/logos/palantir.svg" alt="" />
      </div>
    )
  }
  return (
    <div className={`arena arena-anthropic form-${form} ${fx} ${solid ? 'solid' : ''}`} aria-hidden="true">
      <div className="arena-tile" />
      <img className="arena-logo" src="/logos/anthropic.svg" alt="" />
      {form === 'furious' && (
        <div className="arena-embers">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.43) % 3}s`, animationDuration: `${2.4 + (i % 4) * 0.5}s` }} />
          ))}
        </div>
      )}
    </div>
  )
}

/** CEC's logo badge (public/logos/cec.png); a typographic stand-in if the file is missing. */
function ClubLogo() {
  const [ok, setOk] = useState(true)
  if (!ok) return <span className="arena-cec-text">CEC</span>
  return <img className="arena-badge" src="/logos/cec.png" alt="" onError={() => setOk(false)} />
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
