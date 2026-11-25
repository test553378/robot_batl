import type { WeaponId } from '../robots/catalog'
import type { EnemyModel } from '../robots/enemy'
import { rules, weapons } from './battleBalance'
import { CPU, limit, type Point } from './cpu'

export type BattleStatus = 'playing' | 'won' | 'lost'
export interface BattleInput { x: number; z: number; attack: boolean; special: boolean }
export interface Fighter extends Point { hp: number; facing: number; moving: boolean; hit: number; recoil: number }
export interface Shot extends Point {
  id: number; owner: 'hero' | 'enemy'; vx: number; vz: number; travel: number; range: number
  radius: number; damage: number; speed: number; color: number; special: boolean
}
export type BattleEvent =
  | { kind: 'shot'; id: number }
  | { kind: 'charge' | 'warning' | 'step' }
  | { kind: 'impact'; x: number; z: number; color: number; special: boolean; owner: Shot['owner'] }
  | { kind: 'won' | 'lost' }

function fighter(x: number, z: number, hp: number, facing: number): Fighter {
  return { x, z, hp, facing, moving: false, hit: 0, recoil: 0 }
}

function aim(from: Point, to: Point) { return Math.atan2(to.x - from.x, to.z - from.z) }

function crossed(shot: Shot, previous: Point, target: Point, radius: number) {
  const dx = shot.x - previous.x
  const dz = shot.z - previous.z
  const length = dx * dx + dz * dz
  if (length === 0) return false
  const t = Math.min(1, Math.max(0, ((target.x - previous.x) * dx + (target.z - previous.z) * dz) / length))
  return Math.hypot(previous.x + dx * t - target.x, previous.z + dz * t - target.z) <= radius
}

export class Battle {
  readonly player = fighter(-3.25, 2.4, rules.playerHp, 2.21)
  readonly enemy: Fighter
  readonly cpu: CPU
  readonly shots: Shot[] = []
  readonly events: BattleEvent[] = []
  readonly weapon
  gauge = 0
  status: BattleStatus = 'playing'
  elapsed = 0
  charge = 0
  private cooldown = 0
  private invulnerability = 0
  private shotCount = 0
  private step = 0

  constructor(readonly round: EnemyModel, readonly weaponId: WeaponId, losses = 0) {
    this.cpu = new CPU(round, losses >= rules.assistAfter)
    this.weapon = weapons[weaponId]
    this.enemy = fighter(3.08, -2.33, this.cpu.definition.maxHp, -0.88)
  }

  get specialReady() { return this.gauge === rules.maxGauge && this.charge === 0 }

  update(dt: number, input: BattleInput) {
    this.events.length = 0
    if (this.status !== 'playing' || dt <= 0) return
    this.elapsed += dt
    this.cooldown = Math.max(0, this.cooldown - dt)
    this.invulnerability = Math.max(0, this.invulnerability - dt)
    for (const item of [this.player, this.enemy]) {
      item.hit = Math.max(0, item.hit - dt)
      item.recoil = Math.max(0, item.recoil - dt)
    }
    this.movePlayer(dt, input)

    const before = { x: this.enemy.x, z: this.enemy.z }
    const action = this.cpu.update(dt, this.enemy, this.player)
    this.enemy.moving = Math.hypot(before.x - this.enemy.x, before.z - this.enemy.z) > 0.001
    this.enemy.facing = aim(this.enemy, this.cpu.preparing || action === 'fire' ? this.cpu.target : this.player)
    this.separate()

    if (input.special && this.specialReady) {
      this.gauge = 0
      this.charge = rules.specialCharge
      this.events.push({ kind: 'charge' })
    }
    if (this.charge > 0) {
      this.player.facing = aim(this.player, this.enemy)
      this.charge = Math.max(0, this.charge - dt)
      if (this.charge === 0) this.fireHero(true)
    } else if (input.attack && this.cooldown === 0) {
      this.fireHero(false)
    }
    if (action === 'warning') this.events.push({ kind: 'warning' })
    if (action === 'fire') this.fireEnemy()

    for (let index = this.shots.length - 1; index >= 0 && this.status === 'playing'; index--) {
      if (this.advanceShot(this.shots[index], dt)) this.shots.splice(index, 1)
    }
  }

  private movePlayer(dt: number, input: BattleInput) {
    const magnitude = Math.hypot(input.x, input.z)
    this.player.moving = magnitude > 0
    if (magnitude > 0) {
      const speed = rules.playerSpeed * (this.charge > 0 ? 0.68 : 1)
      this.player.x += (input.x / magnitude) * speed * dt
      this.player.z += (input.z / magnitude) * speed * dt
      if (this.player.recoil <= 0) this.player.facing = Math.atan2(input.x, input.z)
      this.step -= dt
      if (this.step <= 0) { this.events.push({ kind: 'step' }); this.step = 0.27 }
    } else this.step = 0
    limit(this.player)
  }

