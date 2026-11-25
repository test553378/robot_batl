import * as T from 'three'
import { defaultConfig, slots, sockets, type RobotConfig, type RobotPartSlot, type Theme, type WeaponId } from './catalog'
import { batchSurfaces, cylinder, facet, group, plate, ring, wheel } from './geometry'

const dark = 0x18263e
const frame = 0x354b64
const chrome = 0xb6c9dd
const porcelain = 0xecf5ff
const cyan = 0x62edff
const gold = 0xffbd3d

const palette = {
  patrol: { paint: 0x125bd3, trim: porcelain, stripe: gold, glow: cyan },
  fire: { paint: 0xe12832, trim: 0xffdf70, stripe: 0xffaa2c, glow: 0xffce66 },
  rescue: { paint: 0xf5f7ff, trim: 0x12a98a, stripe: 0xef464e, glow: 0x68ffcb },
}

function lightbar(parent: T.Object3D, width: number, y: number, z: number, theme: Theme) {
  plate(parent, [width + 0.07, 0.16, 0.23], dark, [0, y - 0.045, z], 0.035)
  for (const side of [-1, 1]) {
    const color = theme === 'patrol' && side > 0 ? 0x3fa8ff : 0xff3843
    plate(parent, [width * 0.49, 0.15, 0.21], color, [side * width / 4, y, z], 0.035, 'glass')
    plate(parent, [width * 0.36, 0.036, 0.016], color, [side * width / 4, y + 0.019, z + 0.106], 0.007, 'light')
  }
  plate(parent, [0.065, 0.143, 0.225], chrome, [0, y, z], 0.01, 'metal')
}

function head(parent: T.Object3D, theme: Theme) {
  const p = palette[theme]
  cylinder(parent, 0.22, 0.30, frame, [0, -0.14, 0], 'y', 'metal')
  cylinder(parent, 0.27, 0.10, dark, [0, -0.239, 0], 'y', 'metal')
  plate(parent, [0.75, 0.66, 0.63], dark, [0, 0.27, 0], 0.11)
  plate(parent, [0.77, 0.47, 0.66], p.paint, [0, 0.4, -0.032], 0.096, 'paint', 0.04)
  plate(parent, [0.52, 0.29, 0.32], porcelain, [0, 0.13, 0.203], 0.055, 'paint', 0.04)
  plate(parent, [0.58, 0.23, 0.19], 0x101c35, [0, 0.305, 0.267], 0.048, 'glass')
  for (const s of [-1, 1]) {
    cylinder(parent, 0.143, 0.123, p.trim, [s * 0.35, 0.28, 0.013], 'x')
    cylinder(parent, 0.08, 0.139, p.paint, [s * 0.37, 0.28, 0.013], 'x')
    const eye = plate(parent, [0.177, 0.095, 0.041], p.glow, [s * 0.129, 0.307, 0.357], 0.017, 'light')
    eye.rotation.z = s * 0.15
    plate(parent, [0.104, 0.174, 0.13], p.paint, [s * 0.281, 0.115, 0.265], 0.025)
  }
  facet(parent, [[-0.10, 0.017], [0.10, 0.017], [0.056, -0.026], [-0.054, -0.026]],
    0.028, frame, [0, 0.104, 0.365], 0.005)
  if (theme === 'patrol') {
    lightbar(parent, 0.5, 0.68, -0.091, theme)
    for (const s of [-1, 1]) {
      const crest = [[0.02, -0.05], [0.12, -0.085], [0.38, 0.039], [0.414, 0.229], [0.23, 0.116], [0.07, 0.08]]
        .map(([x, y]) => [x * s, y] as const)
      facet(parent, crest, 0.099, gold, [0, 0.438, 0.302], 0.02, 'metal')
    }
    facet(parent, [[0, -0.103], [0.104, 0.025], [0.074, 0.131], [-0.074, 0.131], [-0.104, 0.025]],
      0.145, gold, [0, 0.492, 0.35], 0.018)
    facet(parent, [[0, -0.058], [0.049, 0], [0, 0.068], [-0.049, 0]], 0.031, cyan, [0, 0.514, 0.434], 0.006, 'light')
  } else if (theme === 'fire') {
    plate(parent, [0.84, 0.12, 0.80], 0xfe3838, [0, 0.42, 0.039], 0.045)
    plate(parent, [0.3, 0.21, 0.57], p.paint, [0, 0.615, -0.013], 0.057)
    facet(parent, [[0, -0.084], [0.117, -0.026], [0.102, 0.104], [-0.102, 0.104], [-0.117, -0.026]],
      0.115, gold, [0, 0.508, 0.378], 0.017)
    facet(parent, [[-0.064, -0.037], [0.058, -0.037], [0.071, 0.017], [0, 0.102], [0.012, 0.024], [-0.03, 0.052]],
      0.054, 0xff5b21, [0, 0.518, 0.447], 0.007, 'light')
  } else {
    plate(parent, [0.64, 0.13, 0.65], p.trim, [0, 0.432, 0.01], 0.038)
    plate(parent, [0.237, 0.23, 0.52], porcelain, [0, 0.584, 0.014], 0.061)
    lightbar(parent, 0.69, 0.618, -0.085, theme)
    facet(parent, [[-0.10, 0.03], [-0.054, -0.075], [0.071, 0.015], [0.095, -0.013], [0.11, 0.065], [0.051, 0.049], [-0.045, -0.027]],
      0.05, p.trim, [0, 0.519, 0.31], 0.009, 'light')
  }
}

