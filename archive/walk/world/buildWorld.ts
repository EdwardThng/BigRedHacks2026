import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

type Pt = [number, number]
export type WorldData = {
  buildings: { p: Pt[]; h: number; n: string }[]
  roads: { p: Pt[]; w: number; k: 'road' | 'foot' | 'water' }[]
  areas: { p: Pt[]; k: 'grass' | 'wood' | 'water' }[]
}

const WALLS = ['#e8dcc4', '#d9c9a8', '#cbb89a', '#e6d6bb', '#c2ae92', '#b8654f', '#d6cdbf']
const ROOFS = ['#7b6f66', '#5f6b73', '#6d5a52', '#85786a']
const AREA_COLORS = { grass: '#7cc46a', wood: '#4f9a4a', water: '#4aa3df' }
const PATH_COLORS = { road: '#6f747d', foot: '#dccb9f', water: '#4aa3df' }
const PATH_HEIGHT = { water: 0.03, road: 0.05, foot: 0.07 }

function hash(i: number) {
  return ((i * 2654435761) >>> 0) / 4294967296
}

function shapeOf(p: Pt[]) {
  // Shape lives in (x, -z) so rotating -90° about X lays it on the ground at the right spot.
  return new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)))
}

/** Pixel-style window tile: base (tinted by vertex colour) and an emissive copy with lit windows. */
function windowTextures() {
  const size = 32
  const base = document.createElement('canvas')
  const lit = document.createElement('canvas')
  base.width = base.height = lit.width = lit.height = size
  const b = base.getContext('2d')!
  const l = lit.getContext('2d')!
  b.fillStyle = '#ffffff'
  b.fillRect(0, 0, size, size)
  l.fillStyle = '#000000'
  l.fillRect(0, 0, size, size)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = c * 8 + 2
      const y = r * 8 + 2
      b.fillStyle = '#7d90a8'
      b.fillRect(x, y, 4, 5)
      if (hash(r * 4 + c + 7) > 0.35) {
        l.fillStyle = hash(r * 4 + c + 99) > 0.5 ? '#ffd36b' : '#ffb347'
        l.fillRect(x, y, 4, 5)
      }
    }
  }
  const make = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestFilter
    t.colorSpace = THREE.SRGBColorSpace
    // One tile covers 4 storeys × 4 bays (≈ 16 m wide, 14.4 m tall).
    t.repeat.set(1 / 16, 1 / 14.4)
    return t
  }
  return { base: make(base), lit: make(lit) }
}

function colorAttr(geo: THREE.BufferGeometry, hex: string) {
  const c = new THREE.Color(hex)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3)
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
}

/** Pull one material group of a non-indexed geometry out as its own geometry. */
function groupSlice(geo: THREE.BufferGeometry, materialIndex: number, keep?: (ny: number) => boolean) {
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  const uv = geo.attributes.uv
  const out = { p: [] as number[], n: [] as number[], u: [] as number[] }
  for (const g of geo.groups) {
    if (g.materialIndex !== materialIndex) continue
    for (let i = g.start; i < g.start + g.count; i += 3) {
      if (keep && !keep(nor.getY(i))) continue
      for (let k = 0; k < 3; k++) {
        out.p.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k))
        out.n.push(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k))
        out.u.push(uv.getX(i + k), uv.getY(i + k))
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.p, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.n, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(out.u, 2))
  return g
}

