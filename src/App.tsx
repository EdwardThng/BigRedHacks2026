import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { CREATURES, ENFORCE_HOURS, isActive, type Creature } from './data/creatures'
import { bearingDegrees, distanceMeters, useCaught, usePosition, useVisitLog, type LatLng } from './game'
import { CatchScreen } from './CatchScreen'
import { Dex } from './Dex'
import { MapScreen } from './MapScreen'
import { SearchScreen } from './SearchScreen'
import { useClock, type Theme } from './theme'

const PARAMS = new URLSearchParams(window.location.search)
const DEMO = PARAMS.has('demo')
/** ?time=3 pins the clock to 3am (theme and spawns), handy for showing night mode in daytime. */
const HOUR_OVERRIDE = PARAMS.has('time') ? Number(PARAMS.get('time')) : null
/** ?theme=day|night forces the map style. */
const THEME_OVERRIDE = (['day', 'night'] as const).find((t) => t === PARAMS.get('theme')) ?? null
/** ?sure=kiln keeps that creature out all the time (real GPS still applies); CatchScreen makes the first throw catch it. */
const SURE = PARAMS.get('sure')
// Test runs start fresh: ?sure=<id> forgets that creature on every load, ?fresh forgets every catch.
// Runs before the first render so useCaught reads the cleaned storage.
try {
  if (PARAMS.has('fresh')) {
    localStorage.removeItem('bigreddex:caught')
    localStorage.removeItem('bigreddex:escaped')
  } else if (SURE) {
    for (const key of ['bigreddex:caught', 'bigreddex:escaped']) {
      const saved = JSON.parse(localStorage.getItem(key) || '{}')
      delete saved[SURE]
      localStorage.setItem(key, JSON.stringify(saved))
    }
  }
} catch {
  // storage unavailable; nothing saved to clear
}
/** Most GPS error (metres) that counts toward reaching a catch ring. */
const GPS_SLACK_MAX = 20
/** Within this many metres of an active creature, the camera opens so you can look around for it. */
const SEARCH_RADIUS = 50
const ESCAPED_KEY = 'bigreddex:escaped'
/** An escaped creature stays gone for the rest of its window (Kiln's is 2 hours). */
const ESCAPE_COOLDOWN_MS = 3 * 60 * 60 * 1000

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
  // ?demo&encounter=kiln jumps straight into an encounter (handy for rehearsing the catch).
  const [encounter, setEncounter] = useState<Creature | null>(() => (DEMO ? CREATURES.find((c) => c.id === PARAMS.get('encounter')) ?? null : null))
  // ?demo&search=kiln opens the camera search straight away (rehearsing the find).
  const [search, setSearch] = useState<Creature | null>(() => (DEMO ? CREATURES.find((c) => c.id === PARAMS.get('search')) ?? null : null))
  const [justCaught, setJustCaught] = useState<string | null>(null)

  // Creatures that escaped stay away until their window has passed.
  const [escaped, setEscaped] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(ESCAPED_KEY) || '{}')
    } catch {
      return {}
    }
  })
  const markEscaped = (id: string) =>
    setEscaped((e) => {
      const next = { ...e, [id]: Date.now() }
      try {
        localStorage.setItem(ESCAPED_KEY, JSON.stringify(next))
      } catch {
        // storage unavailable; the escape lasts for this session only
      }
      return next
    })

  // Who is out right now (rarity + time window). Demo mode spawns everyone so recordings always work.
  const active = useMemo(
    () =>
      Object.fromEntries(
        CREATURES.map((c) => {
          const fled = escaped[c.id] != null && Date.now() - escaped[c.id] < ESCAPE_COOLDOWN_MS
          if (c.id === SURE) return [c.id, true]
          return [c.id, (DEMO || !fled) && (DEMO || !ENFORCE_HOURS || isActive(c, now))]
        }),
      ),
    [now, escaped],
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

  // Coming within SEARCH_RADIUS opens the camera search once; closing it mutes that creature until you walk away.
  const nearby = withDistance.find(({ c, d }) => !caught[c.id] && active[c.id] && d <= SEARCH_RADIUS + slack)?.c
  const muted = useRef(new Set<string>())
  useEffect(() => {
    if (!nearby) {
      muted.current.clear()
      return
    }
    if (!encounter && !search && !muted.current.has(nearby.id)) setSearch(nearby)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearby?.id])
  const startSearch = (c: Creature) => {
    muted.current.add(c.id)
    setSearch(c)
  }
  const distanceTo = (c: Creature) => {
    const d = withDistance.find((w) => w.c.id === c.id)?.d
    return d != null && Number.isFinite(d) ? d : null
  }

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
          onEncounter={startSearch}
          onDemoMove={setManualPos}
        />
      ) : (
        <Dex theme={theme} caught={caught} active={active} highlight={justCaught} onReset={reset} />
      )}

      <Tabs theme={theme} tab={tab} onTab={setTab} />

      {search && !encounter && (
        <SearchScreen
          creature={search}
          theme={theme}
          bearing={pos ? bearingDegrees(pos, search) : null}
          distance={distanceTo(search)}
          onFound={() => {
            muted.current.add(search.id)
            setSearch(null)
            setEncounter(search)
          }}
          onClose={() => {
            muted.current.add(search.id)
            setSearch(null)
          }}
        />
      )}

      {encounter && (
        <CatchScreen
          creature={encounter}
          theme={theme}
          distance={distanceTo(encounter)}
          onCaught={() => {
            add(encounter.id, { pos, accuracy })
            setJustCaught(encounter.id)
            setTargetId(null)
          }}
          onClose={() => setEncounter(null)}
          onEscape={() => markEscaped(encounter.id)}
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
