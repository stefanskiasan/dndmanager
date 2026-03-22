import { describe, it, expect } from 'vitest'
import { parseClass } from '../../src/parser/class-parser'

describe('parseClass', () => {
  const foundryFighter = {
    _id: 'fighter-123',
    name: 'Fighter',
    type: 'class',
    system: {
      hp: 10,
      keyAbility: { value: ['str', 'dex'] },
      trainedSkills: { additional: 3, value: ['acrobatics', 'athletics'] },
      attacks: { simple: { rank: 2 }, martial: { rank: 2 } },
      defenses: {
        unarmored: { rank: 1 },
        fortitude: { rank: 2 },
        reflex: { rank: 2 },
        will: { rank: 1 },
      },
      perception: { rank: 2 },
      description: { value: '<p>Fighting experts</p>' },
      source: { value: 'Pathfinder Core Rulebook' },
    },
  }

  it('parses a Foundry class into our schema', () => {
    const result = parseClass(foundryFighter)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Fighter')
    expect(result!.hp).toBe(10)
    expect(result!.keyAbility).toEqual(['str', 'dex'])
  })

  it('maps proficiency ranks correctly', () => {
    const result = parseClass(foundryFighter)
    expect(result!.attackProficiency).toBe('expert')
    expect(result!.perception).toBe('expert')
    expect(result!.fortitude).toBe('expert')
  })
})
