import * as T from 'three'
import { glowSprite, showGlow } from '../core/glow'
import type { RobotRig } from '../robots/hero'
import type { Battle, Fighter } from './battle'
import { chargingRing, Particles, projectileShape } from './effects'

interface Projectile {
  mesh: T.Object3D
  launch: T.Vector3
}

export class BattleVisuals {
  private readonly root = new T.Group()
  private readonly projectiles = new Map<number, Projectile>()
  private readonly target = new T.Quaternion()
  private readonly euler = new T.Euler()
  private readonly charge = glowSprite(0x64edff)
  private readonly warning = glowSprite(0xfa69ff)
  private readonly chargeRing = chargingRing(0x7aeeff)
  private readonly warningRing = chargingRing(0xff884f)
  private readonly particles = new Particles(this.root)
  private readonly hit = glowSprite(0xfff0b6)
  private resultTime = 0
  private burst = 0

  constructor(scene: T.Scene) {
    scene.add(this.root)
    this.root.add(this.charge, this.warning, this.chargeRing, this.warningRing, this.hit)
  }

  setReduced(reduced: boolean) { this.particles.reduced = reduced }

  clear() {
    for (const projectile of this.projectiles.values()) projectile.mesh.removeFromParent()
    this.projectiles.clear()
    for (const glow of [this.charge, this.warning, this.hit]) showGlow(glow, 0, 1)
    this.chargeRing.visible = this.warningRing.visible = false
    this.particles.clear()
    this.resultTime = 0
    this.burst = 0
  }

  update(dt: number, battle: Battle, hero: RobotRig, enemy: RobotRig) {
    this.pose(hero, battle.player, battle.elapsed, dt, battle.charge > 0)
    this.pose(enemy, battle.enemy, battle.elapsed, dt, battle.cpu.preparing)
    hero.muzzle.getWorldPosition(this.charge.position)
    enemy.muzzle.getWorldPosition(this.warning.position)
    this.warning.material.color.setHex(battle.cpu.definition.color)
    showGlow(this.warning, battle.cpu.preparing ? 0.85 : 0, 1.85)
    this.charge.material.color.setHex(battle.weapon.color)
    showGlow(this.charge, battle.charge > 0 ? 0.91 : 0, 2.05)
    this.makeRing(this.warningRing, this.warning.position, battle.cpu.preparing, battle.enemy.facing, battle.elapsed, 0.41)
    this.makeRing(this.chargeRing, this.charge.position, battle.charge > 0, battle.player.facing, battle.elapsed, 0.54)

    const active = new Set(battle.shots.map((shot) => shot.id))
    for (const [key, projectile] of this.projectiles) {
      if (active.has(key)) continue
      projectile.mesh.removeFromParent()
      this.projectiles.delete(key)
    }
    for (const shot of battle.shots) {
      let projectile = this.projectiles.get(shot.id)
      if (!projectile) {
        const mesh = projectileShape(shot, battle.weaponId, this.particles.reduced)
        this.root.add(mesh)
        const rig = shot.owner === 'hero' ? hero : enemy
        projectile = { mesh, launch: rig.muzzle.getWorldPosition(new T.Vector3()) }
        this.projectiles.set(shot.id, projectile)
      }
      const intoFlight = Math.min(1, shot.travel / 1.7)
      projectile.mesh.position.set(shot.x, 1.96, shot.z).lerp(projectile.launch, 1 - intoFlight)
      projectile.mesh.rotation.set(0, Math.atan2(shot.vx, shot.vz),
        battle.weaponId === 'star' && shot.owner === 'hero' ? shot.travel * 0.89 : -shot.travel * 0.18)
    }
    for (const event of battle.events) {
      if (event.kind !== 'impact') continue
      this.particles.impact(event, battle.weaponId)
      this.hit.position.set(event.x, 1.94, event.z)
      this.hit.material.color.setHex(event.color)
      showGlow(this.hit, 0.98, event.special ? 4.2 : 2.3)
    }
    showGlow(this.hit, this.hit.material.opacity * Math.exp(-dt * 12), this.hit.scale.x)
    this.particles.update(dt)
  }

