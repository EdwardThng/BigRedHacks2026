import { useMemo, useState } from 'react'
import './App.css'
import { CREATURES, ENFORCE_HOURS, isActive, type Creature } from './data/creatures'
import { distanceMeters, useCaught, usePosition, useVisitLog, type LatLng } from './game'
import { CatchScreen } from './CatchScreen'
import { Dex } from './Dex'
import { MapScreen } from './MapScreen'
import { useClock, type Theme } from './theme'

const PARAMS = new URLSearchParams(window.location.search)
const DEMO = PARAMS.has('demo')
/** ?time=3 pins the clock to 3am (theme and spawns), handy for showing night mode in daytime. */
const HOUR_OVERRIDE = PARAMS.has('time') ? Number(PARAMS.get('time')) : null
/** ?theme=day|night forces the map style. */
const THEME_OVERRIDE = (['day', 'night'] as const).find((t) => t === PARAMS.get('theme')) ?? null
/** Most GPS error (metres) that counts toward reaching a catch ring. */
const GPS_SLACK_MAX = 20

type Tab = 'map' | 'dex'

export default function App() {
  const gps = usePosition()
  // ?demo only: tapping the map overrides GPS (backup for recordings).
  const [manualPos, setManualPos] = useState<LatLng | null>(null)
  const pos = DEMO && manualPos ? manualPos : gps.pos
  const accuracy = DEMO && manualPos ? null : gps.accuracy
  const { caught, add, reset } = useCaught()
  const { now, clock, theme, switchLabel } = useClock(HOUR_OVERRIDE, THEME_OVERRIDE)
  const [tab, setTab] = useState<Tab>('map')
  const [targetId, setTargetId] = useState<string | null>(null)
  const [encounter, setEncounter] = useState<Creature | null>(null)
  const [justCaught, setJustCaught] = useState<string | null>(null)

  // Who is out right now (rarity + time window). Demo mode spawns everyone so recordings always work.
  const active = useMemo(
    () => Object.fromEntries(CREATURES.map((c) => [c.id, DEMO || !ENFORCE_HOURS || isActive(c, now)])),
    [now],
  )

  const withDistance = useMemo(() => CREATURES.map((c) => ({ c, d: pos ? distanceMeters(pos, c) : Infinity })), [pos])

  // Default target: the nearest uncaught creature that is out now, else the nearest uncaught one.
  const target = useMemo(() => {
    if (targetId) return CREATURES.find((c) => c.id === targetId) ?? null
    const open = withDistance.filter(({ c }) => !caught[c.id]).sort((a, b) => a.d - b.d)
    return (open.find(({ c }) => active[c.id]) ?? open[0])?.c ?? null
  }, [targetId, withDistance, caught, active])

  // Forgive some GPS error so tight zones still trigger on a phone with a so-so fix.
  const slack = Math.min(accuracy ?? 0, GPS_SLACK_MAX)
  const inRange = withDistance.find(({ c, d }) => !caught[c.id] && active[c.id] && d <= c.radius + slack)?.c
  const inHabitat = withDistance.find(({ c, d }) => !caught[c.id] && d <= c.habitat)?.c
  useVisitLog(withDistance.find(({ c, d }) => d <= c.habitat)?.c.id, pos, accuracy)

  return (
    <div className={`app theme-${theme}`}>
      {tab === 'map' ? (
        <MapScreen
          theme={theme}
          clock={clock}
          switchLabel={switchLabel}
          pos={pos}
          accuracy={accuracy}
          status={gps.status}
          onRetry={gps.retry}
          demo={DEMO}
          caught={caught}
          active={active}
          target={target}
          inRange={inRange}
          inHabitat={inHabitat}
          onSelect={setTargetId}
          onEncounter={setEncounter}
          onDemoMove={setManualPos}
        />
      ) : (
        <Dex caught={caught} highlight={justCaught} onReset={reset} />
      )}

      <Tabs theme={theme} tab={tab} onTab={setTab} />

      {encounter && (
        <CatchScreen
          creature={encounter}
          onCaught={() => {
            add(encounter.id, { pos, accuracy })
            setJustCaught(encounter.id)
            setTargetId(null)
          }}
          onClose={() => setEncounter(null)}
          onOpenDex={() => {
            setEncounter(null)
            setTab('dex')
          }}
        />
      )}
    </div>
  )
}

function Tabs({ theme, tab, onTab }: { theme: Theme; tab: Tab; onTab: (t: Tab) => void }) {
  const labels: Record<Tab, string> = theme === 'night' ? { map: 'MAP', dex: 'LOG' } : { map: 'Map', dex: 'Journal' }
  return (
    <nav className="tabs">
      {(['map', 'dex'] as Tab[]).map((t) => (
        <button key={t} className={tab === t ? 'active' : ''} aria-current={tab === t ? 'page' : undefined} onClick={() => onTab(t)}>
          {labels[t]}
        </button>
      ))}
    </nav>
  )
}
