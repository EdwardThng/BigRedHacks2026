import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { TilesRenderer } from '3d-tiles-renderer'
import {
  GLTFExtensionsPlugin,
  GoogleCloudAuthPlugin,
  ReorientationPlugin,
  TileCompressionPlugin,
  UnloadTilesPlugin,
} from '3d-tiles-renderer/plugins'
import { ORIGIN } from './geo'

export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined

const DEG = Math.PI / 180
// Rough ellipsoid height of central campus, so the ground lands near y = 0; raycasts refine it.
const ORIGIN_HEIGHT = 215

export type GoogleWorld = {
  root: THREE.Group
  update: () => void
  groundAt: (x: number, z: number) => number | null
  setTint: (c: THREE.Color) => void
  attributions: () => string
  onFirstLoad: (fn: () => void) => void
  onError: (fn: (message: string) => void) => void
  dispose: () => void
}

/** Google Photorealistic 3D Tiles, re-centred so x = east, z = south, y = up (metres). */
export function createGoogleWorld(key: string, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): GoogleWorld {
  const tiles = new TilesRenderer()
  const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: key, autoRefreshToken: true }))
  tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: draco }))
  tiles.registerPlugin(new TileCompressionPlugin())
  tiles.registerPlugin(new UnloadTilesPlugin())
  tiles.registerPlugin(new ReorientationPlugin({ lat: ORIGIN.lat * DEG, lon: ORIGIN.lng * DEG, height: ORIGIN_HEIGHT }))
  tiles.setCamera(camera)
  tiles.setResolutionFromRenderer(camera, renderer)

  // The plugin faces X west and Z north; spin 180° so it matches the app's east/south axes.
  const root = new THREE.Group()
  root.rotation.y = Math.PI
  root.add(tiles.group)

  const tint = new THREE.Color('#ffffff')
  const paint = (obj: THREE.Object3D) =>
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const mat = m as THREE.MeshBasicMaterial
        if (mat.color) mat.color.copy(tint)
      }
    })

  let firstLoad: (() => void) | null = null
  let errorFn: ((m: string) => void) | null = null
  let loaded = false
  tiles.addEventListener('load-model', (e: { scene: THREE.Object3D }) => {
    paint(e.scene)
    if (!loaded) {
      loaded = true
      firstLoad?.()
    }
  })
  tiles.addEventListener('load-error', (e: { error?: Error; url?: string | URL }) => {
    if (!loaded) errorFn?.(e.error?.message ?? 'Could not load Google 3D tiles')
  })

  const ray = new THREE.Raycaster()
  ;(ray as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true
  const down = new THREE.Vector3(0, -1, 0)

  return {
    root,
    update() {
      camera.updateMatrixWorld()
      tiles.setResolutionFromRenderer(camera, renderer)
      tiles.update()
    },
    groundAt(x, z) {
      ray.set(new THREE.Vector3(x, 800, z), down)
      ray.far = 2000
      const hit = ray.intersectObject(tiles.group, true)[0]
      return hit ? hit.point.y : null
    },
    setTint(c) {
      tint.copy(c)
      tiles.forEachLoadedModel((scene) => paint(scene))
    },
    attributions() {
      return tiles
        .getAttributions()
        .filter((a) => a.type === 'string')
        .map((a) => String(a.value))
        .join(' · ')
    },
    onFirstLoad(fn) {
      firstLoad = fn
      if (loaded) fn()
    },
    onError(fn) {
      errorFn = fn
    },
    dispose() {
      tiles.dispose()
      draco.dispose()
    },
  }
}
