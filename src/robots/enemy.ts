import * as T from 'three'
import { cylinder, facet, group, plate, ring, wheel, type XYZ } from './geometry'
import type { RobotRig } from './hero'

export const enemyNames = ['ダークスカウト', 'デストロギア', 'グランヴェイル'] as const
export type EnemyModel = 0 | 1 | 2

const iron = 0x171a2b
const steel = 0x41475e
const red = 0xff2635
const profiles = [
  { paint: 0x267455, edge: 0x8be073, energy: 0x9cff8d, span: 0.76, scale: 0.88 },
  { paint: 0x982a36, edge: 0xa5bacb, energy: 0xff773f, span: 0.99, scale: 1 },
  { paint: 0x661db0, edge: 0xe9aa36, energy: 0xba51ff, span: 1.04, scale: 1.13 },
]

function crystal(parent: T.Object3D, x: number, y: number, z: number, radius: number, color: number) {
  facet(parent, [[0, -radius], [radius * 0.75, 0], [0, radius], [-radius * 0.75, 0]],
    radius * 0.48, color, [x, y, z], 0.012, 'light')
}

export function makeEnemy(model: EnemyModel): RobotRig {
  const p = profiles[model]
  const root = new T.Group()
  root.name = enemyNames[model]
  root.scale.setScalar(p.scale)
  const torso = group(root)
  const head = group(torso, 0, 2.98, 0.039)
  const body = group(torso, 0, 2.23, 0)
  const armSocket = group(torso, 0, 2.55, 0)
  const legSocket = group(root, 0, 1.49, 0)
  const arms: RobotRig['arms'] = [group(armSocket, -p.span, 0, 0), group(armSocket, p.span, 0, 0)]
  const legs: RobotRig['legs'] = [group(legSocket, -0.4, 0, 0), group(legSocket, 0.4, 0, 0)]
  cylinder(head, 0.24, 0.42, steel, [0, -0.126, -0.012], 'y', 'metal')
  cylinder(head, 0.31, 0.12, iron, [0, -0.259, -0.012], 'y', 'metal')
  plate(head, [0.78, 0.62, 0.65], iron, [0, 0.31, 0], 0.11, 'metal')
  plate(head, [0.55, 0.31, 0.39], steel, [0, 0.129, 0.161], 0.064, 'metal', 0.08)
  plate(head, [0.78, 0.28, 0.2], p.paint, [0, 0.415, 0.268], 0.077, 'paint', 0.044)
  plate(head, [0.554, 0.18, 0.09], iron, [0, 0.31, 0.344], 0.019, 'glass')
  for (const s of [-1, 1]) {
    const eye = plate(head, [0.21, 0.073, 0.038], red, [s * 0.149, 0.307, 0.395], 0.016, 'light')
    eye.rotation.z = s * 0.32
    facet(head, [[s * 0.14, -0.07], [s * 0.292, -0.047], [s * 0.347, 0.14], [s * 0.22, 0.092]],
      0.155, p.paint, [0, 0.127, 0.269])
    if (model === 2) {
      facet(head, [[s * 0.04, 0.0], [s * 0.25, -0.07], [s * 0.52, 0.23], [s * 0.51, 0.42],
        [s * 0.40, 0.57], [s * 0.39, 0.33], [s * 0.21, 0.14], [s * 0.16, 0.28]],
      0.15, p.edge, [0, 0.44, 0.309], 0.023, 'metal')
    } else if (model === 0) {
      const horn = cylinder(head, 0.109, 0.285, steel, [s * 0.29, 0.653, 0.02], 'y', 'metal', 0.014, 5)
      horn.rotation.z = -s * 0.47
    } else {
      plate(head, [0.254, 0.41, 0.296], p.edge, [s * 0.346, 0.366, 0.022], 0.05, 'metal', 0.04)
      plate(head, [0.227, 0.21, 0.125], p.paint, [s * 0.362, 0.432, 0.156], 0.034)
    }
  }
  crystal(head, 0, 0.515, 0.405, 0.09, model === 2 ? red : p.energy)
  plate(body, [1.54, 0.94, 0.83], iron, [0, 0.08, 0], 0.13, 'metal', 0.17)
  const chestWidth = model === 0 ? 0.52 : 0.66
  facet(body, [[-chestWidth, 0.29], [chestWidth, 0.29], [0.39, -0.19], [0, -0.32], [-0.39, -0.19]], 0.22,
    p.paint, [0, 0.12, 0.414], 0.045)
  facet(body, [[-0.36, 0.245], [0.36, 0.245], [0.233, -0.032], [0, -0.194], [-0.233, -0.032]],
    0.10, p.edge, [0, 0.151, 0.555], 0.025, 'metal')
  facet(body, [[-0.28, 0.187], [0.28, 0.187], [0.177, -0.024], [0, -0.141], [-0.177, -0.024]],
    0.079, iron, [0, 0.151, 0.616], 0.01)
  crystal(body, 0, 0.22, 0.68, model === 2 ? 0.17 : 0.135, p.energy)
  for (const s of [-1, 1]) {
    for (const y of [0.024, 0.114, 0.204]) {
      const rib = plate(body, [0.177, 0.042, 0.045], model === 2 ? 0xa85dec : p.edge,
        [s * 0.46, y, 0.538], 0.009, 'metal')
      rib.rotation.z = s * 0.23
    }
  }
  plate(body, [0.99, 0.39, 0.66], steel, [0, -0.421, 0], 0.098, 'metal', 0.09)
  crystal(body, 0, -0.403, 0.43, 0.142, p.energy)

  for (const [index, side] of [-1, 1].entries()) {
    const arm = arms[index]
    const leg = legs[index]
    cylinder(arm, 0.244, 0.48, steel, [-side * 0.115, -0.04, 0], 'x', 'metal')
    plate(arm, [0.49, 0.67, 0.51], iron, [side * 0.09, -0.36, 0], 0.069, 'metal')
    plate(arm, [0.58, 0.48, 0.57], p.paint, [side * 0.15, -0.72, 0.129], 0.107)
    plate(arm, [0.42, 0.22, 0.113], p.edge, [side * 0.154, -0.662, 0.415], 0.034, 'metal')
    for (const dx of [-0.119, 0, 0.119]) {
      const claw = cylinder(arm, 0.079, 0.29, model === 2 ? p.edge : steel,
        [side * 0.155 + dx, -1.001, 0.22], 'y', 'metal', 0.048, 5)
      claw.rotation.x = -0.33
    }
    if (model === 1) {
      plate(arm, [0.94, 0.63, 0.8], iron, [side * 0.11, 0.126, 0], 0.101, 'metal', 0.04)
      plate(arm, [0.83, 0.36, 0.15], p.paint, [side * 0.11, 0.16, 0.413], 0.056)
      wheel(arm, [side * 0.527, 0.058, 0.025], 0.317, 0.225, p.edge, side)
      for (const offset of [-0.19, 0, 0.19]) {
        plate(arm, [0.119, 0.045, 0.066], p.energy, [side * 0.11 + offset, 0.167, 0.496], 0.01, 'light')
      }
    } else {
      const point = model === 2 ? 0.69 : 0.48
      const pauldron = [[-0.25, -0.11], [-0.24, 0.29], [0.24, 0.39], [point, point + 0.10],
        [point - 0.08, 0.1], [0.49, -0.19], [0.2, -0.26]].map(([x, y]) => [side * x, y] as const)
      facet(arm, pauldron, 0.77, p.edge, [side * 0.023, 0.052, -0.009], 0.045, 'metal')
      facet(arm, pauldron.map(([x, y]) => [x * 0.84, y * 0.86] as const), 0.45, p.paint,
        [side * 0.027, 0.134, 0.216], 0.042)
      crystal(arm, side * 0.28, 0.229, 0.46, 0.113, p.energy)
    }
    if (model === 2) {
      const cape = group(body, side * 0.44, 0.31, -0.424)
      cape.rotation.set(0.28, side * 0.31, side * 0.065)
      facet(cape, [[-0.32, 0.09], [0.28, 0.06], [0.53, -0.83], [0.67, -1.85],
        [0.29, -1.66], [0.13, -1.91], [-0.25, -1.64], [-0.35, -1.18]].map(([x, y]) => [side * x, y] as const),
      0.18, 0x3a174e, [0, 0, 0], 0.026, 'paint')
      facet(cape, [[-0.019, 0.04], [0.137, 0.05], [0.383, -1.49], [0.20, -1.32]]
        .map(([x, y]) => [side * x, y] as const), 0.052, 0x8b286b, [0, 0, 0.099])
    }
    plate(leg, [0.49, 0.74, 0.53], steel, [0, -0.24, 0], 0.081, 'metal', 0.035)
    plate(leg, [0.67, 0.73, 0.69], iron, [side * 0.055, -0.89, 0.09], 0.115, 'metal', -0.024)
    plate(leg, [0.497, 0.552, 0.139], p.paint, [side * 0.05, -0.806, 0.443], 0.063, 'paint', 0.053)
    crystal(leg, side * 0.047, -0.681, 0.528, 0.137, p.energy)
    plate(leg, [0.691, 0.34, 0.93], iron, [side * 0.067, -1.345, 0.21], 0.097, 'metal', -0.032)
    plate(leg, [0.6, 0.21, 0.312], p.edge, [side * 0.067, -1.319, 0.557], 0.058, 'metal', -0.04)
  }

  const weapon = group(arms[1], 0.197, -0.765, 0.33)
  if (model === 0) {
    cylinder(weapon, 0.145, 0.74, steel, [0, 0.016, 0.419], 'z', 'metal', 0.093)
    ring(weapon, 0.108, 0.024, p.energy, [0, 0.016, 0.787])
  } else if (model === 1) {
    plate(weapon, [0.7, 0.42, 0.79], p.paint, [0, 0.02, 0.406], 0.084)
    for (const x of [-0.165, 0.165]) {
      cylinder(weapon, 0.135, 0.4, steel, [x, 0.02, 0.776], 'z', 'metal')
      ring(weapon, 0.091, 0.024, p.energy, [x, 0.02, 0.985])
    }
  } else {
    cylinder(weapon, 0.257, 0.73, p.paint, [0, 0.018, 0.384], 'z', 'paint', 0.18, 8)
    ring(weapon, 0.176, 0.029, p.edge, [0, 0.01, 0.699], 'z', 'metal', 8)
    cylinder(weapon, 0.116, 0.37, p.energy, [0, 0.02, 0.733], 'z', 'light', 0.052, 6)
    for (const side of [-1, 1]) {
      facet(weapon, [[0, -0.15], [side * 0.32, -0.074], [side * 0.35, 0.1], [side * 0.086, 0.21]],
        0.314, p.edge, [0, -0.013, 0.509], 0.025, 'metal')
    }
  }
  const muzzleAt: XYZ = [0, 0.018, 1]
  return { root, torso, head, arms, legs, slots: { head, body, arms: armSocket, legs: legSocket, weapon },
    muzzle: group(weapon, ...muzzleAt) }
}
