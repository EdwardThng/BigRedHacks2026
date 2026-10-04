import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CreatureArt } from './CreatureArt'
import { CREATURES, RARITY_LABEL, RARITY_TAG, type Creature } from './data/creatures'
import { distanceMeters, formatDistance, heat, type GeoStatus, type LatLng } from './game'
import type { Theme } from './theme'

const CAMPUS_CENTER: [number, number] = [42.4458, -76.4835]

type CameraCmd = { kind: 'locate' | 'overview' | 'focus'; id?: string; n: number }

type Props = {
  theme: Theme
  clock: string
  switchLabel: string
  pos: LatLng | null
  accuracy: number | null
  status: GeoStatus
  onRetry: () => void
  demo: boolean
  caught: Record<string, string>
  active: Record<string, boolean>
  /** escaped creatures: id to the time (ms) they come back */
  lockedUntil: Record<string, number>
  target: Creature | null
  inRange?: Creature
  inHabitat?: Creature
  onSelect: (id: string) => void
  onEncounter: (c: Creature) => void
  onDemoMove: (p: LatLng) => void
}

/** 3:12am-style time for lock notes. */
const clockTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase()

/** Darkest usable ink for a creature's labels on paper. */
function inkFor(c: Creature) {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  }
  const pick = lum(c.palette.body) < lum(c.palette.accent) ? c.palette.body : c.palette.accent
  return lum(pick) > 0.55 ? '#2b2419' : pick
}

/** Radar signal: bars 1–4 and a word, from distance. */
function signal(d: number) {
  if (d < 50) return { bars: 4, word: 'STRONG' }
  if (d < 120) return { bars: 3, word: 'STRONG' }
  if (d < 300) return { bars: 2, word: 'MEDIUM' }
  return { bars: 1, word: 'WEAK' }
}

export function MapScreen(props: Props) {
  const { theme, clock, switchLabel, pos, accuracy, status, onRetry, demo, caught, active, lockedUntil, target, inRange, inHabitat, onSelect, onEncounter, onDemoMove } = props
  const [follow, setFollow] = useState(true)
  const [camera, setCamera] = useState<CameraCmd>({ kind: 'overview', n: 0 })
  const night = theme === 'night'
  const logged = CREATURES.filter((c) => caught[c.id]).length

  const select = (id: string) => {
    onSelect(id)
    setFollow(false)
    setCamera((c) => ({ kind: 'focus', id, n: c.n + 1 }))
  }

  return (
    <div className={`map-screen ${theme}`}>
      <MapContainer center={CAMPUS_CENTER} zoom={16} minZoom={14} maxZoom={19} zoomControl={false} className="map">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {CREATURES.map((c) => {
          const d = pos ? distanceMeters(pos, c) : Infinity
          return night ? (
            <RadarBlip key={c.id} creature={c} d={d} caught={!!caught[c.id]} active={!!active[c.id]} selected={target?.id === c.id} locked={inRange?.id === c.id} onSelect={() => select(c.id)} />
          ) : (
            <JournalZone key={c.id} creature={c} caught={!!caught[c.id]} active={!!active[c.id]} selected={target?.id === c.id} inside={inHabitat?.id === c.id || inRange?.id === c.id} onSelect={() => select(c.id)} />
          )
        })}
        {pos && target && !caught[target.id] && (
          <Polyline
            positions={[
              [pos.lat, pos.lng],
              [target.lat, target.lng],
            ]}
            pathOptions={night ? { color: '#ff4b4b', weight: 1.5, dashArray: '3 6', opacity: 0.8 } : { color: '#b31b1b', weight: 3, dashArray: '1 9', lineCap: 'round', opacity: 0.85 }}
            interactive={false}
          />
        )}
        {pos && <Player pos={pos} accuracy={accuracy} night={night} />}
        {demo && <DemoTeleport onMove={onDemoMove} />}
        <CameraController pos={pos} follow={follow} camera={camera} onUserPan={() => setFollow(false)} />
        <ZoomClass />
      </MapContainer>

      <header className="mhead">
        <div className="mhead-row">
          {night ? <span className="mhead-title">BIG RED DEX</span> : <h1 className="mhead-title">Field Journal</h1>}
          <span className="mhead-count">{night ? `${logged}/${CREATURES.length}` : `${logged} of ${CREATURES.length} logged`}</span>
        </div>
        <div className="mhead-sub">
          {night ? 'SCANNING · ' : ''}
          {clock} · {switchLabel}
        </div>
        <GpsChip status={status} accuracy={accuracy} demo={demo} onRetry={onRetry} />
      </header>

      <div className="mctl">
        <button aria-label="Show every spot" onClick={() => (setFollow(false), setCamera((c) => ({ kind: 'overview', n: c.n + 1 })))}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
        <button aria-label="Center on me" className={follow ? 'on' : ''} onClick={() => (setFollow(true), setCamera((c) => ({ kind: 'locate', n: c.n + 1 })))}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" fill={follow ? 'currentColor' : 'none'} />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      </div>

      {night ? (
        <RadarCard target={target} pos={pos} caught={target ? !!caught[target.id] : false} active={target ? !!active[target.id] : false} lockedUntil={target ? lockedUntil[target.id] : undefined} inRange={inRange} onEncounter={onEncounter} />
      ) : (
        <FieldNote target={target} pos={pos} caught={target ? !!caught[target.id] : false} active={target ? !!active[target.id] : false} lockedUntil={target ? lockedUntil[target.id] : undefined} inRange={inRange} inHabitat={inHabitat} onEncounter={onEncounter} />
      )}
    </div>
  )
}