  private separate() {
    const dx = this.player.x - this.enemy.x
    const dz = this.player.z - this.enemy.z
    const distance = Math.hypot(dx, dz)
    if (distance >= rules.minimumSeparation) return
    if (distance < 0.001) this.player.x += rules.minimumSeparation
    else {
      const push = (rules.minimumSeparation - distance) / distance
      this.player.x += dx * push
      this.player.z += dz * push
    }
    limit(this.player)
    // At the wall, push the CPU inward to leave room to slide around it.
    const gap = Math.hypot(this.player.x - this.enemy.x, this.player.z - this.enemy.z)
    if (gap > 0.001 && gap < rules.minimumSeparation) {
      const push = (rules.minimumSeparation - gap) / gap
      this.enemy.x += (this.enemy.x - this.player.x) * push
      this.enemy.z += (this.enemy.z - this.player.z) * push
      limit(this.enemy)
    }
  }

  private makeShot(owner: Shot['owner'], from: Fighter, to: Point, params: Pick<Shot, 'damage' | 'speed' | 'range' | 'radius' | 'color' | 'special'>) {
    const angle = aim(from, to)
    const dx = Math.sin(angle)
    const dz = Math.cos(angle)
    const launch = 0.97
    const side = owner === 'hero' ? 0.57 : 0.73
    const x = from.x + dx * launch + dz * side
    const z = from.z + dz * launch - dx * side
    const yaw = aim({ x, z }, to)
    const id = ++this.shotCount
    this.shots.push({ id, owner, x, z, vx: Math.sin(yaw), vz: Math.cos(yaw), travel: 0, ...params })
    this.events.push({ kind: 'shot', id })
    from.recoil = 0.28
  }

  private fireHero(special: boolean) {
    const { damage, speed, range, radius, color, cooldown, specialMultiplier } = this.weapon
    this.player.facing = aim(this.player, this.enemy)
    this.cooldown = special ? rules.specialRecovery : cooldown
    this.makeShot('hero', this.player, this.enemy, {
      damage: special ? damage * specialMultiplier : damage,
      speed: special ? speed * 0.82 : speed, range, radius: special ? radius * 3.2 : radius, color, special,
    })
  }

  private fireEnemy() {
    const { damage, shotSpeed, shotRadius, color } = this.cpu.definition
    this.makeShot('enemy', this.enemy, this.cpu.target, {
      damage: damage * (this.cpu.assisted ? rules.assistDamage : 1),
      speed: shotSpeed, radius: shotRadius, range: 21, color, special: false,
    })
  }

  private advanceShot(shot: Shot, dt: number) {
    const previous = { x: shot.x, z: shot.z }
    const target = shot.owner === 'hero' ? this.enemy : this.player
    if (shot.owner === 'hero') {
      const angle = aim(shot, target)
      const weight = Math.min(1, dt * (this.weaponId === 'beam' ? 7 : 12))
      shot.vx += (Math.sin(angle) - shot.vx) * weight
      shot.vz += (Math.cos(angle) - shot.vz) * weight
      const magnitude = Math.hypot(shot.vx, shot.vz) || 1
      shot.vx /= magnitude
      shot.vz /= magnitude
    }
    const step = shot.speed * dt
    shot.x += shot.vx * step
    shot.z += shot.vz * step
    shot.travel += step
    if (!crossed(shot, previous, target, shot.radius + (shot.owner === 'hero' ? 0.78 : 0.49))) return shot.travel > shot.range
    if (shot.owner === 'enemy' && this.invulnerability > 0) return true

    if (shot.owner === 'hero') {
      const protection = this.cpu.definition.armor * (this.cpu.vulnerable ? 0.57 : 1) - (this.cpu.assisted ? rules.assistArmor : 0)
      target.hp = Math.max(0, target.hp - shot.damage * (1 - protection * (shot.special ? 0.2 : 1)))
      if (!shot.special) this.gauge = Math.min(rules.maxGauge, this.gauge + rules.specialPerHit)
      this.cpu.hit()
    } else {
      target.hp = Math.max(0, target.hp - shot.damage)
      this.invulnerability = rules.playerInvulnerability
    }
    target.hit = 0.24
    target.x += shot.vx * 0.25
    target.z += shot.vz * 0.25
    limit(target)
    this.events.push({ kind: 'impact', x: shot.x, z: shot.z, color: shot.color, special: shot.special, owner: shot.owner })

    if (target.hp === 0) {
      this.status = shot.owner === 'hero' ? 'won' : 'lost'
      this.player.moving = this.enemy.moving = false
      this.charge = 0
      this.shots.length = 0
      if (this.status === 'won') this.cpu.phase = 'defeated'
      this.events.push({ kind: this.status })
    }
    return true
  }
}