function body(parent: T.Object3D, theme: Theme) {
  const p = palette[theme]
  plate(parent, [1.35, 0.94, 0.78], frame, [0, 0.12, 0], 0.13, 'metal', 0.11)
  plate(parent, [1.46, 0.76, 0.77], p.paint, [0, 0.23, 0.139], 0.135, 'paint', 0.09)
  plate(parent, [1.4, 0.38, 0.17], p.trim, [0, 0.12, 0.485], 0.07)
  const windshield = plate(parent, [1.19, 0.295, 0.245], 0x0c3c79, [0, 0.467, 0.412], 0.056, 'glass', -0.025)
  windshield.rotation.x = -0.33
  const reflection = plate(parent, [0.94, 0.043, 0.033], 0x52c1ff, [0, 0.555, 0.519], 0.01, 'glass')
  reflection.rotation.z = 0.035
  plate(parent, [0.54, 0.28, 0.096], dark, [0, 0.132, 0.571], 0.035, 'metal')
  for (const y of [0.05, 0.114, 0.178, 0.242]) {
    plate(parent, [0.46, 0.024, 0.026], chrome, [0, y, 0.623], 0.004, 'metal')
  }
  for (const s of [-1, 1]) {
    plate(parent, [0.29, 0.2, 0.102], frame, [s * 0.477, 0.156, 0.564], 0.034, 'metal')
    plate(parent, [0.235, 0.123, 0.076], 0xffdf8c, [s * 0.477, 0.168, 0.615], 0.025, 'light')
    plate(parent, [0.294, 0.052, 0.05], p.stripe, [s * 0.477, 0.021, 0.565], 0.012)
    plate(parent, [0.32, 0.58, 0.26], p.paint, [s * 0.462, 0.165, -0.394], 0.053)
    plate(parent, [0.233, 0.07, 0.042], 0xdd293b, [s * 0.47, 0.05, -0.528], 0.012, 'light')
    for (const y of [0.17, 0.26, 0.35]) {
      plate(parent, [0.21, 0.031, 0.034], dark, [s * 0.46, y, -0.532], 0.005)
    }
  }
  plate(parent, [0.94, 0.19, 0.79], dark, [0, -0.313, -0.043], 0.064, 'metal')
  plate(parent, [1.22, 0.26, 0.81], frame, [0, -0.51, 0.007], 0.082, 'metal', 0.12)
  plate(parent, [0.37, 0.36, 0.11], p.paint, [0, -0.502, 0.428], 0.037, 'paint', 0.064)
  plate(parent, [0.2, 0.128, 0.078], p.stripe, [0, -0.426, 0.474], 0.018, 'metal', 0.027)
  if (theme === 'fire') {
    for (const s of [-1, 1]) {
      cylinder(parent, 0.097, 0.07, gold, [s * 0.337, -0.102, 0.498], 'z', 'metal')
      cylinder(parent, 0.056, 0.083, dark, [s * 0.337, -0.102, 0.505], 'z')
    }
    plate(parent, [1.03, 0.082, 0.062], gold, [0, 0.636, 0.202], 0.024)
  } else if (theme === 'rescue') {
    plate(parent, [1.30, 0.18, 0.46], porcelain, [0, 0.629, 0.06], 0.051)
    for (const s of [-1, 1]) plate(parent, [0.26, 0.061, 0.078], p.stripe, [s * 0.419, 0.639, 0.303], 0.037, 'light')
  }
  facet(parent, [[0, -0.127], [0.126, -0.018], [0.092, 0.129], [-0.092, 0.129], [-0.126, -0.018]],
    0.086, p.stripe, [0, 0.143, 0.658], 0.017, 'metal')
  facet(parent, [[0, -0.081], [0.071, 0.011], [0, 0.08], [-0.071, 0.011]],
    0.048, p.glow, [0, 0.143, 0.713], 0.008, 'light')
}

