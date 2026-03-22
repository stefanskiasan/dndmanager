import { describe, it, expect } from 'vitest'
import { parseItem } from '../../src/parser/item-parser'

describe('parseItem', () => {
  const foundryLongsword = {
    _id: 'ls-123',
    name: 'Longsword',
    type: 'weapon',
    system: {
      level: { value: 0 },
      price: { value: { gp: 1, sp: 0, cp: 0 } },
      bulk: { value: 1 },
      traits: { value: ['versatile P'] },
      damage: { dice: 1, die: 'd8', damageType: 'slashing' },
      group: 'sword',
      category: 'martial',
      usage: { value: 'held-in-one-hand' },
      description: { value: '<p>A versatile sword</p>' },
      source: { value: 'Pathfinder Core Rulebook' },
    },
  }

  it('parses a Foundry weapon into our schema', () => {
    const result = parseItem(foundryLongsword)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Longsword')
    expect(result!.itemType).toBe('weapon')
  })

  it('parses weapon stats', () => {
    const result = parseItem(foundryLongsword)
    expect(result!.weaponStats).toBeDefined()
    expect(result!.weaponStats!.damage).toBe('1d8')
    expect(result!.weaponStats!.damageType).toBe('slashing')
    expect(result!.weaponStats!.hands).toBe('1')
  })

  it('returns null for unsupported item types', () => {
    const result = parseItem({ ...foundryLongsword, type: 'lore' })
    expect(result).toBeNull()
  })
})
