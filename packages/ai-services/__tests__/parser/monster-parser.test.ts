import { describe, it, expect } from 'vitest'
import { parseMonster } from '../../src/parser/monster-parser'

describe('parseMonster', () => {
  const foundryGoblin = {
    _id: 'gob-123',
    name: 'Goblin Warrior',
    type: 'npc',
    system: {
      details: { level: { value: -1 } },
      traits: { value: ['goblin', 'humanoid'], size: 'sm' },
      attributes: {
        hp: { value: 6, max: 6 },
        ac: { value: 16 },
        speed: { value: 25 },
      },
      saves: {
        fortitude: { value: 2 },
        reflex: { value: 7 },
        will: { value: 3 },
      },
      perception: { mod: 3 },
      abilities: {
        str: { mod: 0 },
        dex: { mod: 3 },
        con: { mod: 0 },
        int: { mod: -1 },
        wis: { mod: 1 },
        cha: { mod: -1 },
      },
      description: { value: '<p>A weak goblin</p>' },
      source: { value: 'Pathfinder Bestiary' },
    },
    items: [
      {
        name: 'Dogslicer',
        type: 'melee',
        system: {
          bonus: { value: 8 },
          damageRolls: { abc: { damage: '1d6+1', damageType: 'slashing' } },
          traits: { value: ['agile', 'backstabber', 'finesse'] },
        },
      },
    ],
  }

  it('parses a Foundry monster into our schema', () => {
    const result = parseMonster(foundryGoblin)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Goblin Warrior')
    expect(result!.level).toBe(-1)
    expect(result!.size).toBe('small')
    expect(result!.hp).toBe(6)
    expect(result!.ac).toBe(16)
  })

  it('parses strikes from items', () => {
    const result = parseMonster(foundryGoblin)
    expect(result!.strikes).toHaveLength(1)
    expect(result!.strikes[0].name).toBe('Dogslicer')
    expect(result!.strikes[0].attackBonus).toBe(8)
    expect(result!.strikes[0].traits).toContain('agile')
  })

  it('parses ability modifiers', () => {
    const result = parseMonster(foundryGoblin)
    expect(result!.abilities.dex).toBe(3)
    expect(result!.abilities.int).toBe(-1)
  })
})
