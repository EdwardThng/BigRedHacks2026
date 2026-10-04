import { useEffect, useState } from 'react'
import * as SunCalc from 'suncalc'

/** Central campus, for sunrise and sunset times. */
const ORIGIN = { lat: 42.4458, lng: -76.4835 }

export type Theme = 'day' | 'night'

const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** Day = field journal (sunrise to sunset); night = radar. Uses the real sun over Ithaca. */
export function themeAt(now: Date): { theme: Theme; switchLabel: string } {
  const today = SunCalc.getTimes(now, ORIGIN.lat, ORIGIN.lng)
  // Ithaca always has a sunrise and sunset; fall back to 7am / 7pm just in case.
  const at = (d: Date | null, h: number) => d ?? new Date(new Date(now).setHours(h, 0, 0, 0))
  const sunrise = at(today.sunrise, 7)
  const sunset = at(today.sunset, 19)
  if (now >= sunrise && now < sunset) {
    return { theme: 'day', switchLabel: `Radar after ${fmt(sunset)}` }
  }
  const sunriseDay = new Date(now)
  if (now >= sunset) sunriseDay.setDate(sunriseDay.getDate() + 1)
  const next = at(SunCalc.getTimes(sunriseDay, ORIGIN.lat, ORIGIN.lng).sunrise, 7)
  return { theme: 'night', switchLabel: `Journal at ${fmt(next)}` }
}

/**
 * The current time (with ?time=H pinning the hour) plus the theme, refreshed every 30s.
 * ?theme=day|night forces a theme for previews.
 */
export function useClock(hourOverride: number | null, forced: Theme | null) {
  const make = () => {
    const d = new Date()
    if (hourOverride != null) d.setHours(hourOverride, 0, 0, 0)
    return d
  }
  const [now, setNow] = useState(make)
  useEffect(() => {
    const id = window.setInterval(() => setNow(make()), 30_000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hourOverride])
  const t = themeAt(now)
  return { now, clock: fmt(now), theme: forced ?? t.theme, switchLabel: t.switchLabel }
}