function arm(parent: T.Object3D, theme: Theme, side: number) {
  const p = palette[theme]
  cylinder(parent, 0.209, 0.33, frame, [-side * 0.12, -0.03, 0], 'x', 'metal')
  plate(parent, [0.52, 0.64, 0.58], dark, [side * 0.053, -0.32, -0.016], 0.06, 'metal')
  plate(parent, [0.69, theme === 'rescue' ? 0.56 : 0.48, 0.67], p.paint,
    [side * 0.08, 0.097, 0.029], 0.09, 'paint', 0.05)
  plate(parent, [0.57, 0.274, 0.105], p.trim, [side * 0.095, 0.104, 0.368], 0.048)
  plate(parent, [0.36, 0.04, 0.035], p.stripe, [side * 0.1, 0.024, 0.423], 0.01)
  plate(parent, [0.17, 0.042, 0.035], frame, [side * 0.16, 0.179, 0.424], 0.01, 'metal')
  cylinder(parent, 0.178, 0.36, frame, [side * 0.065, -0.487, 0.018], 'x', 'metal')
  plate(parent, [0.466, 0.429, 0.496], p.paint, [side * 0.065, -0.723, 0.092], 0.082)
  plate(parent, [0.35, 0.21, 0.10], p.trim, [side * 0.065, -0.71, 0.333], 0.036)
  plate(parent, [0.316, 0.24, 0.337], dark, [side * 0.058, -0.969, 0.118], 0.057, 'metal')
  for (const offset of [-0.085, 0, 0.085]) {
    plate(parent, [0.06, 0.138, 0.069], frame, [side * 0.058 + offset, -0.976, 0.271], 0.014)
  }
  const top = group(parent, side * 0.078, 0.39, 0.078)
  if (theme === 'patrol') {
    wheel(parent, [side * 0.425, -0.071, 0.002], 0.259, 0.135, chrome, side)
    lightbar(top, 0.55, 0, 0, theme)
  } else if (theme === 'fire') {
    plate(parent, [0.19, 0.45, 0.565], gold, [side * 0.44, 0.106, -0.013], 0.041, 'metal')
    cylinder(parent, 0.097, 0.46, chrome, [side * 0.24, 0.397, 0.038], 'z', 'metal', 0.08)
    cylinder(parent, 0.132, 0.088, dark, [side * 0.24, 0.397, 0.273], 'z', 'metal')
    plate(parent, [0.24, 0.11, 0.223], 0xff6140, [side * 0.385, -0.712, 0.073], 0.025)
  } else {
    plate(parent, [0.207, 0.507, 0.63], porcelain, [side * 0.393, 0.089, -0.021], 0.065)
    plate(parent, [0.044, 0.11, 0.535], p.trim, [side * 0.506, 0.075, -0.021], 0.016)
    lightbar(top, 0.48, 0.036, 0, theme)
    for (const x of [-0.099, 0.076]) {
      plate(parent, [0.085, 0.072, 0.056], p.glow, [x + side * 0.065, -0.709, 0.394], 0.009, 'light')
    }
  }
}

