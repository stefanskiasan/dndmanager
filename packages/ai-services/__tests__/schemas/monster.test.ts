import { describe, it, expect } from 'vitest'
import { MonsterSchema } from '../../src/schemas/monster'

describe('MonsterSchema', () => {
  const validMonster = {
    id: 'goblin-warrior',
    name: 'Goblin Warrior',
    sourceId: 'foundry-goblin-warrior',
    level: -1,
    traits: ['goblin', 'humanoid'],
    size: 'small',
    hp: 6,
    ac: 16,
    fortitude: 2,
    reflex: 7,
    will: 3,
    perception: 3,
    speed: 25,
    abilities: { str: 0, dex: 3, con: 0, int: -1, wis: 1, cha: -1 },
    strikes: [
      {
        name: 'Dogslicer',
        attackBonus: 8,
        damage: '1d6+1',
        damageType: 'slashing',
        traits: ['agile', 'backstabber', 'finesse'],
      },
    ],
  }

  it('accepts valid monster data', () => {
    const result = MonsterSchema.safeParse(validMonster)
    expect(result.success).toBe(true)
  })

  it('accepts negative level for weak creatures', () => {
    const result = MonsterSchema.safeParse(validMonster)
    expect(result.success).toBe(true)
    expect(result.data?.level).toBe(-1)
  })

  it('rejects zero hp', () => {
    const result = MonsterSchema.safeParse({ ...validMonster, hp: 0 })
    expect(result.success).toBe(false)
  })
})
