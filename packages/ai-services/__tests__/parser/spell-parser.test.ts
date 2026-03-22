import { describe, it, expect } from 'vitest'
import { parseSpell } from '../../src/parser/spell-parser'

describe('parseSpell', () => {
  const foundryFireball = {
    _id: 'fb-123',
    name: 'Fireball',
    type: 'spell',
    system: {
      level: { value: 3 },
      traits: { value: ['evocation', 'fire'], traditions: ['arcane', 'primal'] },
      time: { value: '2' },
      components: { somatic: true, verbal: true, material: false, focus: false },
      range: { value: '500' },
      area: { type: 'burst', value: 20 },
      save: { value: 'reflex', basic: true },
      damage: { abc: { formula: '6d6', type: 'fire' } },
      duration: { value: '', sustained: false },
      description: { value: '<p>A burst of fire</p>' },
      source: { value: 'Pathfinder Core Rulebook' },
    },
  }

  it('parses a Foundry spell into our schema', () => {
    const result = parseSpell(foundryFireball)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Fireball')
    expect(result!.level).toBe(3)
    expect(result!.traditions).toEqual(['arcane', 'primal'])
    expect(result!.castActions).toBe(2)
  })

  it('parses area and save', () => {
    const result = parseSpell(foundryFireball)
    expect(result!.area).toEqual({ type: 'burst', size: 20 })
    expect(result!.save).toEqual({ type: 'reflex', basic: true })
  })

  it('parses damage', () => {
    const result = parseSpell(foundryFireball)
    expect(result!.damage).toEqual({ formula: '6d6', type: 'fire' })
  })

  it('returns null for focus spells without tradition', () => {
    const focusSpell = {
      ...foundryFireball,
      system: {
        ...foundryFireball.system,
        traits: { value: ['focus'], traditions: [] },
      },
    }
    const result = parseSpell(focusSpell)
    expect(result).toBeNull()
  })
})
