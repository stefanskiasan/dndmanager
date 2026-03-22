import { describe, it, expect } from 'vitest'
import { ItemSchema } from '../../src/schemas/item'

describe('ItemSchema', () => {
  const validWeapon = {
    id: 'longsword',
    name: 'Longsword',
    sourceId: 'foundry-longsword',
    itemType: 'weapon',
    level: 0,
    price: { gp: 1, sp: 0, cp: 0 },
    bulk: 1,
    traits: ['versatile P'],
    weaponStats: {
      damage: '1d8',
      damageType: 'slashing',
      hands: '1',
      group: 'sword',
      category: 'martial',
    },
  }

  it('accepts valid weapon', () => {
    const result = ItemSchema.safeParse(validWeapon)
    expect(result.success).toBe(true)
  })

  it('accepts L bulk for light items', () => {
    const result = ItemSchema.safeParse({ ...validWeapon, bulk: 'L' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid item type', () => {
    const result = ItemSchema.safeParse({ ...validWeapon, itemType: 'invalid' })
    expect(result.success).toBe(false)
  })
})
