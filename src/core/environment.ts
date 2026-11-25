import * as T from 'three'
import { cylinder, group, plate, ring } from '../robots/geometry'

const ice = 0x68eaff
const steel = 0x354963

export function lights(scene: T.Scene) {
  scene.add(new T.HemisphereLight(0xe9f8ff, 0x8390b8, 1.65))
  const key = new T.DirectionalLight(0xffe9c4, 2.45)
  key.position.set(4, 10, 7)
  scene.add(key)
  const rim = new T.DirectionalLight(0x91d6ff, 2.1)
  rim.position.set(-3, 5, -6)
  scene.add(rim)
}

function glowStrip(parent: T.Object3D, x: number, y: number, z: number, width: number, color = ice) {
  plate(parent, [width, 0.067, 0.035], color, [x, y, z], 0.01, 'light')
}

export function garage() {
  const root = new T.Group()
  cylinder(root, 9, 0.18, 0x30445d, [0, -0.42, 0], 'y', 'metal', 9, 16)
  cylinder(root, 2.28, 0.43, 0x182a48, [0, -0.23, 0], 'y', 'metal', 2.18, 48)
  cylinder(root, 2.18, 0.067, 0x537b9d, [0, -0.055, 0], 'y', 'metal', 2.15, 48)
  ring(root, 2.06, 0.028, ice, [0, -0.019, 0], 'y', 'light', 64)
  ring(root, 1.57, 0.016, 0x3885ba, [0, -0.019, 0], 'y', 'metal', 48)
  for (let index = 0; index < 12; index++) {
    const lamp = group(root)
    lamp.rotation.y = index * Math.PI / 6
    glowStrip(lamp, 0, -0.163, 2.23, 0.42)
  }
  plate(root, [19, 7, 0.75], 0x182e4d, [0, 2.6, -4.1], 0.1)
  plate(root, [7.5, 4.9, 0.18], 0x213d58, [0, 2.74, -3.66], 0.13, 'metal')
  plate(root, [4.2, 1.5, 0.16], 0x284868, [0, 2.36, -3.53], 0.1)
  for (const side of [-1, 1]) {
    plate(root, [0.83, 6, 0.66], steel, [side * 3.91, 2.57, -3.51], 0.13, 'metal')
    plate(root, [0.164, 4.9, 0.055], ice, [side * 3.94, 2.81, -3.145], 0.022, 'light')
    plate(root, [2.29, 0.68, 1], 0x47627f, [side * 3.42, -0.016, -2.36], 0.12, 'metal')
    for (let index = 0; index < 5; index++) {
      const stripe = plate(root, [0.173, 0.162, 0.039], 0xf1bd3d,
        [side * 3.37 + (index - 2) * 0.345, 0.021, -1.846], 0.011)
      stripe.rotation.z = -0.56
    }
    for (let index = 0; index < 4; index++) glowStrip(root, side * 2.66, 1.04 + index * 0.58, -3.548, 0.83, 0x306c9d)
  }
  return root
}

