import type { WeaponId } from '../robots/catalog'
import type { EnemyModel } from '../robots/enemy'

export const rules = {
  radius: 8,
  playerHp: 100,
  playerSpeed: 4.15,
  playerInvulnerability: 1,
  minimumSeparation: 2.25,
  specialPerHit: 10,
  specialCharge: 0.5,
  specialRecovery: 0.58,
  maxGauge: 100,
  enemyRecovery: 0.57,
  enemyWarning: 0.96,
  assistAfter: 2,
  assistInterval: 1.54,
  assistDamage: 0.69,
  assistArmor: 0.15,
} as const

export interface WeaponDefinition {
  damage: number
  cooldown: number
  speed: number
  range: number
  radius: number
  color: number
  specialMultiplier: number
}

export const weapons: Record<WeaponId, WeaponDefinition> = {
  beam: { damage: 7, cooldown: 0.82, speed: 18, range: 19.5, radius: 0.21, color: 0x63edff, specialMultiplier: 4.6 },
  water: { damage: 6, cooldown: 0.66, speed: 15, range: 19, radius: 0.28, color: 0x389aff, specialMultiplier: 4.3 },
  star: { damage: 9, cooldown: 0.98, speed: 10.8, range: 20, radius: 0.34, color: 0xffcb35, specialMultiplier: 4.2 },
}

export const enemies = [
  { model: 0, maxHp: 60, damage: 4, interval: 4.1, opening: 3.25, speed: 1.22, armor: 0.58,
    shotSpeed: 5.9, shotRadius: 0.42, color: 0x8aff55, strafe: 0, distance: 3 },
  { model: 1, maxHp: 85, damage: 6, interval: 3.03, opening: 2.65, speed: 1.68, armor: 0.63,
    shotSpeed: 7.6, shotRadius: 0.52, color: 0xff6b52, strafe: 0.99, distance: 3.8 },
  { model: 2, maxHp: 105, damage: 8, interval: 2.51, opening: 2.2, speed: 2.09, armor: 0.71,
    shotSpeed: 9.0, shotRadius: 0.66, color: 0xe570ff, strafe: 1.4, distance: 4.45 },
] as const satisfies readonly { model: EnemyModel; maxHp: number; damage: number; interval: number; opening: number;
  speed: number; armor: number; shotSpeed: number; shotRadius: number; color: number; strafe: number; distance: number }[]
