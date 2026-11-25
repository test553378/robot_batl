import * as T from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { arena, garage, lights } from './environment'
import { batchSurfaces } from '../robots/geometry'
import { makeEnemy, type EnemyModel } from '../robots/enemy'
import { makeHero, makePartPreview, type RobotRig } from '../robots/hero'
import type { RobotConfig, RobotPartSlot, Theme, WeaponId } from '../robots/catalog'

type View = 'title' | 'garage' | 'intro' | 'battle'

function shadow() {
  const resolution = 32
  const data = new Uint8Array(resolution * resolution * 4)
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const distance = Math.hypot((x + 0.5) / 16 - 1, (y + 0.5) / 16 - 1)
      const index = (y * resolution + x) * 4
      data.set([11, 25, 44, Math.round(Math.max(0, 1 - distance) ** 1.55 * 165)], index)
    }
  }
  const texture = new T.DataTexture(data, resolution, resolution)
  texture.magFilter = T.LinearFilter
  texture.needsUpdate = true
  const material = new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  const geometry = new T.PlaneGeometry(3.7, 2.86)
  const make = () => {
    const mesh = new T.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = -0.002
    return mesh
  }
  return [make(), make()]
}

export class Stage {
  readonly scene = new T.Scene()
  private readonly camera = new T.PerspectiveCamera(37, 1, 0.1, 115)
  private readonly renderer: T.WebGLRenderer
  private readonly garage = batchSurfaces(garage())
  private readonly arena = batchSurfaces(arena())
  private readonly shadows = shadow()
  private readonly previews = new Map<string, string>()
  private readonly thumbScene = new T.Scene()
  private readonly thumbCamera = new T.PerspectiveCamera(31, 1.25, 0.1, 30)
  private readonly enemies = new Map<EnemyModel, RobotRig>()
  private readonly focus = new T.Vector3()
  private readonly desired = new T.Vector3()
  private readonly desiredFocus = new T.Vector3()
  hero?: RobotRig
  enemy?: RobotRig
  private view: View = 'title'
  private rotation = 0.5
  private equipSlot?: RobotPartSlot
  private equipTime = 0
  private readonly equip = new T.PointLight(0x46efff, 0, 3.6, 1.5)
  private width = 1
  private height = 1
  private time = 0

