import { useEffect, useRef, useState } from 'react'

/**
 * idle: waiting to start; asking: iOS needs a tap to grant motion access;
 * live: compass readings are arriving; none: no compass, so the player drags to look around.
 */
export type HeadingStatus = 'idle' | 'asking' | 'live' | 'none'

type IOSOrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number }
type PermissionAPI = { requestPermission?: () => Promise<'granted' | 'denied'> }

/**
 * Compass heading of the back camera, from the W3C device-orientation example. It stays
 * right when the phone is held upright, where alpha alone drifts.
 */
function cameraHeading(alpha: number, beta: number, gamma: number) {
  const r = Math.PI / 180
  const [cY, cZ] = [Math.cos(gamma * r), Math.cos(alpha * r)]
  const [sX, sY, sZ] = [Math.sin(beta * r), Math.sin(gamma * r), Math.sin(alpha * r)]
  const vx = -cZ * sY - sZ * sX * cY
  const vy = -sZ * sY + cZ * sX * cY
  return ((Math.atan2(vx, vy) * 180) / Math.PI + 360) % 360
}

/** Where the phone's camera points: compass heading (0 = north) and tilt (90 = upright). */
export function useHeading() {
  const needsTap = typeof (DeviceOrientationEvent as unknown as PermissionAPI)?.requestPermission === 'function'
  const [status, setStatus] = useState<HeadingStatus>(needsTap ? 'asking' : 'idle')
  const [heading, setHeading] = useState<number | null>(null)
  const [tilt, setTilt] = useState<number | null>(null)
  const smooth = useRef<number | null>(null)

  useEffect(() => {
    if (status === 'asking' || status === 'none') return
    let got = false
    const take = (h: number, beta: number | null) => {
      // Ease toward the new reading along the shorter way round, so the creature glides instead of jittering.
      const prev = smooth.current
      const next = prev == null ? h : (prev + ((((h - prev) % 360) + 540) % 360 - 180) * 0.25 + 360) % 360
      smooth.current = next
      got = true
      setHeading(next)
      if (beta != null) setTilt(beta)
      setStatus('live')
    }
    const onAbsolute = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null || e.gamma == null) return
      take(cameraHeading(e.alpha, e.beta, e.gamma), e.beta)
    }
    const onRelative = (e: DeviceOrientationEvent) => {
      const ios = (e as IOSOrientationEvent).webkitCompassHeading
      if (ios != null) return take(ios, e.beta)
      if (e.absolute) onAbsolute(e)
    }
    window.addEventListener('deviceorientationabsolute' as 'deviceorientation', onAbsolute)
    window.addEventListener('deviceorientation', onRelative)
    const t = window.setTimeout(() => !got && setStatus('none'), 2500)
    return () => {
      window.removeEventListener('deviceorientationabsolute' as 'deviceorientation', onAbsolute)
      window.removeEventListener('deviceorientation', onRelative)
      window.clearTimeout(t)
    }
  }, [status])

  /** iOS only: must run inside a tap. */
  const request = () => {
    const api = DeviceOrientationEvent as unknown as PermissionAPI
    api.requestPermission!()
      .then((r) => setStatus(r === 'granted' ? 'idle' : 'none'))
      .catch(() => setStatus('none'))
  }
  return { status, heading, tilt, request }
}
