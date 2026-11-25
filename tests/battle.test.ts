import { describe, expect, it } from 'vitest'
import { Battle, type BattleInput } from '../src/battle/battle'
import { enemies, rules, weapons } from '../src/battle/battleBalance'
import { Campaign } from '../src/battle/campaign'
import { weaponIds } from '../src/robots/catalog'

const idle: BattleInput = { x: 0, z: 0, attack: false, special: false }
const dt = 1 / 60
function run(battle: Battle, seconds: number, input: (battle: Battle) => BattleInput) {
  for (let i = 0; i < seconds / dt && battle.status === 'playing'; i++) battle.update(dt, input(battle))
}

describe('battle and campaign', () => {
  it.each(weaponIds)('wins the opening with %s and only a held attack', (weapon) => {
    const fight = new Battle(0, weapon)
    run(fight, 40, () => ({ ...idle, attack: true }))
    expect(fight.status).toBe('won')
    expect(fight.player.hp).toBeGreaterThanOrEqual(80)
    expect(fight.elapsed).toBeGreaterThan(11)
    expect(fight.elapsed).toBeLessThanOrEqual(35)
  })

  it.each(weaponIds)('clears all three fights with %s, using the charged special', (weapon) => {
    const campaign = new Campaign()
    const times: number[] = []
    let specials = 0
    for (const round of [0, 1, 2] as const) {
      expect(campaign.round).toBe(round)
      const fight = new Battle(campaign.round, weapon, campaign.losses)
      run(fight, 88, (state) => {
        if (state.specialReady) specials++
        return { ...idle, attack: true, special: state.specialReady }
      })
      expect(fight.status).toBe('won')
      expect(campaign.advance()).toBe(round < 2)
      times.push(fight.elapsed)
    }
    expect(specials).toBeGreaterThanOrEqual(3)
    expect(times[2]).toBeGreaterThan(times[0])
  })

  it('retries round two with full HP and helps after two losses', () => {
    const campaign = new Campaign()
    campaign.advance()
    const defeat = new Battle(campaign.round, 'beam')
    run(defeat, 90, () => idle)
    expect(defeat.status).toBe('lost')
    expect(defeat.cpu.definition.maxHp).toBe(enemies[1].maxHp)
    campaign.lose()
    const retry = new Battle(campaign.round, 'beam', campaign.losses)
    expect(retry.player.hp).toBe(rules.playerHp)
    expect(retry.enemy.hp).toBe(enemies[1].maxHp)
    expect(retry.gauge).toBe(0)
    run(retry, 8, () => idle)
    campaign.lose()
    const assisted = new Battle(campaign.round, 'beam', campaign.losses)
    expect(assisted.cpu.assisted).toBe(true)
    run(assisted, 8, () => idle)
    expect(assisted.player.hp).toBeGreaterThan(retry.player.hp)
    expect(campaign.advance()).toBe(true)
    expect(campaign.losses).toBe(0)
  })

  it('keeps input screen-aligned and clamps both robots inside the arena', () => {
    const fight = new Battle(2, 'water')
    const start = { ...fight.player }
    run(fight, 0.15, () => ({ ...idle, x: 1, z: -1, attack: true }))
    expect(fight.player.x).toBeGreaterThan(start.x)
    expect(fight.player.z).toBeLessThan(start.z)
    expect(fight.shots.some((shot) => shot.owner === 'hero')).toBe(true)
    const stop = { ...fight.player }
    run(fight, 0.15, () => idle)
    expect(fight.player.x).toBe(stop.x)
    expect(fight.player.z).toBe(stop.z)
    run(fight, 7, () => ({ ...idle, x: 1, z: 1 }))
    for (const robot of [fight.player, fight.enemy]) expect(Math.hypot(robot.x, robot.z)).toBeLessThanOrEqual(rules.radius + 1e-8)
  })

  it.each(weaponIds)('charges and fires one special with %s', (weapon) => {
    const fight = new Battle(2, weapon)
    expect(fight.specialReady).toBe(false)
    for (let tick = 0; tick < 20 * 60 && !fight.specialReady; tick++) {
      fight.update(dt, { ...idle, attack: true })
    }
    expect(fight.gauge).toBe(rules.maxGauge)
    fight.update(dt, { ...idle, special: true })
    expect(fight.gauge).toBe(0)
    expect(fight.charge).toBeGreaterThan(0)
    run(fight, rules.specialCharge, () => idle)
    const shot = fight.shots.find((shot) => shot.owner === 'hero' && shot.special)
    expect(shot?.damage).toBe(weapons[weapon].damage * weapons[weapon].specialMultiplier)
  })
})
