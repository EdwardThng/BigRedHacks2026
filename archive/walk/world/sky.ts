import * as SunCalc from 'suncalc'
import { ORIGIN } from './geo'

export type SkyState = {
  label: 'Night' | 'Dawn' | 'Day' | 'Golden hour' | 'Dusk'
  top: string
  bottom: string
  ground: string
  ambient: number
  sun: number
  sunColor: string
  windows: number
  stars: number
  /** unit vector toward the sun in world space (north = -z) */
  sunDir: [number, number, number]
  moonDir: [number, number, number]
  sunAltDeg: number
}

type Key = { alt: number; top: string; bottom: string; ground: string; ambient: number; sun: number; sunColor: string; windows: number; stars: number }

// Keyframes by sun altitude in degrees; values in between are blended.
const KEYS: Key[] = [
  { alt: -18, top: '#070b1f', bottom: '#141c3d', ground: '#1a2238', ambient: 0.28, sun: 0, sunColor: '#8fa8ff', windows: 1, stars: 1 },
  { alt: -8, top: '#16204a', bottom: '#4b3b6b', ground: '#2a2a44', ambient: 0.4, sun: 0, sunColor: '#8fa8ff', windows: 0.9, stars: 0.6 },
  { alt: -2, top: '#2e4a8a', bottom: '#f08a5d', ground: '#5a4a52', ambient: 0.6, sun: 0.25, sunColor: '#ff9a5c', windows: 0.5, stars: 0.1 },
  { alt: 6, top: '#5d8fdc', bottom: '#ffc58f', ground: '#8a8a70', ambient: 0.8, sun: 0.7, sunColor: '#ffc27a', windows: 0.1, stars: 0 },
  { alt: 20, top: '#3f9bff', bottom: '#c6e9ff', ground: '#a8b890', ambient: 1, sun: 1.1, sunColor: '#fff4d6', windows: 0, stars: 0 },
]

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}

function dirFrom(azimuth: number, altitude: number): [number, number, number] {
  // SunCalc azimuth is measured from south, clockwise toward west.
  const fromNorth = azimuth + Math.PI
  return [Math.sin(fromNorth) * Math.cos(altitude), Math.sin(altitude), -Math.cos(fromNorth) * Math.cos(altitude)]
}

/** Sky, light and window glow for the real sun position over Ithaca at `date`. */
export function skyAt(date: Date): SkyState {
  const sun = SunCalc.getPosition(date, ORIGIN.lat, ORIGIN.lng)
  const moon = SunCalc.getMoonPosition(date, ORIGIN.lat, ORIGIN.lng)
  const alt = (sun.altitude * 180) / Math.PI

  let i = KEYS.findIndex((k) => alt < k.alt)
  if (i === -1) i = KEYS.length
  const a = KEYS[Math.max(0, i - 1)]
  const b = KEYS[Math.min(KEYS.length - 1, i)]
  const t = a === b ? 0 : (alt - a.alt) / (b.alt - a.alt)
  const lerp = (x: number, y: number) => x + (y - x) * t

  const morning = date.getHours() < 12
  const label: SkyState['label'] =
    alt < -8 ? 'Night' : alt < 0 ? (morning ? 'Dawn' : 'Dusk') : alt < 10 ? (morning ? 'Dawn' : 'Golden hour') : 'Day'

  return {
    label,
    top: mixHex(a.top, b.top, t),
    bottom: mixHex(a.bottom, b.bottom, t),
    ground: mixHex(a.ground, b.ground, t),
    ambient: lerp(a.ambient, b.ambient),
    sun: lerp(a.sun, b.sun),
    sunColor: mixHex(a.sunColor, b.sunColor, t),
    windows: lerp(a.windows, b.windows),
    stars: lerp(a.stars, b.stars),
    sunDir: dirFrom(sun.azimuth, sun.altitude),
    moonDir: dirFrom(moon.azimuth, moon.altitude),
    sunAltDeg: alt,
  }
}