/* ---------------- Day: field journal ---------------- */

function JournalZone({ creature: c, caught, active, selected, inside, onSelect }: { creature: Creature; caught: boolean; active: boolean; selected: boolean; inside: boolean; onSelect: () => void }) {
  const ink = inkFor(c)
  const icon = useMemo(() => {
    const face = caught
      ? `<div class="jz-portrait">${renderToStaticMarkup(<CreatureArt creature={c} size={40} vectorOnly />)}</div>`
      : `<div class="jz-stamp">?</div>`
    const note = caught ? '' : active ? c.note : `not out now · ${c.hours.label}`
    const rare = !RARITY_TAG[c.rarity] || caught ? '' : `<div class="jz-rare">${RARITY_TAG[c.rarity]}</div>`
    return L.divIcon({
      className: '',
      html: `<div class="jz ${caught ? 'caught' : ''} ${active ? '' : 'asleep'} ${selected ? 'selected' : ''} ${inside ? 'inside' : ''}" style="--ink:${ink}">
        ${rare}${face}
        <div class="jz-label">${c.spot.toUpperCase()}${caught ? ' · LOGGED' : ''}</div>
        ${note ? `<div class="jz-note">${note}</div>` : ''}
      </div>`,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
    })
  }, [c, caught, active, selected, inside, ink])

  return (
    <>
      <Circle
        center={[c.lat, c.lng]}
        radius={c.habitat}
        pathOptions={{ stroke: false, fillColor: c.palette.body === '#e9edf2' ? '#8aa0b8' : c.palette.body, fillOpacity: active || caught ? (inside ? 0.38 : 0.24) : 0.1, className: 'jz-wash' }}
        interactive={false}
      />
      {selected && !caught && <Circle center={[c.lat, c.lng]} radius={c.radius} pathOptions={{ color: ink, weight: 1.5, dashArray: '4 6', fill: false }} interactive={false} />}
      <Marker position={[c.lat, c.lng]} icon={icon} eventHandlers={{ click: onSelect }} zIndexOffset={selected ? 500 : 0} />
    </>
  )
}

function FieldNote({ target, pos, caught, active, lockedUntil, inRange, inHabitat, onEncounter }: { target: Creature | null; pos: LatLng | null; caught: boolean; active: boolean; lockedUntil?: number; inRange?: Creature; inHabitat?: Creature; onEncounter: (c: Creature) => void }) {
  if (!target) {
    return (
      <div className="fnote">
        <span className="fnote-hand">Journal complete</span>
        <p className="fnote-clue">Every creature on campus is logged.</p>
      </div>
    )
  }
  const d = pos ? distanceMeters(pos, target) : null
  const rarity = target.rarity === 'common' ? '' : `${RARITY_LABEL[target.rarity]} · `
  if (inRange) {
    return (
      <div className="fnote">
        <div className="fnote-row">
          <span className="fnote-hand">Inside its habitat</span>
          <span className="fnote-dist">{d != null ? `${formatDistance(d)} · burning` : ''}</span>
        </div>
        <p className="fnote-clue big">Something is right here. Look closer.</p>
        <button className="fnote-btn" onClick={() => onEncounter(inRange)}>
          Look closer
        </button>
      </div>
    )
  }
  return (
    <div className="fnote">
      <div className="fnote-row">
        <span className="fnote-hand">
          Field note {String(target.number).padStart(3, '0')} · {target.spot}
        </span>
        <span className="fnote-dist">{d != null ? `${formatDistance(d)} · ${heat(d).label.toLowerCase()}` : 'finding you…'}</span>
      </div>
      <p className="fnote-clue">{target.clue}</p>
      <p className="fnote-meta">
        {caught ? 'Logged' : lockedUntil ? `It escaped · locked until ${clockTime(lockedUntil)}` : `${rarity}${target.hours.label} · ${active ? 'out now' : 'not out right now'}`}
        {inHabitat?.id === target.id && !caught ? ' · you are in its habitat' : ''}
      </p>
    </div>
  )
}

