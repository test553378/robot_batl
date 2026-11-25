import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const geometries = new Map<string, T.BufferGeometry>()
const materials = new Map<string, T.MeshStandardMaterial>()

function geometry(key: string, make: () => T.BufferGeometry) {
  const existing = geometries.get(key)
  if (existing) return existing
  const created = make()
  geometries.set(key, created)
  return created
}

function material(color: number, finish: Finish) {
  const key = `${color}:${finish}`
  const existing = materials.get(key)
  if (existing) return existing
  const style = {
    paint: { roughness: 0.32, metalness: 0.24 },
    metal: { roughness: 0.34, metalness: 0.62 },
    rubber: { roughness: 0.91, metalness: 0.02 },
    glass: { roughness: 0.22, metalness: 0.36 },
    light: { roughness: 0.4, emissive: color, emissiveIntensity: 1.45 },
  }[finish]
  const created = new T.MeshStandardMaterial({ color, ...style })
  materials.set(key, created)
  return created
}

export type Finish = 'paint' | 'metal' | 'rubber' | 'glass' | 'light'
export type XYZ = readonly [number, number, number]

export function group(parent: T.Object3D, x = 0, y = 0, z = 0) {
  const node = new T.Group()
  node.position.set(x, y, z)
  parent.add(node)
  return node
}

function mesh(parent: T.Object3D, shape: T.BufferGeometry, color: number, at: XYZ, finish: Finish) {
  const node = new T.Mesh(shape, material(color, finish))
  node.position.set(...at)
  parent.add(node)
  return node
}

function outline(parent: T.Object3D, points: readonly (readonly [number, number])[], depth: number,
  bevel: number, color: number, at: XYZ, finish: Finish) {
  const key = `outline:${points.join('|')}:${depth}:${bevel}`
  const shape = geometry(key, () => {
    const profile = new T.Shape()
    profile.moveTo(...points[0])
    points.slice(1).forEach((p) => profile.lineTo(...p))
    profile.closePath()
    const solid = new T.ExtrudeGeometry(profile, {
      depth: depth - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel,
      bevelSize: bevel * 0.78, bevelSegments: 1, steps: 1, curveSegments: 1,
    })
    solid.translate(0, 0, -(depth - 2 * bevel) / 2)
    return solid
  })
  return mesh(parent, shape, color, at, finish)
}

export function plate(parent: T.Object3D, size: XYZ, color: number, at: XYZ,
  bevel = 0.045, finish: Finish = 'paint', taper = 0) {
  const [w, h, depth] = size.map((dimension) => dimension / 2)
  const b = Math.min(bevel, w * 0.48, h * 0.48, depth * 0.48)
  const x = w - b, y = h - b
  const clip = Math.min(Math.max(b * 1.45, 0.012), x * 0.42, y * 0.48)
  return outline(parent, [
    [-x + clip + taper, -y], [x - clip - taper, -y], [x - taper, -y + clip], [x, y - clip],
    [x - clip, y], [-x + clip, y], [-x, y - clip], [-x + taper, -y + clip],
  ], depth * 2, b, color, at, finish)
}

export function facet(parent: T.Object3D, points: readonly (readonly [number, number])[],
  depth: number, color: number, at: XYZ, bevel = 0.02, finish: Finish = 'paint') {
  return outline(parent, points, depth, Math.min(bevel, depth / 3), color, at, finish)
}

export function cylinder(parent: T.Object3D, radius: number, length: number, color: number, at: XYZ,
  axis: 'x' | 'y' | 'z' = 'y', finish: Finish = 'paint', tip = radius, segments = 12) {
  const shape = geometry(`cylinder:${radius}:${tip}:${length}:${segments}`,
    () => new T.CylinderGeometry(tip, radius, length, segments))
  const node = mesh(parent, shape, color, at, finish)
  if (axis === 'x') node.rotation.z = -Math.PI / 2
  if (axis === 'z') node.rotation.x = Math.PI / 2
  return node
}

export function ring(parent: T.Object3D, radius: number, tube: number, color: number, at: XYZ,
  axis: 'x' | 'y' | 'z' = 'z', finish: Finish = 'light', segments = 24) {
  const shape = geometry(`ring:${radius}:${tube}:${segments}`, () => new T.TorusGeometry(radius, tube, 5, segments))
  const node = mesh(parent, shape, color, at, finish)
  if (axis === 'x') node.rotation.y = Math.PI / 2
  if (axis === 'y') node.rotation.x = -Math.PI / 2
  return node
}

export function wheel(parent: T.Object3D, at: XYZ, radius: number, width: number, hubColor: number, side: number) {
  const tire = group(parent, ...at)
  cylinder(tire, radius, width, 0x101625, [0, 0, 0], 'x', 'rubber', radius, 16)
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6
    const tread = plate(tire, [width * 1.04, radius * 0.26, radius * 0.1], 0x262d3c,
      [0, Math.sin(angle) * radius, Math.cos(angle) * radius], 0.01, 'rubber')
    tread.rotation.x = -angle
  }
  const face = side * width / 2
  ring(tire, radius * 0.78, radius * 0.07, 0x374251, [face, 0, 0], 'x', 'rubber')
  cylinder(tire, radius * 0.61, 0.04, hubColor, [face, 0, 0], 'x', 'metal')
  cylinder(tire, radius * 0.38, 0.056, 0x1e2939, [face, 0, 0], 'x', 'metal', radius * 0.38, 8)
  cylinder(tire, radius * 0.18, 0.075, hubColor, [face, 0, 0], 'x', 'metal', radius * 0.18, 6)
}

// Bake static surface groups into one draw call per material. Joint pivots stay in the rig.
export function batchSurfaces(source: T.Group) {
  const batches = new Map<T.Material, T.BufferGeometry[]>()
  source.updateMatrixWorld(true)
  const inverse = source.matrixWorld.clone().invert()
  const matrix = new T.Matrix4()
  source.traverse((object) => {
    if (!(object instanceof T.Mesh) || Array.isArray(object.material)) return
    const parts = batches.get(object.material) ?? []
    const copy = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
    copy.applyMatrix4(matrix.multiplyMatrices(inverse, object.matrixWorld))
    parts.push(copy)
    batches.set(object.material, parts)
  })
  const result = new T.Group()
  for (const [paint, parts] of batches) {
    const shape = mergeGeometries(parts)
    parts.forEach((part) => part.dispose())
    if (shape) result.add(new T.Mesh(shape, paint))
  }
  return result
}
