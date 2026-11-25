export const slots = ['head', 'body', 'arms', 'legs', 'weapon'] as const
export type RobotPartSlot = typeof slots[number]
export type Theme = 'patrol' | 'fire' | 'rescue'
export const themes = ['patrol', 'fire', 'rescue'] as const
export const weaponIds = ['beam', 'water', 'star'] as const
export type WeaponId = typeof weaponIds[number]
export type RobotConfig = Record<Exclude<RobotPartSlot, 'weapon'>, Theme> & { weapon: WeaponId }

export const slotNames = { head: 'あたま', body: 'からだ', arms: 'うで', legs: 'あし', weapon: 'ぶき' }
export const themeNames = { patrol: 'パトロール', fire: 'ファイヤー', rescue: 'レスキュー' }
export const weaponNames = { beam: 'ひかりビーム', water: 'みずジェット', star: 'ほしロケット' }
export const defaultConfig: RobotConfig = { head: 'patrol', body: 'patrol', arms: 'patrol', legs: 'patrol', weapon: 'beam' }

export const sockets = {
  head: [0, 3.1, 0.03],
  body: [0, 2.17, 0],
  arms: [0, 2.6, 0],
  legs: [0, 1.54, 0],
  weapon: [0.11, -0.77, 0.36],
} as const

const catalog: { [S in RobotPartSlot]: readonly RobotConfig[S][] } = {
  head: themes, body: themes, arms: themes, legs: themes, weapon: weaponIds,
}

export function partsFor<S extends RobotPartSlot>(slot: S): readonly RobotConfig[S][] {
  return catalog[slot]
}

export function recoverConfig(value: unknown): RobotConfig {
  const config = { ...defaultConfig }
  if (typeof value !== 'object' || value === null) return config
  for (const slot of slots) {
    const id: unknown = (value as Record<string, unknown>)[slot]
    if (slot === 'weapon') {
      if (weaponIds.some((weapon) => weapon === id)) config.weapon = id as WeaponId
    } else if (themes.some((theme) => theme === id)) {
      config[slot] = id as Theme
    }
  }
  return config
}