/* ---------------- Night: radar ---------------- */

function RadarBlip({ creature: c, d, caught, active, selected, locked, onSelect }: { creature: Creature; d: number; caught: boolean; active: boolean; selected: boolean; locked: boolean; onSelect: () => void }) {
  const s = signal(d)
  const bucket = Number.isFinite(d) ? Math.round(d / 10) * 10 : -1
  const icon = useMemo(() => {
    let html: string
    if (caught) html = `<div class="rb logged"><span class="rb-x">×</span><span class="rb-label">LOGGED</span></div>`
    else if (!active) html = `<div class="rb dormant"><span class="rb-dot"></span>${selected ? '<span class="rb-label">NO SIGNAL</span>' : ''}</div>`
    else
      html = `<div class="rb s${s.bars} ${locked ? 'locked' : ''} ${selected ? 'selected' : ''}"><span class="rb-ring"></span><span class="rb-dot"></span><span class="rb-label">${
        locked ? 'LOCKED' : bucket >= 0 ? `${s.word} · ${formatDistance(bucket).toUpperCase()}` : s.word
      }</span></div>`
    return L.divIcon({ className: '', html, iconSize: [40, 40], iconAnchor: [20, 20] })
  }, [caught, active, selected, locked, s.bars, s.word, bucket])
  return (
    <>
      {selected && active && !caught && <Circle center={[c.lat, c.lng]} radius={c.radius} pathOptions={{ color: '#ff4b4b', weight: 1, dashArray: '2 6', fill: false }} interactive={false} />}
      <Marker position={[c.lat, c.lng]} icon={icon} eventHandlers={{ click: onSelect }} zIndexOffset={selected ? 500 : 0} />
    </>
  )
}

