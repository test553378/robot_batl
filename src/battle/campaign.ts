import type { EnemyModel } from '../robots/enemy'

export class Campaign {
  round: EnemyModel = 0
  losses = 0

  advance() {
    if (this.round === 2) return false
    this.round = this.round === 0 ? 1 : 2
    this.losses = 0
    return true
  }

  lose() { this.losses++ }

  reset() {
    this.round = 0
    this.losses = 0
  }
}
