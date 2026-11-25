import { describe, expect, it } from 'vitest'
import { Box3, Vector3 } from 'three'
import { defaultConfig, recoverConfig, slots, sockets, themes, weaponIds } from '../src/robots/catalog'
import { makeHero } from '../src/robots/hero'
import { makeEnemy } from '../src/robots/enemy'

describe('robot kit', () => {
  it('generates 243 rigs with every part and their common attachment points', () => {
    let combinations = 0
    for (const head of themes) for (const body of themes) for (const arms of themes) {
      for (const legs of themes) for (const weapon of weaponIds) {
        const rig = makeHero({ head, body, arms, legs, weapon })
        const bounds = new Box3().setFromObject(rig.root)
        const size = bounds.getSize(new Vector3())
        expect(size.x).toBeLessThan(3.4)
        expect(size.y).toBeGreaterThan(3.55)
        expect(size.y).toBeLessThan(4.1)
        expect(bounds.min.y).toBeGreaterThan(-0.12)
        for (const slot of slots) {
          expect(new Box3().setFromObject(rig.slots[slot]).isEmpty()).toBe(false)
          expect(rig.slots[slot].position.toArray()).toEqual(sockets[slot])
        }
        expect(rig.slots.weapon.parent).toBe(rig.arms[1])
        combinations++
      }
    }
    expect(combinations).toBe(243)
  })

  it('recovers valid saved fields and safely defaults missing or corrupt fields', () => {
    expect(recoverConfig(null)).toEqual(defaultConfig)
    expect(recoverConfig({ head: 'fire', weapon: 'star', body: 'star', legs: false })).toEqual({
      ...defaultConfig, head: 'fire', weapon: 'star',
    })
  })

  it('gives each enemy a rig and a distinct silhouette', () => {
    const sizes = ([0, 1, 2] as const).map((index) => {
      const rig = makeEnemy(index)
      expect(rig.muzzle.parent).toBe(rig.slots.weapon)
      return new Box3().setFromObject(rig.root).getSize(new Vector3())
    })
    expect(sizes[1].x).toBeGreaterThan(sizes[0].x)
    expect(sizes[2].y).toBeGreaterThan(sizes[1].y)
  })
})
