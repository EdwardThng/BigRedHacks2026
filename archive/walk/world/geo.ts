import type { LatLng } from '../game'

/** Keep in sync with ORIGIN in scripts/build_world.py. */
export const ORIGIN = { lat: 42.4458, lng: -76.4835 }
const M_PER_DEG_LAT = 110_540
const M_PER_DEG_LNG = 111_320 * Math.cos((ORIGIN.lat * Math.PI) / 180)

/** Local metres: x = east, z = south (so north is -z, matching three.js's default forward). */
export function toLocal(p: LatLng) {
  return { x: (p.lng - ORIGIN.lng) * M_PER_DEG_LNG, z: -(p.lat - ORIGIN.lat) * M_PER_DEG_LAT }
}

export function toLatLng(x: number, z: number): LatLng {
  return { lat: ORIGIN.lat - z / M_PER_DEG_LAT, lng: ORIGIN.lng + x / M_PER_DEG_LNG }
}