function ribbon(p: Pt[], width: number, y: number) {
  const pos: number[] = []
  const half = width / 2
  for (let i = 0; i < p.length - 1; i++) {
    const [x1, z1] = p[i]
    const [x2, z2] = p[i + 1]
    const len = Math.hypot(x2 - x1, z2 - z1) || 1
    const nx = (-(z2 - z1) / len) * half
    const nz = ((x2 - x1) / len) * half
    // Extend each segment a little so joints overlap instead of leaving notches.
    const ex = ((x2 - x1) / len) * half * 0.6
    const ez = ((z2 - z1) / len) * half * 0.6
    const a = [x1 - ex + nx, y, z1 - ez + nz]
    const b = [x1 - ex - nx, y, z1 - ez - nz]
    const c = [x2 + ex + nx, y, z2 + ez + nz]
    const d = [x2 + ex - nx, y, z2 + ez - nz]
    pos.push(...a, ...b, ...c, ...b, ...d, ...c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

function pointInPoly(x: number, z: number, p: Pt[]) {
  let inside = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i]
    const [xj, zj] = p[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

export type World = {
  group: THREE.Group
  windowMaterial: THREE.MeshLambertMaterial
}

export function buildWorld(data: WorldData): World {
  const group = new THREE.Group()
  const tex = windowTextures()

  // Buildings: walls with pixel windows, flat roofs.
  const walls: THREE.BufferGeometry[] = []
  const roofs: THREE.BufferGeometry[] = []
  data.buildings.forEach((b, i) => {
    let geo: THREE.ExtrudeGeometry
    try {
      geo = new THREE.ExtrudeGeometry(shapeOf(b.p), { depth: b.h, bevelEnabled: false })
    } catch {
      return
    }
    geo.rotateX(-Math.PI / 2)
    const wall = groupSlice(geo, 1)
    const roof = groupSlice(geo, 0, (ny) => ny > 0.5)
    colorAttr(wall, WALLS[Math.floor(hash(i) * WALLS.length)])
    colorAttr(roof, ROOFS[Math.floor(hash(i + 31) * ROOFS.length)])
    walls.push(wall)
    roofs.push(roof)
    geo.dispose()
  })
  const windowMaterial = new THREE.MeshLambertMaterial({
    vertexColors: true,
    map: tex.base,
    emissiveMap: tex.lit,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0,
  })
  if (walls.length) group.add(new THREE.Mesh(mergeGeometries(walls), windowMaterial))
  if (roofs.length) group.add(new THREE.Mesh(mergeGeometries(roofs), new THREE.MeshLambertMaterial({ vertexColors: true })))

  // Ground.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ color: '#9cc47a' }))
  ground.rotation.x = -Math.PI / 2
  group.add(ground)

  // Lawns, woods, water.
  const areas: THREE.BufferGeometry[] = []
  for (const a of data.areas) {
    const g = new THREE.ShapeGeometry(shapeOf(a.p))
    g.rotateX(-Math.PI / 2)
    g.translate(0, a.k === 'water' ? 0.04 : 0.02, 0)
    colorAttr(g, AREA_COLORS[a.k])
    areas.push(g.toNonIndexed())
  }
  if (areas.length) group.add(new THREE.Mesh(mergeGeometries(areas), new THREE.MeshLambertMaterial({ vertexColors: true })))

  // Roads, footpaths, streams.
  const paths: THREE.BufferGeometry[] = []
  for (const r of data.roads) {
    if (r.p.length < 2) continue
    const g = ribbon(r.p, r.w, PATH_HEIGHT[r.k])
    colorAttr(g, PATH_COLORS[r.k])
    paths.push(g)
  }
  if (paths.length) group.add(new THREE.Mesh(mergeGeometries(paths), new THREE.MeshLambertMaterial({ vertexColors: true })))

  // Blocky trees scattered through woods and lawns.
  const spots: Pt[] = []
  for (const a of data.areas) {
    if (a.k === 'water') continue
    const xs = a.p.map((q) => q[0])
    const zs = a.p.map((q) => q[1])
    const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
    const area = (maxX - minX) * (maxZ - minZ)
    const n = Math.min(400, Math.floor(area / (a.k === 'wood' ? 120 : 900)))
    for (let i = 0; i < n && spots.length < 2500; i++) {
      const x = minX + hash(spots.length * 3 + i) * (maxX - minX)
      const z = minZ + hash(spots.length * 7 + i + 13) * (maxZ - minZ)
      if (pointInPoly(x, z, a.p)) spots.push([x, z])
    }
  }
  if (spots.length) {
    const trunk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 3, 0.6), new THREE.MeshLambertMaterial({ color: '#7a5233' }), spots.length)
    const crown = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshLambertMaterial({ color: '#3f8f3a' }), spots.length)
    const m = new THREE.Matrix4()
    spots.forEach(([x, z], i) => {
      const s = 0.8 + hash(i + 5) * 0.6
      m.makeScale(s, s, s).setPosition(x, 1.5 * s, z)
      trunk.setMatrixAt(i, m)
      m.makeRotationY(hash(i) * Math.PI).scale(new THREE.Vector3(s, s, s)).setPosition(x, 4.5 * s, z)
      crown.setMatrixAt(i, m)
    })
    group.add(trunk, crown)
  }

  return { group, windowMaterial }
}
