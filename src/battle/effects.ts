import * as T from 'three'
import type { Battle, Shot } from './battle'
import type { WeaponId } from '../robots/catalog'

const sphere = new T.IcosahedronGeometry(1, 1)
const shard = new T.TetrahedronGeometry(1)
const ring = new T.TorusGeometry(1, 0.065, 5, 28)
const strip = new T.BoxGeometry(1, 1, 1)
const star = (() => {
  const shape = new T.Shape()
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5
    const radius = i % 2 ? 0.43 : 1
    if (i === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  shape.closePath()
  return new T.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.055, bevelThickness: 0.075, bevelSegments: 1 })
})()

const inks = new Map<number, T.MeshBasicMaterial>()
function ink(color: number) {
  let fill = inks.get(color)
  if (!fill) {
    fill = new T.MeshBasicMaterial({ color, toneMapped: false })
    inks.set(color, fill)
  }
  return fill
}

function form(geometry: T.BufferGeometry, color: number, scale: number) {
  const mesh = new T.Mesh(geometry, ink(color))
  mesh.scale.setScalar(scale)
  return mesh
}

export function projectileShape(shot: Shot, weapon: WeaponId, reduced: boolean) {
  const model = new T.Group()
  if (shot.owner === 'enemy') {
    const core = form(shard, shot.color, shot.radius)
    core.scale.z *= 1.5
    model.add(core)
    const shell = form(ring, 0xffc89b, shot.radius * 0.9)
    shell.position.z = -0.17
    model.add(shell)
  } else if (weapon === 'beam') {
    const core = form(sphere, 0xc0feff, shot.radius * 0.87)
    core.scale.z *= shot.special ? 4.4 : 3.9
    model.add(core)
    for (let i = 0; i < (shot.special ? 3 : 1); i++) {
      const hoop = form(ring, shot.color, shot.radius * (0.91 + i * 0.20))
      hoop.position.z = -shot.radius * i * 1.15
      model.add(hoop)
    }
  } else if (weapon === 'water') {
    const count = shot.special ? reduced ? 6 : 10 : 4
    for (let i = 0; i < count; i++) {
      const drop = form(sphere, i % 2 ? 0x81e8ff : shot.color, shot.radius * (i ? 0.42 : 0.83))
      const angle = i * 2.39
      drop.position.set(Math.cos(angle) * shot.radius * i / count, Math.sin(angle) * shot.radius * i / count,
        -i * shot.radius * (shot.special ? 0.39 : 0.55))
      drop.scale.z *= 1.6
      model.add(drop)
    }
    if (shot.special) {
      const wave = form(ring, 0x58cbff, shot.radius * 1.45)
      wave.rotation.y = 0.22
      model.add(wave)
    }
  } else {
    const rocket = form(star, shot.color, shot.radius * 1.13)
    rocket.rotation.y = -0.22
    model.add(rocket)
    if (shot.special) {
      for (const offset of [-1, 1]) {
        const wing = form(star, 0xff8938, shot.radius * 0.49)
        wing.position.set(offset * shot.radius * 1.33, offset * shot.radius * 0.4, -shot.radius * 0.9)
        model.add(wing)
      }
    }
  }
  return model
}

interface Particle {
  mesh: T.Mesh<T.BufferGeometry, T.MeshBasicMaterial>
  velocity: T.Vector3
  size: number
  age: number
  life: number
  gravity: number
}

const festival = [0xffd94b, 0x7aeeff, 0xff6d91, 0xa2ff84, 0xba8aff]
export class Particles {
  private readonly items: Particle[] = []
  private readonly pool: Particle[] = []
  private readonly glow: T.Mesh<T.TorusGeometry, T.MeshBasicMaterial>
  private glowTime = 0
  reduced = false

  constructor(private readonly root: T.Group) {
    this.glow = new T.Mesh(ring, new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false }))
    this.glow.visible = false
    root.add(this.glow)
  }

  clear() {
    for (const particle of this.items) this.retire(particle)
    this.items.length = 0
    this.glowTime = 0
    this.glow.visible = false
  }

  private retire(particle: Particle) {
    particle.mesh.removeFromParent()
    this.pool.push(particle)
  }

  private emit(geometry: T.BufferGeometry, color: number, x: number, y: number, z: number,
    size: number, life: number, velocity: [number, number, number], gravity: number) {
    if (this.items.length >= (this.reduced ? 28 : 65)) return
    const p = this.pool.pop() ?? {
      mesh: form(geometry, color, size), velocity: new T.Vector3(), age: 0, size, life, gravity,
    }
    p.age = 0
    p.size = size
    p.life = life
    p.gravity = gravity
    p.mesh.geometry = geometry
    p.mesh.material = ink(color)
    p.mesh.position.set(x, y, z)
    p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0)
    p.mesh.scale.setScalar(size)
    p.velocity.set(...velocity)
    this.items.push(p)
    this.root.add(p.mesh)
  }

  impact(event: Extract<Battle['events'][number], { kind: 'impact' }>, weapon: WeaponId) {
    const { x, z, color, special, owner } = event
    const y = 1.93
    const count = special ? this.reduced ? 11 : 23 : this.reduced ? 5 : 9
    const shape = owner === 'hero' && weapon === 'star' ? star : owner === 'hero' && weapon === 'water' ? sphere : shard
    for (let i = 0; i < count; i++) {
      const angle = i * 2.4
      const speed = (special ? 4.4 : 2.9) * (0.45 + Math.random() * 0.57)
      this.emit(shape, i % 3 ? color : 0xffe1a0, x, y, z, special ? 0.16 : 0.092, special ? 0.72 : 0.36,
        [Math.cos(angle) * speed, 0.55 + Math.random() * 2.9, Math.sin(angle) * speed], 4.8)
    }
    this.glow.visible = true
    this.glowTime = special ? 0.48 : 0.24
    this.glow.material.color.setHex(color)
    this.glow.position.set(x, special ? 0.06 : y, z)
    this.glow.rotation.x = special ? -Math.PI / 2 : 0.32
  }

  celebrate(x: number, z: number, final: boolean) {
    const count = final ? this.reduced ? 20 : 42 : this.reduced ? 11 : 24
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399
      const isStar = i % 6 === 0
      this.emit(isStar ? star : strip, festival[i % festival.length], x, 2.48, z,
        isStar ? 0.18 : 0.12, 1.35 + Math.random() * 1.7,
        [Math.cos(angle) * (1.2 + Math.random() * 3.4), 1.9 + Math.random() * 5.2, Math.sin(angle) * (1 + Math.random() * 3.4)], 4.8)
    }
  }

  update(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i]
      p.age += dt
      if (p.age >= p.life || p.mesh.position.y < 0) { this.retire(p); this.items.splice(i, 1); continue }
      p.mesh.position.addScaledVector(p.velocity, dt)
      p.velocity.y -= p.gravity * dt
      p.mesh.rotation.z += 4 * dt
      p.mesh.rotation.x += 2.5 * dt
      const shrink = Math.min(1, (p.life - p.age) * 4)
      p.mesh.scale.set(p.size * shrink, p.size * shrink * (p.mesh.geometry === strip ? 1.6 : 1), p.size * shrink * 0.66)
    }
    if (this.glowTime > 0) {
      this.glowTime -= dt
      this.glow.visible = this.glowTime > 0
      this.glow.material.opacity = Math.max(0, this.glowTime * 2.3)
      this.glow.scale.setScalar(0.27 + (0.48 - this.glowTime) * 3.3)
    }
  }
}

export function chargingRing(color: number) {
  const mesh = form(ring, color, 0.45)
  mesh.visible = false
  return mesh
}