function leg(parent: T.Object3D, theme: Theme, side: number) {
  const p = palette[theme]
  plate(parent, [0.48, 0.625, 0.49], frame, [0, -0.21, 0], 0.073, 'metal')
  plate(parent, [0.397, 0.43, 0.117], theme === 'rescue' ? p.trim : porcelain, [0, -0.19, 0.245], 0.047)
  cylinder(parent, 0.18, 0.47, dark, [0, -0.509, 0.003], 'x', 'metal')
  plate(parent, [0.67, 0.684, 0.65], p.paint, [side * 0.046, -0.953, 0.038], 0.112, 'paint', -0.02)
  plate(parent, [0.523, 0.41, 0.13], p.trim, [side * 0.03, -0.887, 0.367], 0.065)
  plate(parent, [0.489, 0.157, 0.144], dark, [side * 0.025, -0.615, 0.321], 0.032, 'metal')
  plate(parent, [0.286, 0.058, 0.023], p.stripe, [side * 0.026, -0.608, 0.4], 0.008)
  const radius = theme === 'fire' ? 0.267 : 0.218
  wheel(parent, [side * 0.369, -0.935, 0.033], radius, 0.18, chrome, side)
  plate(parent, [0.668, 0.26, 0.875], dark, [side * 0.051, -1.455, 0.159], 0.075, 'metal')
  plate(parent, [0.635, 0.26, 0.818], p.paint, [side * 0.051, -1.365, 0.17], 0.078)
  plate(parent, [0.505, 0.148, 0.228], p.stripe, [side * 0.051, -1.404, 0.519], 0.043)
  const emblem = theme === 'rescue' ? p.stripe : theme === 'fire' ? dark : 0x1a559e
  for (const inset of [-0.083, 0.083]) {
    const panel = plate(parent, [0.072, 0.203, 0.032], emblem, [side * 0.029 + inset, -0.884, 0.437], 0.01)
    panel.rotation.z = -0.32
  }
}

export function makeWeapon(parent: T.Object3D, id: WeaponId) {
  const color = { beam: 0x237ee6, water: 0xe93237, star: 0xf5a72d }[id]
  const glow = { beam: cyan, water: 0x63baff, star: 0xffcf3c }[id]
  plate(parent, [0.39, 0.34, 0.72], dark, [0, 0, 0.299], 0.065, 'metal')
  plate(parent, [0.49, 0.33, 0.51], color, [0, 0.041, 0.204], 0.082)
  plate(parent, [0.36, 0.105, 0.49], id === 'star' ? dark : porcelain, [0, 0.21, 0.273], 0.027)
  for (const s of [-1, 1]) {
    plate(parent, [0.065, 0.082, 0.22], glow, [s * 0.243, 0.049, 0.243], 0.015, 'light')
  }
  if (id === 'beam') {
    cylinder(parent, 0.162, 0.452, color, [0, 0.004, 0.677], 'z', 'metal')
    cylinder(parent, 0.206, 0.15, frame, [0, 0.004, 0.867], 'z', 'metal')
    ring(parent, 0.124, 0.027, glow, [0, 0.004, 0.944])
    cylinder(parent, 0.089, 0.037, glow, [0, 0.004, 0.932], 'z', 'light')
  } else if (id === 'water') {
    for (const s of [-1, 1]) {
      cylinder(parent, 0.097, 0.54, chrome, [s * 0.12, 0.016, 0.661], 'z', 'metal', 0.08)
      cylinder(parent, 0.122, 0.134, color, [s * 0.12, 0.016, 0.897], 'z', 'paint', 0.109)
      ring(parent, 0.065, 0.019, glow, [s * 0.12, 0.016, 0.969])
    }
    cylinder(parent, 0.122, 0.36, 0x289ce9, [0, 0.23, 0.559], 'z', 'glass')
  } else {
    plate(parent, [0.566, 0.481, 0.44], color, [0, 0.01, 0.671], 0.092, 'paint')
    plate(parent, [0.485, 0.401, 0.11], dark, [0, 0.01, 0.885], 0.06, 'metal')
    for (const [x, y] of [[0, 0.11], [-0.118, -0.068], [0.118, -0.068]]) {
      ring(parent, 0.069, 0.026, glow, [x, y, 0.947])
    }
  }
  return group(parent, 0, 0.015, 1)
}

