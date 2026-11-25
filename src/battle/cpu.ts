import { enemies, rules } from './battleBalance'
import type { EnemyModel } from '../robots/enemy'

export interface Point { x: number; z: number }
export type CPUPhase = 'wait' | 'approach' | 'strafe' | 'dodge' | 'windup' | 'attack' | 'hit' | 'defeated'

export function limit(point: Point, radius: number = rules.radius) {
  const length = Math.hypot(point.x, point.z)
  if (length > radius) {
    point.x *= radius / length
    point.z *= radius / length
  }
}

export class CPU {
  readonly definition
  phase: CPUPhase = 'wait'
  readonly target: Point = { x: 0, z: 0 }
  private sinceStart = 0
  private wait: number
  private cycle = 0
  private recovery = 0
  private warning = 0
  private reaction = 0

  constructor(readonly model: EnemyModel, readonly assisted: boolean) {
    this.definition = enemies[model]
    this.wait = this.definition.opening
  }

  get preparing() { return this.warning > 0 }
  get vulnerable() { return this.recovery > 0 }

  hit() { this.reaction = 0.19 }

  update(dt: number, self: Point, player: Point): 'warning' | 'fire' | undefined {
    this.sinceStart += dt
    this.reaction = Math.max(0, this.reaction - dt)
    if (this.warning > 0) {
      this.phase = 'windup'
      this.warning -= dt
      if (this.warning <= 0) {
        this.recovery = rules.enemyRecovery
        this.phase = 'attack'
        return 'fire'
      }
      return
    }
    this.wait -= dt
    if (this.recovery > 0) {
      this.recovery -= dt
      this.phase = 'attack'
      return
    }
    if (this.wait <= 0) {
      this.warning = rules.enemyWarning
      this.wait = this.definition.interval * (this.assisted ? rules.assistInterval : 1) - this.warning
      this.target.x = player.x
      this.target.z = player.z
      this.phase = 'windup'
      this.cycle++
      return 'warning'
    }
    if (this.sinceStart < 0.25 || this.reaction > 0) {
      this.phase = this.reaction > 0 ? 'hit' : 'wait'
      return
    }

    const dx = player.x - self.x
    const dz = player.z - self.z
    const distance = Math.hypot(dx, dz) || 1
    const advance = distance > this.definition.distance ? this.definition.speed : 0
    const side = this.cycle % 2 === 0 ? 1 : -1
    const dodge = this.model === 2 && this.cycle % 3 === 1 && this.wait > 0.9
    const orbit = this.definition.strafe * side * (dodge ? 1.72 : 1)
    this.phase = dodge ? 'dodge' : advance ? 'approach' : orbit ? 'strafe' : 'wait'
    self.x += (dx * advance - dz * orbit) / distance * dt
    self.z += (dz * advance + dx * orbit) / distance * dt
    limit(self)
  }
}