  private makeRing(mesh: T.Object3D, at: T.Vector3, visible: boolean, facing: number, time: number, size: number) {
    mesh.visible = visible
    if (!visible) return
    mesh.position.copy(at)
    mesh.rotation.set(0.26, facing, time * 1.8)
    mesh.scale.setScalar(size * (1 + 0.19 * Math.sin(time * 8)))
  }

  private pose(rig: RobotRig, fighter: Fighter, elapsed: number, dt: number, preparing: boolean) {
    rig.root.position.set(fighter.x, 0, fighter.z)
    const easing = dt > 0 ? 1 - Math.exp(-dt * 16) : 1
    this.target.setFromEuler(this.euler.set(0, fighter.facing, 0))
    rig.root.quaternion.slerp(this.target, easing)
    const stride = fighter.moving ? Math.sin(elapsed * 13) * 0.44 : 0
    rig.legs[0].rotation.x = T.MathUtils.lerp(rig.legs[0].rotation.x, stride, easing)
    rig.legs[1].rotation.x = T.MathUtils.lerp(rig.legs[1].rotation.x, -stride, easing)
    rig.torso.position.y = fighter.moving ? Math.abs(stride) * 0.23 : 0.028 * Math.sin(elapsed * 4)
    rig.torso.rotation.x = fighter.hit * -1.09 + (fighter.moving ? 0.057 : 0)
    rig.head.rotation.z = Math.sin(elapsed * 2) * 0.04 + fighter.hit * 0.35
    rig.arms[0].rotation.set(-stride * 0.64, 0, -0.12)
    const armAngle = preparing ? -0.86 : fighter.recoil > 0 ? -0.28 - fighter.recoil * 1.83 : -0.075 + stride * 0.51
    rig.arms[1].rotation.x = T.MathUtils.lerp(rig.arms[1].rotation.x, armAngle, easing)
    rig.arms[1].rotation.z = 0.14
  }

  animateResult(dt: number, battle: Battle, hero: RobotRig, enemy: RobotRig, quiet: boolean) {
    this.resultTime += dt
    showGlow(this.charge, 0, 1)
    showGlow(this.warning, 0, 1)
    this.chargeRing.visible = this.warningRing.visible = false
    showGlow(this.hit, this.hit.material.opacity * Math.exp(-dt * 12), this.hit.scale.x)
    const win = battle.status === 'won'
    const down = win ? enemy : hero
    const up = win ? hero : enemy
    const time = this.resultTime
    const blend = Math.min(1, time / 0.54)
    down.torso.position.y = -0.55 * blend
    down.torso.rotation.x = -0.41 * blend
    down.head.rotation.x = 0.43 * blend
    down.legs[0].rotation.x = 0.56 * blend
    down.legs[1].rotation.x = 0.52 * blend
    down.arms[0].rotation.x = -0.25 * blend
    down.arms[1].rotation.x = -0.25 * blend
    const look = win ? 0.42 : -0.40
    this.target.setFromEuler(this.euler.set(0, look, 0))
    up.root.quaternion.slerp(this.target, 1 - Math.exp(-dt * 7))
    up.torso.rotation.set(0, 0, 0)
    up.legs[0].rotation.x *= Math.exp(-dt * 8)
    up.legs[1].rotation.x *= Math.exp(-dt * 8)
    if (win) {
      const jump = quiet ? 0 : Math.max(0, Math.sin(Math.min(1, time / 0.72) * Math.PI)) * 0.73
      up.root.position.y = jump
      up.torso.position.y = 0
      up.arms[0].rotation.z = -2.10 * blend
      up.arms[1].rotation.z = 1.84 * blend
      up.arms[1].rotation.x = -0.36
      const final = battle.round === 2
      if ((time >= 0.14 && this.burst === 0) || (final && !quiet && time >= 1.0 && this.burst === 1)) {
        this.particles.celebrate(up.root.position.x, up.root.position.z, final)
        this.burst++
      }
    }
    this.particles.update(dt)
  }
}
