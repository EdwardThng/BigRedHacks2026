import { useEffect, useRef, useState } from 'react'

export type CamStatus = 'starting' | 'on' | 'off'

/** Rear camera as a live backdrop. Falls back to a drawn scene if blocked or unavailable. */
export function useCamera(enabled: boolean) {
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
