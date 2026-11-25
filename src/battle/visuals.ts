import * as T from 'three'
import type { RobotRig } from '../robots/hero'
import type { Battle, Fighter, Shot } from './battle'

interface Projectile {
  mesh: T.Object3D
  launch: T.Vector3
  shot: Shot
}

export class BattleVisuals {
  private readonly root = new T.Group()
  private readonly projectiles = new Map<number, Projectile>()
  private readonly materials = new Map<number, T.MeshBasicMaterial>()
  private readonly orb = new T.IcosahedronGeometry(1, 1)
  private readonly heading = new T.Vector3()
  private readonly target = new T.Quaternion()
  private readonly charge = new T.PointLight(0x64edff, 0, 7, 1.9)
  private readonly warning = new T.PointLight(0xfa69ff, 0, 7, 1.9)
  private readonly y = 1.96

  constructor(scene: T.Scene) {
    scene.add(this.root)
    this.root.add(this.charge, this.warning)
  }

  clear() {
    for (const projectile of this.projectiles.values()) projectile.mesh.removeFromParent()
    this.projectiles.clear()
    this.charge.intensity = this.warning.intensity = 0
  }

  private shell(shot: Shot) {
    let paint = this.materials.get(shot.color)
    if (!paint) {
      paint = new T.MeshBasicMaterial({ color: shot.color })
      this.materials.set(shot.color, paint)
    }
    const shell = new T.Mesh(this.orb, paint)
    shell.scale.set(shot.radius, shot.radius, shot.radius * 1.7)
    return shell
  }

  update(dt: number, battle: Battle, hero: RobotRig, enemy: RobotRig) {
    this.pose(hero, battle.player, battle.elapsed, dt, battle.charge > 0)
    this.pose(enemy, battle.enemy, battle.elapsed, dt, battle.cpu.preparing)
    hero.muzzle.getWorldPosition(this.charge.position)
    enemy.muzzle.getWorldPosition(this.warning.position)
    this.warning.color.setHex(battle.cpu.definition.color)
    this.warning.intensity = battle.cpu.preparing ? 29 : 0
    this.charge.color.setHex(battle.weapon.color)
    this.charge.intensity = battle.charge > 0 ? 36 : 0

    const active = new Set(battle.shots.map((shot) => shot.id))
    for (const [key, projectile] of this.projectiles) {
      if (active.has(key)) continue
      projectile.mesh.removeFromParent()
      this.projectiles.delete(key)
    }
    for (const shot of battle.shots) {
      let projectile = this.projectiles.get(shot.id)
      if (!projectile) {
        const mesh = this.shell(shot)
        this.root.add(mesh)
        const rig = shot.owner === 'hero' ? hero : enemy
        projectile = { mesh, shot, launch: rig.muzzle.getWorldPosition(new T.Vector3()) }
        this.projectiles.set(shot.id, projectile)
      }
      const intoFlight = Math.min(1, shot.travel / 1.7)
      projectile.mesh.position.set(shot.x, this.y, shot.z).lerp(projectile.launch, 1 - intoFlight)
      projectile.mesh.rotation.y = Math.atan2(shot.vx, shot.vz)
    }
  }

  private pose(rig: RobotRig, fighter: Fighter, elapsed: number, dt: number, preparing: boolean) {
    rig.root.position.set(fighter.x, 0, fighter.z)
    this.heading.set(0, fighter.facing, 0)
    this.target.setFromEuler(new T.Euler(0, this.heading.y, 0))
    rig.root.quaternion.slerp(this.target, dt > 0 ? 1 - Math.exp(-dt * 13) : 1)
    const stride = fighter.moving ? Math.sin(elapsed * 11) * 0.35 : 0
    rig.legs[0].rotation.x = stride
    rig.legs[1].rotation.x = -stride
    rig.torso.position.y = fighter.moving ? Math.abs(stride) * 0.25 : 0.04 * Math.sin(elapsed * 4)
    rig.torso.rotation.x = fighter.hit * -0.72
    rig.arms[0].rotation.set(-stride * 0.6, 0, -0.095)
    rig.arms[1].rotation.set(preparing ? -0.48 : -fighter.recoil * 0.89 + stride * 0.52, 0, 0.12)
  }
}