export interface RobotRig {
  root: T.Group
  torso: T.Group
  head: T.Group
  arms: [T.Group, T.Group]
  legs: [T.Group, T.Group]
  slots: Record<RobotPartSlot, T.Group>
  muzzle: T.Group
}

export function makeHero(config: RobotConfig = defaultConfig): RobotRig {
  const root = new T.Group()
  const torso = group(root)
  const nodes = Object.fromEntries(slots.map((slot) => [
    slot, group(slot === 'legs' ? root : torso, ...(slot === 'weapon' ? [0, 0, 0] as const : sockets[slot])),
  ])) as RobotRig['slots']
  for (const slot of slots) nodes[slot].name = slot
  nodes.head.scale.set(1.1, 1.05, 1.08)
  const arms: RobotRig['arms'] = [group(nodes.arms, -0.853, 0, 0), group(nodes.arms, 0.853, 0, 0)]
  const legs: RobotRig['legs'] = [group(nodes.legs, -0.373, 0, 0), group(nodes.legs, 0.373, 0, 0)]
  model(nodes.head, `head:${config.head}`, (target) => head(target, config.head))
  model(nodes.body, `body:${config.body}`, (target) => body(target, config.body))
  for (const [index, side] of [-1, 1].entries()) {
    model(arms[index], `arms:${config.arms}:${side}`, (target) => arm(target, config.arms, side))
    model(legs[index], `legs:${config.legs}:${side}`, (target) => leg(target, config.legs, side))
  }
  arms[1].add(nodes.weapon)
  nodes.weapon.position.set(...sockets.weapon)
  model(nodes.weapon, `weapon:${config.weapon}`, (target) => { makeWeapon(target, config.weapon) })
  return { root, torso, head: nodes.head, arms, legs, slots: nodes, muzzle: group(nodes.weapon, 0, 0.015, 1) }
}

const models = new Map<string, T.Group>()

function model(parent: T.Group, key: string, generate: (target: T.Group) => void) {
  let template = models.get(key)
  if (!template) {
    const unbatched = new T.Group()
    generate(unbatched)
    template = batchSurfaces(unbatched)
    models.set(key, template)
  }
  parent.add(template.clone())
}

export function makePartPreview(slot: RobotPartSlot, id: Theme | WeaponId) {
  const root = new T.Group()
  const key = slot === 'arms' || slot === 'legs' ? `${slot}:${id}:1` : `${slot}:${id}`
  model(root, key, (target) => {
    if (slot === 'head') head(target, id as Theme)
    if (slot === 'body') body(target, id as Theme)
    if (slot === 'arms') arm(target, id as Theme, 1)
    if (slot === 'legs') leg(target, id as Theme, 1)
    if (slot === 'weapon') makeWeapon(target, id as WeaponId)
  })
  return root
}
