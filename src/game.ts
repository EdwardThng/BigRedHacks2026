import { useEffect, useRef, useState } from 'react'
import { clearCatches, fetchCatches, saveCatch, saveVisit, touchProfile } from './lib/supabase'

export type LatLng = { lat: number; lng: number }

export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function bearingDegrees(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

/** Warmer/colder label for the hunt. */
export function heat(m: number) {
  if (m < 60) return { label: 'Burning hot', color: '#dc2626' }
  if (m < 150) return { label: 'Hot', color: '#f97316' }
  if (m < 350) return { label: 'Warm', color: '#eab308' }
  if (m < 800) return { label: 'Cool', color: '#38bdf8' }
  return { label: 'Freezing', color: '#6366f1' }
}

export type GeoStatus = 'locating' | 'ok' | 'denied' | 'unavailable'

/**
 * The device's live position. Browsers often send a coarse Wi-Fi fix first and
 * sharpen it as GPS warms up, so a worse fix only replaces a better one once
 * the better one is stale.
 */
export function usePosition() {
  const [pos, setPos] = useState<LatLng | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [status, setStatus] = useState<GeoStatus>('locating')
  const [attempt, setAttempt] = useState(0)
  const best = useRef<{ acc: number; at: number } | null>(null)

  useEffect(() => {
    if (!('geolocation' in navigator) || !window.isSecureContext) {
      setStatus('unavailable')
      return
    }
    setStatus('locating')
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const acc = p.coords.accuracy
        const prev = best.current
        if (prev && acc > prev.acc && p.timestamp - prev.at < 10000) return
        best.current = { acc, at: p.timestamp }
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
        setAccuracy(acc)
        setStatus('ok')
      },
      (e) => setStatus(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [attempt])

  const retry = () => {
    best.current = null
    setAttempt((a) => a + 1)
  }
  return { pos, accuracy, status, retry }
}

const STORAGE_KEY = 'bigreddex:caught'

function loadCaught(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

/**
 * Map of creature id to the ISO time it was caught. Local storage is the
 * instant cache; Supabase (when configured) is the source of truth across devices.
 */
export function useCaught() {
  const [caught, setCaught] = useState<Record<string, string>>(loadCaught)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(caught))
    } catch {
      // storage unavailable; progress lasts for this session only
    }
  }, [caught])

  // Pull the server Dex once, merge it in, and upload anything caught offline.
  useEffect(() => {
    let cancelled = false
    fetchCatches().then((rows) => {
      if (!rows || cancelled) return
      const server = Object.fromEntries(rows.map((r) => [r.creature_id, r.caught_at]))
      setCaught((local) => {
        for (const [id, at] of Object.entries(local)) {
          if (!server[id]) saveCatch({ creature_id: id, caught_at: at, lat: null, lng: null, accuracy_m: null })
        }
        return { ...server, ...local }
      })
    })
    touchProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const add = (id: string, where?: { pos: LatLng | null; accuracy: number | null }) => {
    const at = new Date().toISOString()
    setCaught((c) => (c[id] ? c : { ...c, [id]: at }))
    saveCatch({
      creature_id: id,
      caught_at: at,
      lat: where?.pos?.lat ?? null,
      lng: where?.pos?.lng ?? null,
      accuracy_m: where?.accuracy ?? null,
    })
  }
  const reset = () => {
    setCaught({})
    clearCatches()
  }
  return { caught, add, reset }
}

/** Logs a visit each time the player walks into a creature's habitat. */
export function useVisitLog(habitatId: string | undefined, pos: LatLng | null, accuracy: number | null) {
  const last = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (habitatId && habitatId !== last.current && pos) saveVisit(habitatId, pos.lat, pos.lng, accuracy)
    last.current = habitatId
    // Only fire on habitat changes, not every GPS tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitatId])
}