function randomizer(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export function arena() {
  const root = new T.Group()
  const random = randomizer(84)
  cylinder(root, 8.93, 0.55, 0x2a496a, [0, -0.359, 0], 'y', 'metal', 8.72, 64)
  cylinder(root, 8.73, 0.14, 0x436d95, [0, -0.084, 0], 'y', 'paint', 8.68, 64)
  ring(root, 8.48, 0.053, 0x35cdf9, [0, -0.014, 0], 'y', 'light', 64)
  ring(root, 7.28, 0.034, 0x30b8ff, [0, -0.014, 0], 'y', 'light', 64)
  ring(root, 2.45, 0.032, 0xe8c465, [0, -0.016, 0], 'y', 'paint', 48)
  ring(root, 2.59, 0.021, 0x89b2ca, [0, -0.016, 0], 'y', 'paint', 48)
  for (const x of [-0.65, 0.65]) plate(root, [0.3, 0.015, 1.58], 0xe9c767, [x, -0.009, 0], 0)
  plate(root, [1.26, 0.015, 0.3], 0xe9c767, [0, -0.009, 0], 0)
  for (let index = 0; index < 20; index++) {
    const sector = group(root)
    sector.rotation.y = index * Math.PI / 10
    plate(sector, [0.035, 0.014, 4.64], 0x7497b1, [0, -0.008, 4.91], 0)
    for (let stripe = -1; stripe < 2; stripe++) {
      const mark = plate(sector, [0.22, 0.016, 0.49], 0xf5be4c, [stripe * 0.38, -0.006, 7.99], 0.004)
      mark.rotation.y = 0.43
    }
    // The near rim sits below the sightline so it cannot hide a player against the boundary.
    if (index > 4 && index < 16) {
      plate(sector, [2.63, 0.51, 0.181], 0x526e8d, [0, 0.31, 8.65], 0.09, 'metal')
      plate(sector, [0.105, 0.69, 0.22], 0x9ab9d1, [1.29, 0.322, 8.64], 0.025, 'metal')
      glowStrip(sector, 0, 0.31, 8.55, 1.07)
    }
  }
  cylinder(root, 39, 0.18, 0x7ab5cf, [0, -1.15, 0], 'y', 'paint', 39, 40)
  // Two nearer traffic towers establish the scale of the rooftop.
  for (const [x, z, height] of [[-12.8, -16.4, 4.7], [14.3, -17.8, 5.8]]) {
    const tower = group(root, x, 0, z)
    cylinder(tower, 0.84, height, 0x9bb5d1, [0, height / 2 - 1.03, 0], 'y', 'metal', 0.54, 8)
    cylinder(tower, 1.36, 0.72, 0x38587e, [0, height - 0.86, 0], 'y', 'metal', 1.64, 8)
    cylinder(tower, 1.54, 0.53, 0x234d7c, [0, height - 0.28, 0], 'y', 'glass', 1.47, 8)
    cylinder(tower, 1.52, 0.22, 0xa8cadd, [0, height + 0.035, 0], 'y', 'metal', 1.16, 8)
    ring(tower, 1.52, 0.036, 0x58c7f6, [0, height - 0.02, 0], 'y', 'light', 8)
    cylinder(tower, 0.045, 0.74, 0xa8c4df, [0, height + 0.49, 0], 'y', 'metal', 0.045, 8)
    cylinder(tower, 0.095, 0.115, 0xff8dbe, [0, height + 0.89, 0], 'y', 'light', 0.095, 8)
  }
  const buildings = [0x547fa9, 0x739cbd, 0x60729b, 0x477eb0, 0x689bbe]
  for (let i = 0; i < 37; i++) {
    const z = -20 - random() * 15
    const x = (i - 18) * 1.85 + random() * 1.5
    const h = 1.9 + random() * 5.3
    const w = 0.77 + random() * 1.2
    plate(root, [w, h, w], buildings[i % buildings.length], [x, h / 2 - 1.04, z], 0.081, 'metal')
    plate(root, [w * 0.67, 0.35, w * 0.65], 0x82bfd6, [x, h - 0.975, z], 0.057)
    for (let y = 0.57; y < h - 0.49; y += 0.67) {
      plate(root, [w * 0.77, 0.117, 0.045], 0xa7d4ec, [x, y - 0.9, z + w * 0.5], 0.01, 'glass')
    }
    if (i % 7 === 0) {
      cylinder(root, 0.035, 0.9, 0xa8c4df, [x, h - 0.39, z], 'y', 'metal', 0.035, 6)
      plate(root, [0.114, 0.13, 0.11], 0xff82c2, [x, h + 0.055, z], 0.026, 'light')
    }
  }
  for (const [x, y, z, scale] of [[-19, 8.9, -37, 1.2], [-7, 9.2, -38, 0.8], [7, 8.8, -36, 1.1],
    [21, 9.3, -39, 1.45], [-26, 6.7, -34, 0.8], [29, 6.4, -33, 0.86]]) {
    const cloud = group(root, x, y, z)
    cloud.scale.setScalar(scale)
    for (const [cx, cy, w] of [[0, 0, 5.5], [-1.2, 0.18, 3.5], [0.05, 0.59, 2.2], [1.5, 0.21, 2.5]]) {
      const mesh = cylinder(cloud, 1, 0.9, 0xebf7ff, [cx, cy, 0], 'z', 'paint', 1, 12)
      mesh.scale.set(w * 0.5, 1.37, 0.39 + cy * 0.37)
    }
  }
  return root
}