function Bars({ n }: { n: number }) {
  return (
    <span className="rbars" aria-label={`Signal ${n} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={i <= n ? 'on' : ''} style={{ height: 4 + i * 5 }} />
      ))}
    </span>
  )
}

function RadarCard({ target, pos, caught, active, lockedUntil, inRange, onEncounter }: { target: Creature | null; pos: LatLng | null; caught: boolean; active: boolean; lockedUntil?: number; inRange?: Creature; onEncounter: (c: Creature) => void }) {
  if (!target) {
    return (
      <div className="rcard">
        <span className="rcard-title">ALL SIGNALS LOGGED</span>
      </div>
    )
  }
  const d = pos ? distanceMeters(pos, target) : null
  if (inRange) {
    return (
      <div className="rcard locked">
        <div className="rcard-row">
          <span className="rcard-title">Signal locked{d != null ? ` · ${formatDistance(d)}` : ''}</span>
          <Bars n={4} />
        </div>
        <p className="rcard-clue">Something is moving right in front of you.</p>
        <button className="rcard-btn" onClick={() => onEncounter(inRange)}>
          ENGAGE
        </button>
      </div>
    )
  }
  const s = d != null ? signal(d) : { bars: 0, word: '' }
  return (
    <div className="rcard">
      <div className="rcard-row">
        <span className="rcard-title">{caught ? `Logged · ${target.brand}` : lockedUntil ? `Target fled · ${target.spot}` : active ? `Signal near ${target.spot}` : `No signal · ${target.spot}`}</span>
        <Bars n={active && !caught ? s.bars : 0} />
      </div>
      <p className="rcard-clue">{target.clue}</p>
      <p className="rcard-meta">
        {lockedUntil ? `LOCKED UNTIL ${clockTime(lockedUntil).toUpperCase()}` : `${RARITY_LABEL[target.rarity].toUpperCase()} · ${target.hours.label.toUpperCase()}`}
        {d != null ? ` · ${formatDistance(d).toUpperCase()}` : ''}
      </p>
    </div>
  )
}

/* ---------------- Shared ---------------- */

function Player({ pos, accuracy, night }: { pos: LatLng; accuracy: number | null; night: boolean }) {
  const icon = useMemo(
    () =>
      night
        ? L.divIcon({
            className: '',
            html: `<div class="radar"><svg viewBox="0 0 520 520" width="520" height="520"><circle cx="260" cy="260" r="80"/><circle cx="260" cy="260" r="160"/><circle cx="260" cy="260" r="240"/></svg><div class="radar-sweep"></div><div class="radar-me"></div></div>`,
            iconSize: [520, 520],
            iconAnchor: [260, 260],
          })
        : L.divIcon({ className: '', html: '<div class="jp"><span class="jp-ring"></span><span class="jp-dot"></span></div>', iconSize: [32, 32], iconAnchor: [16, 16] }),
    [night],
  )
  return (
    <>
      {accuracy != null && (
        <Circle center={[pos.lat, pos.lng]} radius={accuracy} pathOptions={night ? { color: '#ffffff', weight: 0.5, fillColor: '#ffffff', fillOpacity: 0.05 } : { color: '#b31b1b', weight: 0.5, fillColor: '#b31b1b', fillOpacity: 0.06 }} interactive={false} />
      )}
      <Marker position={[pos.lat, pos.lng]} icon={icon} interactive={false} zIndexOffset={night ? -1000 : 1000} />
    </>
  )
}

function GpsChip({ status, accuracy, demo, onRetry }: { status: GeoStatus; accuracy: number | null; demo: boolean; onRetry: () => void }) {
  if (status === 'denied' || status === 'unavailable') {
    return (
      <button className="gchip bad" onClick={onRetry}>
        {status === 'denied' ? 'Location blocked · allow it, then tap to retry' : window.isSecureContext ? 'No location fix · tap to retry' : 'Location needs HTTPS'}
        {demo ? ' · demo: tap map to move' : ''}
      </button>
    )
  }
  if (status === 'locating' || accuracy == null) return <div className="gchip">{demo ? 'Demo · tap the map to move' : 'Finding your location…'}</div>
  return (
    <div className={`gchip ${accuracy <= 20 ? 'good' : accuracy <= 60 ? 'ok' : 'bad'}`}>
      GPS ±{Math.round(accuracy)} m{demo ? ' · demo: tap map to move' : ''}
    </div>
  )
}

/** Tags the map with z-low when zoomed out, so notes and labels hide and stamps shrink. */
function ZoomClass() {
  const map = useMap()
  const apply = () => {
    map.getContainer().classList.toggle('z-low', map.getZoom() < 17)
  }
  useMapEvents({ zoomend: apply })
  useEffect(apply)
  return null
}

function DemoTeleport({ onMove }: { onMove: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onMove({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

function CameraController({ pos, follow, camera, onUserPan }: { pos: LatLng | null; follow: boolean; camera: CameraCmd; onUserPan: () => void }) {
  const map = useMap()
  const centeredOnce = useRef(false)
  useMapEvents({ dragstart: onUserPan })

  useEffect(() => {
    if (camera.kind === 'overview') {
      const pts: [number, number][] = CREATURES.map((c) => [c.lat, c.lng])
      if (pos) pts.push([pos.lat, pos.lng])
      const bounds = L.latLngBounds(pts).pad(0.12)
      const opts = { paddingTopLeft: [10, 110] as L.PointTuple, paddingBottomRight: [60, 220] as L.PointTuple }
      if (camera.n) map.flyToBounds(bounds, { ...opts, duration: 0.8 })
      else map.whenReady(() => setTimeout(() => (map.invalidateSize(), map.fitBounds(bounds, opts)), 0))
    } else if (camera.kind === 'locate' && pos) {
      map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 17), { duration: 0.8 })
    } else if (camera.kind === 'focus') {
      const c = CREATURES.find((x) => x.id === camera.id)
      if (c) map.flyTo([c.lat, c.lng], 17, { duration: 0.8 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.n])

  useEffect(() => {
    if (!follow || !pos) return
    if (!centeredOnce.current) {
      centeredOnce.current = true
      map.flyTo([pos.lat, pos.lng], 17, { duration: 0.8 })
    } else {
      map.panTo([pos.lat, pos.lng], { animate: true })
    }
  }, [pos, follow, map])

  return null
}