  constructor(private readonly mount: HTMLElement, onContextLost: () => void) {
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.toneMapping = T.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.11
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      onContextLost()
    })
    mount.append(this.renderer.domElement)
    const pmrem = new T.PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, 0.05, 0.1, 20, { size: 128 })
    room.dispose()
    pmrem.dispose()
    this.scene.environment = environment.texture
    this.scene.environmentIntensity = 0.42
    this.thumbScene.environment = environment.texture
    this.thumbScene.environmentIntensity = 0.42
    lights(this.scene)
    lights(this.thumbScene)
    this.thumbScene.background = new T.Color(0x1c4168)
    this.scene.add(this.garage, this.arena, this.equip, ...this.shadows)
    this.resize()
  }

  resize() {
    this.width = Math.max(1, this.mount.clientWidth)
    this.height = Math.max(1, this.mount.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65))
    this.renderer.setSize(this.width, this.height, false)
    this.camera.aspect = this.width / this.height
    this.frameCamera(0)
  }

  show(view: View, config: RobotConfig, model: EnemyModel = 0) {
    this.hero?.root.removeFromParent()
    this.enemy?.root.removeFromParent()
    this.hero = view === 'intro' ? undefined : makeHero(config)
    this.enemy = view === 'intro' || view === 'battle' ? this.getEnemy(model) : undefined
    this.view = view
    this.rotation = view === 'title' ? 0.52 : -0.46
    this.equipTime = 0
    this.garage.visible = view === 'title' || view === 'garage'
    this.arena.visible = !this.garage.visible
    this.scene.background = this.arena.visible ? new T.Color(0x79c7f4) : new T.Color(0x142740)
    this.scene.fog = this.arena.visible ? new T.Fog(0xa6d9f5, 28, 72) : null
    if (this.hero) this.scene.add(this.hero.root)
    if (this.enemy) this.scene.add(this.enemy.root)
    if (view === 'battle') {
      this.hero?.root.position.set(-2.8, 0, 2.5)
      this.enemy?.root.position.set(2.7, 0, -2.5)
      if (this.hero) this.hero.root.rotation.y = 2.18
      if (this.enemy) this.enemy.root.rotation.y = -0.52
    } else if (this.enemy) {
      this.enemy.root.position.set(0, 0, 0)
      this.enemy.root.rotation.y = 0.42
    }
    this.frameCamera(0)
  }

  private getEnemy(index: EnemyModel) {
    const existing = this.enemies.get(index)
    if (existing) return existing
    const rig = makeEnemy(index)
    for (const part of [rig.head, rig.slots.body, ...rig.legs]) {
      const model = batchSurfaces(part)
      part.clear().add(model)
    }
    for (const arm of rig.arms) {
      // Include the fixed weapon in the arm's static surface batch, retaining its muzzle transform.
      const model = batchSurfaces(arm)
      const weapon = rig.slots.weapon
      const mounted = weapon.parent === arm
      if (mounted) weapon.clear().add(rig.muzzle)
      arm.clear().add(model)
      if (mounted) arm.add(weapon)
    }
    this.enemies.set(index, rig)
    return rig
  }

  refit(config: RobotConfig, slot: RobotPartSlot) {
    this.hero?.root.removeFromParent()
    this.hero = makeHero(config)
    this.scene.add(this.hero.root)
    this.equipSlot = slot
    this.equipTime = 0.34
  }

  rotate(amount: number) { this.rotation += amount }

  thumbnail(slot: RobotPartSlot, id: Theme | WeaponId) {
    const key = `${slot}:${id}`
    const existing = this.previews.get(key)
    if (existing) return existing
    const model = makePartPreview(slot, id)
    const box = new T.Box3().setFromObject(model)
    const center = box.getCenter(new T.Vector3())
    const size = box.getSize(new T.Vector3())
    model.position.copy(center).negate()
    this.thumbScene.add(model)
    const extent = Math.max(size.x, size.y, size.z)
    this.thumbCamera.position.set(extent * 0.89, extent * 0.48, extent * 1.94)
    this.thumbCamera.lookAt(0, 0, 0)
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(160, 128, false)
    this.renderer.render(this.thumbScene, this.thumbCamera)
    const url = this.renderer.domElement.toDataURL('image/webp', 0.9)
    model.removeFromParent()
    this.resize()
    this.previews.set(key, url)
    return url
  }

  private frameCamera(dt: number) {
    const aspect = this.width / this.height
    const portrait = aspect < 1
    if (this.view === 'battle') {
      const a = this.hero!.root.position
      const b = this.enemy!.root.position
      const separation = Math.hypot(a.x - b.x, a.z - b.z)
      const zoom = Math.max(0, separation - 6) * 0.68
      this.desiredFocus.set((a.x + b.x) * 0.47, 1.2, (a.z + b.z) * 0.45)
      this.desired.copy(this.desiredFocus).add(new T.Vector3(0, 9 + zoom * 0.46, 13.2 + zoom))
    } else {
      this.desiredFocus.set(0, this.view === 'intro' ? 2.25 : 1.89, 0)
      this.desired.set(0, this.view === 'intro' ? 3.38 : 2.82, portrait ? 9.6 : this.view === 'intro' ? 8.95 : this.view === 'garage' ? 8.15 : 7.5)
    }
    const catchup = dt > 0 ? 1 - Math.exp(-dt * 3.7) : 1
    this.camera.position.lerp(this.desired, catchup)
    this.focus.lerp(this.desiredFocus, catchup)
    this.camera.lookAt(this.focus)
    const offset = portrait ? 0 : this.view === 'title' ? -0.225 : this.view === 'battle' ? 0 : this.view === 'intro' ? -0.16 : 0.205
    this.camera.setViewOffset(this.width, this.height, this.width * offset, 0, this.width, this.height)
  }

  draw(dt: number, animate = true) {
    this.time += animate ? dt : 0
    if (this.view !== 'battle') {
      if (this.hero) {
        this.hero.root.rotation.y = this.rotation + (this.view === 'title' ? Math.sin(this.time * 0.6) * 0.16 : 0)
        this.hero.torso.position.y = Math.sin(this.time * 2.5) * 0.036
        this.hero.arms[0].rotation.z = -0.125
        this.hero.arms[1].rotation.set(-0.18, 0, 0.14)
      }
      if (this.enemy) this.enemy.torso.position.y = Math.sin(this.time * 2.2) * 0.035
    }
    if (this.equipTime > 0 && this.equipSlot && this.hero) {
      this.equipTime = Math.max(0, this.equipTime - dt)
      this.hero.slots[this.equipSlot].getWorldPosition(this.equip.position)
      this.equip.position.z += 0.9
      this.equip.intensity = Math.sin(this.equipTime / 0.34 * Math.PI) * 43
    } else this.equip.intensity = 0
    for (const [index, rig] of [this.hero, this.enemy].entries()) {
      this.shadows[index].visible = !!rig
      if (rig) {
        this.shadows[index].position.x = rig.root.position.x
        this.shadows[index].position.z = rig.root.position.z
      }
    }
    this.frameCamera(dt)
    this.renderer.render(this.scene, this.camera)
  }
}
