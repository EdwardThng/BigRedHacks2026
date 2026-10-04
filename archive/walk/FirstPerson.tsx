import { useEffect, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as THREE from 'three'
import { CreatureArt } from './CreatureArt'
import { CREATURES, type Creature } from './data/creatures'
import { bearingDegrees, distanceMeters, formatDistance, type LatLng } from './game'
import { buildWorld, type WorldData } from './world/buildWorld'
import { createGoogleWorld, GOOGLE_MAPS_KEY, type GoogleWorld } from './world/googleTiles'
import { toLatLng, toLocal } from './world/geo'
import { skyAt, type SkyState } from './world/sky'

/** Render at 1/PIXEL of screen resolution and upscale with nearest-neighbour for the pixel look. */
const PIXEL = GOOGLE_MAPS_KEY ? 2 : 3
const EYE = 1.7
const WALK_SPEED = 1.6
const SHOW_WITHIN = 180
const XRAY_WITHIN = 70

type Props = {
  pos: LatLng | null
  caught: Record<string, string>
  active: Record<string, boolean>
  inRange?: Creature
  demo: boolean
  hourOverride: number | null
  onDemoMove: (p: LatLng) => void
  onEncounter: (c: Creature) => void
  onExit: () => void
}

type Hud = {
  heading: number
  sky: SkyState['label']
  clock: string
  nearest: { c: Creature; d: number; rel: number } | null
}

let worldPromise: Promise<WorldData> | null = null
const loadWorld = () => (worldPromise ??= fetch('/world/cornell.json').then((r) => r.json()))

export function FirstPerson({ pos, caught, active, inRange, demo, hourOverride, onDemoMove, onEncounter, onExit }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [hud, setHud] = useState<Hud>({ heading: 0, sky: 'Day', clock: '', nearest: null })
  const [loading, setLoading] = useState(true)
  const [compassOn, setCompassOn] = useState(false)
  const [noticed, setNoticed] = useState<Creature | null>(null)
  const [attribution, setAttribution] = useState('')
  const [tilesError, setTilesError] = useState<string | null>(null)

  // Live values the render loop reads without re-running the setup effect.
  const live = useRef({
    pos,
    caught,
    active,
    demo,
    hourOverride,
    onDemoMove,
    noticedId: null as string | null,
    compassHeading: null as number | null,
    dragHeading: 0,
    move: 0,
    turn: 0,
  })
  live.current.pos = pos
  live.current.caught = caught
  live.current.active = active
  live.current.demo = demo
  live.current.hourOverride = hourOverride
  live.current.onDemoMove = onDemoMove

  // The creature notices you: "!" pops, then the battle starts. Running away doesn't re-trigger until you leave.
  const dismissed = useRef(new Set<string>())
  useEffect(() => {
    if (!inRange) {
      dismissed.current.clear()
      return
    }
    if (dismissed.current.has(inRange.id)) return
    dismissed.current.add(inRange.id)
    setNoticed(inRange)
    live.current.noticedId = inRange.id
    const t = window.setTimeout(() => {
      setNoticed(null)
      live.current.noticedId = null
      onEncounter(inRange)
    }, 1400)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange?.id])

  useEffect(() => {
    const host = hostRef.current!
    let disposed = false
    let raf = 0

    const renderer = new THREE.WebGLRenderer({ antialias: false })
    renderer.setPixelRatio(1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const canvas = renderer.domElement
    canvas.className = 'fp-canvas'
    host.prepend(canvas)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#c6e9ff', 50, 340)
    const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 1200)
    camera.rotation.order = 'YXZ'
    camera.rotation.x = -0.04

    // Sky dome with a vertical gradient, plus stars, sun and moon.
    const dome = new THREE.SphereGeometry(900, 24, 12)
    dome.setAttribute('color', new THREE.BufferAttribute(new Float32Array(dome.attributes.position.count * 3), 3))
    const domeMesh = new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }))
    scene.add(domeMesh)

    const starPos: number[] = []
    for (let i = 0; i < 700; i++) {
      const u = Math.random() * Math.PI * 2
      const v = Math.random() * 0.9 + 0.08
      starPos.push(Math.cos(u) * Math.cos(v) * 850, Math.sin(v) * 850, Math.sin(u) * Math.cos(v) * 850)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.5, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    const disc = (color: string, glow: string) => {
      const c = document.createElement('canvas')
      c.width = c.height = 32
      const g = c.getContext('2d')!
      g.fillStyle = glow
      g.fillRect(6, 6, 20, 20)
      g.fillStyle = color
      g.fillRect(9, 9, 14, 14)
      const t = new THREE.CanvasTexture(c)
      t.magFilter = THREE.NearestFilter
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, fog: false, depthWrite: false }))
      s.scale.set(70, 70, 1)
      scene.add(s)
      return s
    }
    const sunSprite = disc('#fff3b0', 'rgba(255,214,120,0.5)')
    const moonSprite = disc('#e8ecff', 'rgba(180,200,255,0.35)')

    const hemi = new THREE.HemisphereLight('#ffffff', '#556b2f', 1)
    const sunLight = new THREE.DirectionalLight('#ffffff', 1)
    scene.add(hemi, sunLight)

    let windowMaterial: THREE.MeshLambertMaterial | null = null
    let google: GoogleWorld | null = null
    const useBlockWorld = () => {
      loadWorld().then((data) => {
        if (disposed) return
        const world = buildWorld(data)
        windowMaterial = world.windowMaterial
        scene.add(world.group)
        applySky()
        setLoading(false)
      })
    }
    if (GOOGLE_MAPS_KEY) {
      // Real campus mesh from Google; fall back to the block world if the key or quota fails.
      google = createGoogleWorld(GOOGLE_MAPS_KEY, renderer, camera)
      scene.add(google.root)
      scene.fog = new THREE.Fog('#c6e9ff', 120, 900)
      google.onFirstLoad(() => !disposed && setLoading(false))
      google.onError((message) => {
        if (disposed || !google) return
        console.warn('Google 3D tiles failed, using block world:', message)
        scene.remove(google.root)
        google.dispose()
        google = null
        setTilesError(message)
        useBlockWorld()
      })
    } else {
      useBlockWorld()
    }

    // Creature sprites, pixelated from the same art the app uses.
    const sprites = new Map<string, { sprite: THREE.Sprite; shadow: THREE.Mesh; x: number; z: number; ground: number }>()
    const shadowMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.25, depthWrite: false })
    CREATURES.forEach((c) => {
      const canvas2d = document.createElement('canvas')
      canvas2d.width = canvas2d.height = 64
      const tex = new THREE.CanvasTexture(canvas2d)
      tex.magFilter = THREE.NearestFilter
      tex.minFilter = THREE.NearestFilter
      tex.colorSpace = THREE.SRGBColorSpace
      const draw = (src: string, fallback?: () => void) => {
        const img = new Image()
        img.onload = () => {
          const g = canvas2d.getContext('2d')!
          g.imageSmoothingEnabled = false
          g.clearRect(0, 0, 64, 64)
          g.drawImage(img, 0, 0, 64, 64)
          tex.needsUpdate = true
        }
        if (fallback) img.onerror = fallback
        img.src = src
      }
      const svg = renderToStaticMarkup(<CreatureArt creature={c} size={64} vectorOnly />).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
      draw(`/creatures/${c.id}.png`, () => draw(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`))

      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }))
      sprite.scale.set(4.5, 4.5, 1)
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.6, 8), shadowMat)
      shadow.rotation.x = -Math.PI / 2
      const { x, z } = toLocal(c)
      sprite.position.set(x, 2.4, z)
      shadow.position.set(x, 0.09, z)
      scene.add(sprite, shadow)
      sprites.set(c.id, { sprite, shadow, x, z, ground: 0 })
    })

    // "!" bubble shown when a creature notices you.
    const bang = (() => {
      const c = document.createElement('canvas')
      c.width = 12
      c.height = 16
      const g = c.getContext('2d')!
      g.fillStyle = '#ffffff'
      g.fillRect(1, 0, 10, 13)
      g.fillRect(4, 13, 3, 2)
      g.fillStyle = '#b31b1b'
      g.fillRect(5, 2, 2, 6)
      g.fillRect(5, 9, 2, 2)
      const t = new THREE.CanvasTexture(c)
      t.magFilter = THREE.NearestFilter
      t.minFilter = THREE.NearestFilter
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }))
      s.scale.set(1.6, 2.1, 1)
      s.visible = false
      scene.add(s)
      return s
    })()

    let sky: SkyState | null = null
    const now = () => {
      const d = new Date()
      const h = live.current.hourOverride
      if (h != null) d.setHours(h, 0, 0, 0)
      return d
    }
    function applySky() {
      sky = skyAt(now())
      const top = new THREE.Color(sky.top)
      const bottom = new THREE.Color(sky.bottom)
      const p = dome.attributes.position
      const col = dome.attributes.color as THREE.BufferAttribute
      const tmp = new THREE.Color()
      for (let i = 0; i < p.count; i++) {
        const t = Math.min(1, Math.max(0, (p.getY(i) / 900) * 1.6 + 0.05))
        tmp.copy(bottom).lerp(top, t)
        col.setXYZ(i, tmp.r, tmp.g, tmp.b)
      }
      col.needsUpdate = true
      ;(scene.fog as THREE.Fog).color.set(sky.bottom)
      scene.background = new THREE.Color(sky.bottom)
      hemi.color.set(sky.top).lerp(new THREE.Color('#ffffff'), 0.5)
      hemi.groundColor.set(sky.ground)
      hemi.intensity = sky.ambient * 1.4
      const night = sky.sun < 0.05
      sunLight.color.set(night ? '#8fa8ff' : sky.sunColor)
      sunLight.intensity = night ? 0.25 : sky.sun * 1.6
      const lightDir = night ? sky.moonDir : sky.sunDir
      sunLight.position.set(lightDir[0] * 100, Math.max(lightDir[1], 0.15) * 100, lightDir[2] * 100)
      starMat.opacity = sky.stars
      stars.visible = sky.stars > 0.02
      sunSprite.position.set(sky.sunDir[0] * 800, sky.sunDir[1] * 800, sky.sunDir[2] * 800)
      sunSprite.visible = sky.sunDir[1] > -0.05
      moonSprite.position.set(sky.moonDir[0] * 800, sky.moonDir[1] * 800, sky.moonDir[2] * 800)
      moonSprite.visible = sky.moonDir[1] > 0 && sky.sun < 0.5
      if (windowMaterial) windowMaterial.emissiveIntensity = sky.windows * 0.95
      if (google) {
        // Photo textures have daylight baked in, so darken and cool them for night, warm them at dusk.
        const t = Math.min(1, Math.max(0, (sky.ambient - 0.28) / 0.72))
        const tint = new THREE.Color('#2f3a66').lerp(new THREE.Color('#ffffff'), t)
        if (sky.label === 'Dusk' || sky.label === 'Dawn' || sky.label === 'Golden hour') tint.multiply(new THREE.Color('#ffd2ad'))
        google.setTint(tint)
      }
    }
    applySky()
    const skyTimer = window.setInterval(applySky, 30_000)

    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      renderer.setSize(Math.ceil(w / PIXEL), Math.ceil(h / PIXEL), false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    // Player state in local metres.
    const start = live.current.pos ? toLocal(live.current.pos) : { x: 0, z: 0 }
    const player = { x: start.x, z: start.z, heading: 0, bob: 0 }
    if (live.current.pos) {
      // Face the nearest creature to begin with.
      const near = CREATURES.map((c) => ({ c, d: distanceMeters(live.current.pos!, c) })).sort((a, b) => a.d - b.d)[0]
      player.heading = live.current.dragHeading = bearingDegrees(live.current.pos, near.c)
    }
    let lastReport = 0
    let frame = 0
    let ground = 0
    let groundTarget = 0
    let lastHud = 0
    let lastAttr = 0
    let prev = performance.now()

    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - prev) / 1000)
      prev = t
      const L = live.current

      // Heading: compass when available, otherwise drag / keys.
      L.dragHeading += L.turn * 90 * dt
      const want = L.compassHeading ?? L.dragHeading
      const diff = ((want - player.heading + 540) % 360) - 180
      player.heading = (player.heading + diff * Math.min(1, dt * 8) + 360) % 360

      // Position: walk locally in demo mode, otherwise ease toward the GPS fix.
      let speed = 0
      if (L.demo && L.move !== 0) {
        const h = (player.heading * Math.PI) / 180
        player.x += Math.sin(h) * WALK_SPEED * L.move * dt
        player.z -= Math.cos(h) * WALK_SPEED * L.move * dt
        speed = WALK_SPEED
        if (t - lastReport > 150) {
          lastReport = t
          L.onDemoMove(toLatLng(player.x, player.z))
        }
      } else if (L.pos) {
        const target = toLocal(L.pos)
        const dx = target.x - player.x
        const dz = target.z - player.z
        const dist = Math.hypot(dx, dz)
        if (dist > 400) {
          player.x = target.x
          player.z = target.z
        } else {
          const k = 1 - Math.exp(-dt * 2.5)
          player.x += dx * k
          player.z += dz * k
          speed = (dist * k) / Math.max(dt, 1e-3)
        }
      }
      if (speed > 0.4) player.bob += dt * 9
      // Follow the real terrain (Libe Slope, gorges) by raycasting down onto the Google mesh.
      frame++
      if (google && frame % 6 === 0) {
        const g = google.groundAt(player.x, player.z)
        if (g != null) groundTarget = g
        sprites.forEach((s) => {
          if (Math.hypot(s.x - player.x, s.z - player.z) < SHOW_WITHIN) {
            const sg = google!.groundAt(s.x, s.z)
            if (sg != null) s.ground = sg
          }
        })
      }
      ground += (groundTarget - ground) * Math.min(1, dt * 6)
      camera.position.set(player.x, ground + EYE + Math.sin(player.bob) * 0.06, player.z)
      camera.rotation.y = (-player.heading * Math.PI) / 180

      // Creatures bob in place; caught or far ones are hidden.
      sprites.forEach((s, id) => {
        const d = Math.hypot(s.x - player.x, s.z - player.z)
        const show = !L.caught[id] && L.active[id] && d < SHOW_WITHIN
        s.sprite.visible = s.shadow.visible = show
        // Creatures living inside buildings (libraries, labs) show through walls once you're close.
        const xray = d < XRAY_WITHIN
        if (s.sprite.material.depthTest === xray) {
          s.sprite.material.depthTest = !xray
          s.sprite.renderOrder = xray ? 10 : 0
        }
        const hop = L.noticedId === id ? Math.abs(Math.sin(t / 120)) * 0.8 : 0
        s.sprite.position.y = s.ground + 2.4 + Math.sin(t / 400 + s.x) * 0.25 + hop
        s.shadow.position.y = s.ground + 0.09
      })
      const noticedSprite = L.noticedId ? sprites.get(L.noticedId) : null
      bang.visible = !!noticedSprite
      if (noticedSprite) bang.position.set(noticedSprite.x, noticedSprite.sprite.position.y + 3.6 + Math.sin(t / 150) * 0.15, noticedSprite.z)

      google?.update()
      renderer.render(scene, camera)

      if (t - lastHud > 150) {
        lastHud = t
        const here = toLatLng(player.x, player.z)
        const open = CREATURES.filter((c) => !L.caught[c.id] && L.active[c.id])
          .map((c) => ({ c, d: distanceMeters(here, c), b: bearingDegrees(here, c) }))
          .sort((a, b) => a.d - b.d)[0]
        const clock = now().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        if (google && t - lastAttr > 2000) {
          lastAttr = t
          setAttribution(google.attributions())
        }
        setHud({
          heading: player.heading,
          sky: sky?.label ?? 'Day',
          clock,
          nearest: open ? { c: open.c, d: open.d, rel: ((open.b - player.heading + 540) % 360) - 180 } : null,
        })
      }
      if (!disposed) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // Drag to look around when the compass is off.
    let dragX: number | null = null
    const down = (e: PointerEvent) => (dragX = e.clientX)
    const move = (e: PointerEvent) => {
      if (dragX == null || live.current.compassHeading != null) return
      live.current.dragHeading -= (e.clientX - dragX) * 0.35
      dragX = e.clientX
    }
    const up = () => (dragX = null)
    canvas.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)

    // Keyboard walking for laptop testing in demo mode.
    const key = (e: KeyboardEvent, on: boolean) => {
      const k = e.key.toLowerCase()
      if (k === 'w' || k === 'arrowup') live.current.move = on ? 1 : 0
      else if (k === 's' || k === 'arrowdown') live.current.move = on ? -1 : 0
      else if (k === 'a' || k === 'arrowleft') live.current.turn = on ? -1 : 0
      else if (k === 'd' || k === 'arrowright') live.current.turn = on ? 1 : 0
    }
    const kd = (e: KeyboardEvent) => key(e, true)
    const ku = (e: KeyboardEvent) => key(e, false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      clearInterval(skyTimer)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      google?.dispose()
      renderer.dispose()
      canvas.remove()
    }
  }, [])

  // Compass: iOS needs a tap to grant motion access; Android sends absolute orientation.
  const enableCompass = async () => {
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    if (typeof DOE.requestPermission === 'function') {
      try {
        if ((await DOE.requestPermission()) !== 'granted') return
      } catch {
        return
      }
    }
    const handler = (e: DeviceOrientationEvent) => {
      const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      if (ios != null) live.current.compassHeading = ios
      else if (e.absolute && e.alpha != null) live.current.compassHeading = (360 - e.alpha) % 360
    }
    window.addEventListener('deviceorientationabsolute', handler as EventListener)
    window.addEventListener('deviceorientation', handler)
    setCompassOn(true)
  }

  const hold = (dir: 'move' | 'turn', v: number) => ({
    onPointerDown: () => (live.current[dir] = v),
    onPointerUp: () => (live.current[dir] = 0),
    onPointerLeave: () => (live.current[dir] = 0),
    onPointerCancel: () => (live.current[dir] = 0),
  })

  const n = hud.nearest
  const cardinal = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(hud.heading / 45) % 8]

  return (
    <div className="fp" ref={hostRef}>
      <div className="fp-top">
        <button className="fp-chip" onClick={onExit}>
          ← Map
        </button>
        <div className="fp-chip">
          {hud.clock} · {hud.sky}
        </div>
        <div className="fp-chip fp-heading">{cardinal}</div>
      </div>

      {n && !noticed && (
        <div className="fp-hint" style={{ ['--accent' as string]: n.c.palette.body }}>
          <svg viewBox="0 0 24 24" width="22" height="22" style={{ transform: `rotate(${n.rel}deg)` }}>
            <path d="M12 2 L20 21 L12 16 L4 21Z" fill="currentColor" />
          </svg>
          <span>
            {n.d < SHOW_WITHIN ? (caught[n.c.id] ? n.c.name : '???') : n.c.spot} · {formatDistance(n.d)}
          </span>
        </div>
      )}

      {noticed && <div className="fp-noticed pop">{caught[noticed.id] ? noticed.name : 'A wild creature'} noticed you!</div>}

      {!pos && !demo && <div className="fp-wait">Waiting for GPS…</div>}
      {loading && <div className="fp-wait">{GOOGLE_MAPS_KEY && !tilesError ? 'Loading 3D campus…' : 'Building campus…'}</div>}
      {tilesError && <div className="fp-tiles-error">Google 3D unavailable, showing block campus</div>}
      {GOOGLE_MAPS_KEY && !tilesError && (
        <div className="fp-attrib">
          <b>Google</b>
          {attribution && ` · ${attribution}`}
        </div>
      )}

      <div className="fp-bottom">
        {!compassOn && (
          <button className="fp-chip" onClick={enableCompass}>
            Use compass
          </button>
        )}
        {demo && (
          <div className="fp-pad">
            <button aria-label="Turn left" {...hold('turn', -1)}>◀</button>
            <button aria-label="Walk forward" {...hold('move', 1)}>▲</button>
            <button aria-label="Walk back" {...hold('move', -1)}>▼</button>
            <button aria-label="Turn right" {...hold('turn', 1)}>▶</button>
          </div>
        )}
      </div>
    </div>
  )
}
